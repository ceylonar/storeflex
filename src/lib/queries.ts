

'use server';

import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import { getFirebaseServices } from './firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  where,
  limit,
  getDoc,
  writeBatch,
  Timestamp,
  runTransaction,
  setDoc,
  increment,
} from 'firebase/firestore';
import type { Product, RecentActivity, SalesData, Store, Sale, ProductSelect, UserProfile, TopSellingProduct, SaleItem, Customer, Supplier, Purchase, PurchaseItem, ProductTransaction, DetailedRecord } from './types';
import { z } from 'zod';
import { startOfDay, endOfDay, subMonths, isWithinInterval, startOfWeek, endOfWeek, startOfYear, endOfYear, format, subDays } from 'date-fns';
import { DateRange } from 'react-day-picker';


// Helper to get a mock user ID
// In a real app with authentication, this would come from the user's session
const MOCK_USER_ID = 'user-123-abc';
async function getCurrentUserId() {
    return MOCK_USER_ID;
}


// Form validation schemas
const ProductSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  barcode: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  sub_category: z.string().optional(),
  brand: z.string().optional(),
  stock: z.coerce.number().int().nonnegative('Stock must be a non-negative number'),
  cost_price: z.coerce.number().positive('Cost price must be positive'),
  selling_price: z.coerce.number().positive('Selling price must be positive'),
  image: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
  low_stock_threshold: z.coerce.number().int().nonnegative('Low stock threshold must be a non-negative number'),
});

const CustomerSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Customer name is required"),
    phone: z.string().optional(),
});

const SupplierSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Supplier name is required"),
    phone: z.string().optional(),
});


const SaleItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().positive(),
    total_amount: z.number().positive(),
    stock: z.number().int().nonnegative(),
});

const POSSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1, 'At least one item is required in the sale.'),
  customer_id: z.string().nullable(),
  customer_name: z.string(),
  subtotal: z.number().nonnegative(),
  tax_amount: z.number().nonnegative(),
  tax_percentage: z.number().nonnegative(),
  discount_amount: z.number().nonnegative(),
  service_charge: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
});

const PurchaseItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    quantity: z.number().int().positive(),
    cost_price: z.number().positive(),
    total_cost: z.number().positive(),
});

const POSPurchaseSchema = z.object({
  items: z.array(PurchaseItemSchema).min(1, 'At least one item is required.'),
  supplier_id: z.string(),
  supplier_name: z.string(),
  subtotal: z.number().nonnegative(),
  tax_percentage: z.number().nonnegative(),
  tax_amount: z.number().nonnegative(),
  discount_amount: z.number().nonnegative(),
  service_charge: z.number().nonnegative(),
  total_amount: z.number().nonnegative(),
});

const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});


// --- PRODUCT QUERIES ---

// CREATE
export async function createProduct(formData: FormData): Promise<Product | null> {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();

  const validatedFields = ProductSchema.omit({id: true}).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid product data.');
  }
  
  const { name, image, ...productData } = validatedFields.data;

  try {
    const batch = writeBatch(db);
    
    const productsCollection = collection(db, 'products');
    const newProductRef = doc(productsCollection);
    
    const newProductData = {
      ...productData,
      name,
      image: image || '',
      userId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    }
    batch.set(newProductRef, newProductData);
    
    const activityCollection = collection(db, 'recent_activity');
    const newActivityRef = doc(activityCollection);
    batch.set(newActivityRef, {
      type: 'new',
      product_id: newProductRef.id,
      product_name: name,
      product_image: image || '',
      details: 'New product added to inventory',
      userId,
      timestamp: serverTimestamp(),
    });

    await batch.commit();

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');

    return {
        id: newProductRef.id,
        userId,
        ...validatedFields.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to create product.');
  }
}

// READ
export async function fetchProducts(): Promise<Product[]> {
  noStore();
  const userId = await getCurrentUserId();
  if (!userId) return []; // Return empty array if no user

  const { db } = getFirebaseServices();
  try {
    const productsCollection = collection(db, 'products');
    const q = query(productsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at?.toDate().toISOString(),
        updated_at: data.updated_at?.toDate().toISOString(),
      }
    }) as Product[];
    return products;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch products.');
  }
}

// UPDATE
export async function updateProduct(id: string, formData: FormData): Promise<Product | null> {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();

  const validatedFields = ProductSchema.omit({id: true}).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid product data.');
  }

  const { name, image, ...productData } = validatedFields.data;
  
  try {
    const batch = writeBatch(db);
    const productRef = doc(db, 'products', id);

    // Verify ownership before updating
    const productDoc = await getDoc(productRef);
    if (!productDoc.exists() || productDoc.data().userId !== userId) {
        throw new Error('Product not found or access denied.');
    }

    const updatedData = {
      ...productData,
      name,
      image: image || '',
      updated_at: serverTimestamp(),
    }
    batch.update(productRef, updatedData);
    
    const activityCollection = collection(db, 'recent_activity');
    const newActivityRef = doc(activityCollection);
    batch.set(newActivityRef, {
        type: 'update',
        product_id: id,
        product_name: name,
        product_image: image || '',
        details: 'Product details updated',
        userId,
        timestamp: serverTimestamp()
    });

    await batch.commit();

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');
    
    return {
        id,
        userId,
        ...validatedFields.data,
        created_at: productDoc.data().created_at.toDate().toISOString(),
        updated_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to update product.');
  }
}

// DELETE
export async function deleteProduct(id: string) {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();

  try {
    const batch = writeBatch(db);
    const productRef = doc(db, 'products', id);

    const productDoc = await getDoc(productRef);
    if (!productDoc.exists() || productDoc.data().userId !== userId) {
        throw new Error('Product not found or access denied.');
    }
    const { name, image } = productDoc.data();
    
    batch.delete(productRef);
    
    const activityCollection = collection(db, 'recent_activity');
    const newActivityRef = doc(activityCollection);
    batch.set(newActivityRef, {
        type: 'delete',
        product_id: id,
        product_name: name,
        product_image: image || '',
        details: 'Product removed from inventory',
        userId,
        timestamp: serverTimestamp()
    });

    await batch.commit();

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to delete product.');
  }
}

// --- CUSTOMER QUERIES ---

export async function createCustomer(formData: FormData): Promise<Customer | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

    const validatedFields = CustomerSchema.omit({ id: true }).safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        throw new Error("Invalid customer data.");
    }

    try {
      const newCustomer = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', `customers_${userId}`);
        let nextId = 1;
        const counterDoc = await transaction.get(counterRef);
        if (counterDoc.exists()) {
            nextId = (counterDoc.data().lastId || 0) + 1;
        }

        const formattedId = `cus${String(nextId).padStart(4, '0')}`;
        const newCustomerRef = doc(db, 'customers', formattedId);
        
        const newCustomerData = {
            ...validatedFields.data,
            userId,
            created_at: serverTimestamp(),
        }

        transaction.set(newCustomerRef, newCustomerData);
        transaction.set(counterRef, { lastId: nextId }, { merge: true });

        return {
          id: formattedId,
          userId,
          name: validatedFields.data.name,
          phone: validatedFields.data.phone || '',
          created_at: new Date().toISOString()
        } as Customer;
      });
      
      revalidatePath('/dashboard/customers');
      revalidatePath('/dashboard/sales');
      
      return newCustomer;
    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to create customer.");
    }
}

export async function fetchCustomers(): Promise<Customer[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const customersCollection = collection(db, 'customers');
        const q = query(customersCollection, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const customers = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: (data.created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Customer
        });
        
        customers.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return customers;
    } catch(error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch customers.');
    }
}

export async function updateCustomer(id: string, formData: FormData): Promise<Customer | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

    const validatedFields = CustomerSchema.omit({ id: true }).safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        throw new Error("Invalid customer data.");
    }

    try {
        const customerRef = doc(db, 'customers', id);
        const docSnap = await getDoc(customerRef);
        if (!docSnap.exists() || docSnap.data().userId !== userId) {
            throw new Error("Customer not found or access denied.");
        }
        
        const updatedData = {
            ...validatedFields.data,
            updated_at: serverTimestamp(),
        }
        await updateDoc(customerRef, updatedData);

        revalidatePath('/dashboard/customers');
        revalidatePath('/dashboard/sales');

        const updatedDoc = await getDoc(customerRef);
        const data = updatedDoc.data();
        return {
            id: updatedDoc.id,
            ...data,
            created_at: (data.created_at as Timestamp)?.toDate().toISOString(),
            updated_at: (data.updated_at as Timestamp)?.toDate().toISOString(),
        } as Customer;

    } catch (error) {
        throw new Error("Failed to update customer.");
    }
}

export async function deleteCustomer(id: string) {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

    try {
        const customerRef = doc(db, 'customers', id);
        const docSnap = await getDoc(customerRef);
        if (!docSnap.exists() || docSnap.data().userId !== userId) {
            throw new Error("Customer not found or access denied.");
        }
        await deleteDoc(customerRef);
        revalidatePath('/dashboard/customers');
        revalidatePath('/dashboard/sales');
    } catch (error) {
        throw new Error("Failed to delete customer.");
    }
}


// --- SALES QUERIES ---

export async function createSale(saleData: z.infer<typeof POSSaleSchema>): Promise<Sale | null> {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();

  const validatedFields = POSSaleSchema.safeParse(saleData);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid sale data.');
  }
  
  const { items, ...saleDetails } = validatedFields.data;
  
  try {
    const saleId = await runTransaction(db, async (transaction) => {
        const productRefsAndData = [];
        const itemIds = items.map(item => item.id); // For indexing

        // Phase 1: Read all product documents first.
        for (const item of items) {
            const productRef = doc(db, 'products', item.id);
            const productDoc = await transaction.get(productRef);
            
            if (!productDoc.exists() || productDoc.data().userId !== userId) {
                throw new Error(`Product "${item.name}" not found or access denied.`);
            }
            
            const currentStock = productDoc.data().stock || 0;
            const newStock = currentStock - item.quantity;

            if (newStock < 0) {
                throw new Error(`Not enough stock for ${item.name}. Only ${currentStock} available.`);
            }
            productRefsAndData.push({ ref: productRef, newStock: newStock });
        }

        // Phase 2: Get new Sale ID
        const counterRef = doc(db, 'counters', `sales_${userId}`);
        let nextId = 1;
        const counterDoc = await transaction.get(counterRef);
        if (counterDoc.exists()) {
            nextId = (counterDoc.data().lastId || 0) + 1;
        }
        const formattedId = `sale${String(nextId).padStart(6, '0')}`;


        // Phase 3: Perform all writes.
        // 3a. Update stock for all items
        for (const prod of productRefsAndData) {
            transaction.update(prod.ref, { stock: prod.newStock });
        }

      // 3b. Create a single sale document
      const newSaleRef = doc(db, 'sales', formattedId);
      const itemsToSave = items.map(({ stock, ...rest }) => rest); // Don't save client-side stock
      transaction.set(newSaleRef, {
        userId,
        items: itemsToSave,
        item_ids: itemIds,
        ...saleDetails,
        sale_date: serverTimestamp(),
      });

      // 3c. Update sale counter
      transaction.set(counterRef, { lastId: nextId }, { merge: true });

      // 3d. Create a single activity log for the entire transaction
      const activityCollection = collection(db, 'recent_activity');
      const newActivityRef = doc(activityCollection);
      transaction.set(newActivityRef, {
        type: 'sale',
        product_id: 'multiple',
        product_name: `${items.length} item(s)`,
        product_image: items[0]?.image || '',
        details: `Sale to ${saleDetails.customer_name} for LKR ${saleDetails.total_amount.toFixed(2)}`,
        timestamp: serverTimestamp(),
        userId,
        id: newSaleRef.id,
      });
      return formattedId;
    });

    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/customers');

    // Return the newly created sale object for receipt printing
    const itemsToReturn = items.map(({stock, ...rest}) => rest);
    return {
        id: saleId,
        userId,
        items: itemsToReturn,
        item_ids: items.map(i => i.id),
        ...saleDetails,
        sale_date: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error((error as Error).message || 'Failed to record sale.');
  }
}

export async function fetchProductsForSelect(): Promise<ProductSelect[]> {
  noStore();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { db } = getFirebaseServices();
  try {
    const productsCollection = collection(db, 'products');
    const q = query(productsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name as string,
        selling_price: data.selling_price as number,
        stock: data.stock as number,
        image: data.image as string || '',
      }
    });
    return products.sort((a,b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch products for select.');
  }
}

export async function fetchSalesByCustomer(customerId: string): Promise<Sale[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const salesCollection = collection(db, 'sales');
        const q = query(
            salesCollection, 
            where('userId', '==', userId), 
            where('customer_id', '==', customerId),
            orderBy('sale_date', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const sales = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                sale_date: (data.sale_date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Sale
        });
        
        return sales;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch sales history.');
    }
}


// --- SUPPLIER & PURCHASE QUERIES ---

export async function createSupplier(formData: FormData): Promise<Supplier | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

    const validatedFields = SupplierSchema.omit({ id: true }).safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        throw new Error("Invalid supplier data.");
    }
    
    try {
        const newSupplier = await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, 'counters', `suppliers_${userId}`);
          let nextId = 1;
          const counterDoc = await transaction.get(counterRef);
          if (counterDoc.exists()) {
            nextId = (counterDoc.data().lastId || 0) + 1;
          }
  
          const formattedId = `sup${String(nextId).padStart(4, '0')}`;
          const newSupplierRef = doc(db, 'suppliers', formattedId);
          
          const newSupplierData = {
              ...validatedFields.data,
              userId,
              created_at: serverTimestamp(),
          }
  
          transaction.set(newSupplierRef, newSupplierData);
          transaction.set(counterRef, { lastId: nextId }, { merge: true });

          return {
            id: formattedId,
            userId,
            name: validatedFields.data.name,
            phone: validatedFields.data.phone || '',
            created_at: new Date().toISOString()
          } as Supplier;
        });
  
        revalidatePath('/dashboard/suppliers');
        revalidatePath('/dashboard/buy');
        
        return newSupplier;

    } catch (error) {
        console.error("Database Error:", error);
        throw new Error("Failed to create supplier.");
    }
}

export async function fetchSuppliers(): Promise<Supplier[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const suppliersCollection = collection(db, 'suppliers');
        const q = query(suppliersCollection, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        const suppliers = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: (data.created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Supplier
        });
        
        suppliers.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
        return suppliers;

    } catch(error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch suppliers.');
    }
}

export async function updateSupplier(id: string, formData: FormData): Promise<Supplier | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

    const validatedFields = SupplierSchema.omit({ id: true }).safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        throw new Error("Invalid supplier data.");
    }

    try {
        const supplierRef = doc(db, 'suppliers', id);
        const docSnap = await getDoc(supplierRef);
        if (!docSnap.exists() || docSnap.data().userId !== userId) {
            throw new Error("Supplier not found or access denied.");
        }
        
        const updatedData = {
            ...validatedFields.data,
            updated_at: serverTimestamp(),
        }

        await updateDoc(supplierRef, updatedData);

        revalidatePath('/dashboard/suppliers');
        revalidatePath('/dashboard/buy');

        const updatedDoc = await getDoc(supplierRef);
        const data = updatedDoc.data();

        return {
            id: updatedDoc.id,
            ...data,
            created_at: (data.created_at as Timestamp)?.toDate().toISOString(),
            updated_at: (data.updated_at as Timestamp)?.toDate().toISOString(),
        } as Supplier;

    } catch (error) {
        throw new Error("Failed to update supplier.");
    }
}

export async function deleteSupplier(id: string) {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

    try {
        const supplierRef = doc(db, 'suppliers', id);
        const docSnap = await getDoc(supplierRef);
        if (!docSnap.exists() || docSnap.data().userId !== userId) {
            throw new Error("Supplier not found or access denied.");
        }
        await deleteDoc(supplierRef);
        revalidatePath('/dashboard/suppliers');
        revalidatePath('/dashboard/buy');
    } catch (error) {
        throw new Error("Failed to delete supplier.");
    }
}

export async function createPurchase(purchaseData: z.infer<typeof POSPurchaseSchema>): Promise<Purchase | null> {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();

  const validatedFields = POSPurchaseSchema.safeParse(purchaseData);

  if (!validatedFields.success) {
    throw new Error('Invalid purchase data.');
  }
  
  const { items, ...purchaseDetails } = validatedFields.data;
  
  try {
    const purchaseId = await runTransaction(db, async (transaction) => {
      const itemIds = items.map(item => item.id);
      const productRefs: { [key: string]: any } = {};
      const productDocs: { [key: string]: any } = {};

      // --- 1. READ PHASE ---
      // 1a. Read all product documents
      for (const item of items) {
        productRefs[item.id] = doc(db, 'products', item.id);
        productDocs[item.id] = await transaction.get(productRefs[item.id]);
      }
      
      // 1b. Read purchase counter
      const counterRef = doc(db, 'counters', `purchases_${userId}`);
      const counterDoc = await transaction.get(counterRef);
      
      // --- 2. VALIDATION & CALCULATION PHASE ---
      const productUpdateData: { [key: string]: any } = {};
      
      for (const item of items) {
        const productDoc = productDocs[item.id];
        if (!productDoc.exists()) {
          throw new Error(`Product ${item.name} not found.`);
        }
        
        const product = productDoc.data() as Product;
        const currentStock = product.stock || 0;
        const currentCost = product.cost_price || 0;
        
        const currentTotalValue = currentStock * currentCost;
        const purchaseTotalValue = item.quantity * item.cost_price;
        const newTotalStock = currentStock + item.quantity;
        const newAverageCost = (currentTotalValue + purchaseTotalValue) / newTotalStock;

        productUpdateData[item.id] = {
          stock: increment(item.quantity),
          cost_price: newAverageCost,
        };
      }
      
      let nextId = 1;
      if (counterDoc.exists()) {
        nextId = (counterDoc.data().lastId || 0) + 1;
      }
      const formattedId = `pur${String(nextId).padStart(6, '0')}`;

      // --- 3. WRITE PHASE ---
      // 3a. Update all product documents
      for (const item of items) {
        transaction.update(productRefs[item.id], productUpdateData[item.id]);
      }
      
      // 3b. Create new purchase record
      const newPurchaseRef = doc(db, 'purchases', formattedId);
      transaction.set(newPurchaseRef, {
        userId,
        items,
        item_ids: itemIds,
        ...purchaseDetails,
        purchase_date: serverTimestamp(),
      });

      // 3c. Update purchase counter
      transaction.set(counterRef, { lastId: nextId }, { merge: true });

      // 3d. Create a single activity log for the purchase
      const newActivityRef = doc(collection(db, 'recent_activity'));
      transaction.set(newActivityRef, {
        type: 'purchase',
        product_id: 'multiple',
        product_name: `${items.length} item(s)`,
        product_image: items[0]?.image || '',
        details: `Purchase from ${purchaseDetails.supplier_name} for LKR ${purchaseDetails.total_amount.toFixed(2)}`,
        timestamp: serverTimestamp(),
        userId,
        id: newPurchaseRef.id,
      });

      return formattedId;
    });

    revalidatePath('/dashboard/buy');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/suppliers');
    
    return {
        id: purchaseId,
        userId,
        items,
        item_ids: items.map(i => i.id),
        ...purchaseDetails,
        purchase_date: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error((error as Error).message || 'Failed to record purchase.');
  }
}

export async function fetchPurchasesBySupplier(supplierId: string): Promise<Purchase[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const purchasesCollection = collection(db, 'purchases');
        const q = query(
            purchasesCollection, 
            where('userId', '==', userId), 
            where('supplier_id', '==', supplierId)
        );
        const querySnapshot = await getDocs(q);
        const purchases = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                purchase_date: (data.purchase_date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Purchase
        });
        
        purchases.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());

        return purchases;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch purchase history.');
    }
}


// --- DASHBOARD & OTHER QUERIES ---

export async function fetchStores() {
    noStore();
    // Bypassing Firestore query to avoid index errors.
    const defaultStore = { id: 'store-1', name: 'My Store' };
    return [defaultStore];
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return null;

    const { db } = getFirebaseServices();
    const profileRef = doc(db, 'users', userId);
    
    try {
        const profileDoc = await getDoc(profileRef);
        if (profileDoc.exists()) {
            return { id: profileDoc.id, ...profileDoc.data() } as UserProfile;
        } else {
            // If no profile exists, create a default one
            const defaultProfile: UserProfile = {
                id: userId,
                email: 'user@example.com',
                name: 'Demo User',
                businessName: "Demo Store",
                address: "123 Demo Street, Colombo",
                contactNumber: "011-123-4567",
                logoUrl: '',
            };
            await setDoc(profileRef, defaultProfile);
            return defaultProfile;
        }
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
        return null;
    }
}

export async function updateUserProfile(formData: FormData): Promise<{ success: boolean; message: string }> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

    const validatedFields = ProfileSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!validatedFields.success) {
        const errorMessages = Object.entries(validatedFields.error.flatten().fieldErrors)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('; ');
        return { success: false, message: `Invalid data: ${errorMessages}` };
    }

    try {
        const profileRef = doc(db, 'users', userId);
        await setDoc(profileRef, validatedFields.data, { merge: true });

        revalidatePath('/dashboard/account');
        revalidatePath('/dashboard/sales'); // For receipt
        revalidatePath('/dashboard'); // For header

        return { success: true, message: 'Profile updated successfully.' };

    } catch (error) {
        return { success: false, message: 'Failed to update profile.' };
    }
}

export async function fetchDashboardData() {
    noStore();
    const userId = await getCurrentUserId();
    const defaultData = {
        inventoryValue: 0,
        productCount: 0,
        salesToday: 0,
        totalSales: 0,
        recentActivities: [],
        lowStockProducts: [],
    };
    if (!userId) return defaultData;

    const { db } = getFirebaseServices();
    try {
        const productsCollection = collection(db, 'products');
        const salesCollection = collection(db, 'sales');
        const activityCollection = collection(db, 'recent_activity');

        // Products
        const productQuery = query(productsCollection, where('userId', '==', userId));
        const productsSnapshot = await getDocs(productQuery);
        let inventoryValue = 0;
        const allProducts: Product[] = [];

        productsSnapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() } as Omit<Product, 'created_at' | 'updated_at'> & { created_at: Timestamp, updated_at: Timestamp };
            inventoryValue += (product.stock || 0) * (product.cost_price || 0);
            allProducts.push({
                ...product,
                created_at: product.created_at.toDate().toISOString(),
                updated_at: product.updated_at.toDate().toISOString(),
            });
        });
        const productCount = productsSnapshot.size;
        const lowStockProducts = allProducts
            .filter(p => p.stock < p.low_stock_threshold)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 5);

        // Sales
        const allSalesQuery = query(salesCollection, where('userId', '==', userId));
        const allSalesSnapshot = await getDocs(allSalesQuery);
        let totalSales = 0;
        let salesToday = 0;
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());

        allSalesSnapshot.forEach(doc => {
            const sale = doc.data();
            const saleDate = (sale.sale_date as Timestamp).toDate();
            totalSales += sale.total_amount || 0;
            if (isWithinInterval(saleDate, { start: todayStart, end: todayEnd })) {
                salesToday += sale.total_amount || 0;
            }
        });

        // Recent Activities
        const activityQuery = query(activityCollection, where('userId', '==', userId));
        const activitySnapshot = await getDocs(activityQuery);
        let recentActivities = activitySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
          }
        }) as RecentActivity[];

        // Sort in memory and take the last 5
        recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        recentActivities = recentActivities.slice(0, 5);

        return {
            inventoryValue,
            productCount,
            salesToday,
            totalSales,
            recentActivities,
            lowStockProducts,
        };
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch dashboard data.');
    }
}

export async function fetchSalesData(filter: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'): Promise<SalesData[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const salesCollection = collection(db, 'sales');
        const salesQuery = query(salesCollection, where('userId', '==', userId));
        const salesSnapshot = await getDocs(salesQuery);
        const allSales = salesSnapshot.docs.map(doc => doc.data() as Sale);

        let aggregatedData: { [key: string]: number } = {};
        let dateLabels: string[] = [];

        const now = new Date();

        if (filter === 'daily') {
            const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, i)).reverse();
            dateLabels = last7Days.map(date => format(date, 'EEE'));
            aggregatedData = Object.fromEntries(last7Days.map(date => [format(date, 'yyyy-MM-dd'), 0]));
            
            allSales.forEach(sale => {
                const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
                if (isWithinInterval(saleDate, { start: last7Days[0], end: now })) {
                    const dayKey = format(saleDate, 'yyyy-MM-dd');
                    aggregatedData[dayKey] = (aggregatedData[dayKey] || 0) + sale.total_amount;
                }
            });

            return last7Days.map(date => ({
                month: format(date, 'EEE'),
                sales: aggregatedData[format(date, 'yyyy-MM-dd')] || 0,
            }));

        } else if (filter === 'weekly') {
            const last4Weeks = Array.from({ length: 4 }, (_, i) => startOfWeek(subDays(now, i * 7))).reverse();
            dateLabels = last4Weeks.map(date => `W${format(date, 'w')}`);
            aggregatedData = Object.fromEntries(last4Weeks.map(date => [format(date, 'yyyy-ww'), 0]));
            
            allSales.forEach(sale => {
                const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
                if (isWithinInterval(saleDate, { start: last4Weeks[0], end: now })) {
                    const weekKey = format(startOfWeek(saleDate), 'yyyy-ww');
                    aggregatedData[weekKey] = (aggregatedData[weekKey] || 0) + sale.total_amount;
                }
            });

             return last4Weeks.map(date => ({
                month: `W${format(date, 'w')}`,
                sales: aggregatedData[format(date, 'yyyy-ww')] || 0,
            }));

        } else if (filter === 'yearly') {
            const currentYearStart = startOfYear(now);
            dateLabels = Array.from({ length: 12 }, (_, i) => format(new Date(now.getFullYear(), i), 'MMM'));
            aggregatedData = Object.fromEntries(dateLabels.map(label => [label, 0]));

            allSales.forEach(sale => {
                const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
                if (isWithinInterval(saleDate, { start: currentYearStart, end: endOfYear(now) })) {
                    const monthKey = format(saleDate, 'MMM');
                    aggregatedData[monthKey] = (aggregatedData[monthKey] || 0) + sale.total_amount;
                }
            });
             return dateLabels.map(label => ({ month: label, sales: aggregatedData[label] || 0 }));
        } else { // monthly (default)
            const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(now, i)).reverse();
            dateLabels = last6Months.map(date => format(date, 'MMM'));
            aggregatedData = Object.fromEntries(last6Months.map(date => [format(date, 'yyyy-MM'), 0]));
            
            allSales.forEach(sale => {
                const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
                if (isWithinInterval(saleDate, { start: last6Months[0], end: now })) {
                    const monthKey = format(saleDate, 'yyyy-MM');
                    aggregatedData[monthKey] = (aggregatedData[monthKey] || 0) + sale.total_amount;
                }
            });
            
            return last6Months.map(date => ({
                month: format(date, 'MMM'),
                sales: aggregatedData[format(date, 'yyyy-MM')] || 0,
            }));
        }

    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch sales data.');
    }
}


export async function fetchTopSellingProducts(): Promise<TopSellingProduct[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const salesCollection = collection(db, 'sales');
        const salesQuery = query(salesCollection, where('userId', '==', userId));
        const salesSnapshot = await getDocs(salesQuery);

        const productSales: Record<string, { name: string, totalQuantity: number }> = {};

        salesSnapshot.docs.forEach(doc => {
            const sale = doc.data() as Sale;
            // Add a guard clause to ensure sale.items exists and is an array
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    // Ensure quantity is a valid number
                    const quantity = typeof item.quantity === 'number' ? item.quantity : 0;
                    if (productSales[item.id]) {
                        productSales[item.id].totalQuantity += quantity;
                    } else {
                        productSales[item.id] = { name: item.name, totalQuantity: quantity };
                    }
                });
            }
        });

        const sortedProducts = Object.values(productSales)
            .sort((a, b) => b.totalQuantity - a.totalQuantity);
            
        return sortedProducts.slice(0, 5);

    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch top selling products.');
    }
}

interface InventoryRecordsFilter {
    date?: DateRange;
    type?: string;
    productId?: string;
}

export async function fetchInventoryRecords(filters: InventoryRecordsFilter): Promise<RecentActivity[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const activityCollection = collection(db, 'recent_activity');
        const q = query(activityCollection, where('userId', '==', userId));
        
        const activitySnapshot = await getDocs(q);
        let activities = activitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: data.id || doc.id,
                ...data,
                timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
            }
        }) as RecentActivity[];
        
        // In-memory filtering
        if (filters.date?.from) {
            const from = startOfDay(filters.date.from);
            const to = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            activities = activities.filter(act => 
                isWithinInterval(new Date(act.timestamp), { start: from, end: to })
            );
        }

        if (filters.type) {
            activities = activities.filter(act => act.type === filters.type);
        }

        if (filters.productId) {
            // For sales/purchases, the product_id is 'multiple'. We need to fetch the transaction and check items.
            // This is complex for a simple filter, so for now we'll only filter direct product activities.
            activities = activities.filter(act => {
                if (act.product_id === 'multiple') {
                    // This is a simplification. A real implementation would fetch the sale/purchase
                    // and check if the productId is in its items list, which is slow.
                    // For now, we return true to include all multi-item transactions.
                    return true;
                }
                return act.product_id === filters.productId
            });
        }

        // Sort in-memory to avoid composite index requirement
        activities.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return activities;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch activities.');
    }
}


export async function fetchProductHistory(productId: string): Promise<ProductTransaction[]> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

    const salesCollection = collection(db, 'sales');
    const purchasesCollection = collection(db, 'purchases');

    // Queries to find transactions containing the product
    const salesQuery = query(salesCollection, where('userId', '==', userId), where('item_ids', 'array-contains', productId));
    const purchasesQuery = query(purchasesCollection, where('userId', '==', userId), where('item_ids', 'array-contains', productId));
    
    const [salesSnapshot, purchasesSnapshot] = await Promise.all([
        getDocs(salesQuery),
        getDocs(purchasesQuery)
    ]);
    
    const transactions: ProductTransaction[] = [];

    salesSnapshot.forEach(doc => {
        const sale = doc.data();
        const item = sale.items.find((i: any) => i.id === productId);
        if (item) {
            transactions.push({
                type: 'sale',
                date: (sale.sale_date as Timestamp).toDate().toISOString(),
                quantity: item.quantity,
                price: item.price_per_unit,
                source_or_destination: `Sale to ${sale.customer_name}`,
            });
        }
    });

    purchasesSnapshot.forEach(doc => {
        const purchase = doc.data();
        const item = purchase.items.find((i: any) => i.id === productId);
        if (item) {
            transactions.push({
                type: 'purchase',
                date: (purchase.purchase_date as Timestamp).toDate().toISOString(),
                quantity: item.quantity,
                price: item.cost_price,
                source_or_destination: `Purchase from ${purchase.supplier_name}`,
            });
        }
    });

    // Sort all transactions by date
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
}

