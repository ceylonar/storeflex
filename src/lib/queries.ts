
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
import { startOfDay, endOfDay, subMonths, isWithinInterval, startOfWeek, endOfWeek, startOfYear, format, subDays, endOfYear } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { getSession, logoutUser } from './auth';


// Helper to get a mock user ID
// In a real app with authentication, this would come from the user's session
export async function getCurrentUserId() {
    const session = await getSession();
    return session?.userId || null;
}

export async function getCurrentUser(): Promise<UserProfile | null> {
    const session = await getSession();
    if (!session?.userId) {
      return null;
    }
    return fetchUserProfile(session.userId);
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
  stock: z.coerce.number().int().nonnegative('Stock must be a non-negative number').optional().default(0),
  cost_price: z.coerce.number().positive('Cost price must be positive'),
  selling_price: z.coerce.number().positive('Selling price must be positive'),
  image: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
  low_stock_threshold: z.coerce.number().int().nonnegative('Low stock threshold must be a non-negative number'),
});

const CustomerSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Customer name is required"),
    phone: z.string().optional(),
    credit_balance: z.coerce.number().default(0),
});

const SupplierSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Supplier name is required"),
    phone: z.string().optional(),
    credit_balance: z.coerce.number().default(0),
});


const SaleItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().positive(),
    total_amount: z.number().positive(),
    stock: z.number().int().nonnegative(),
    sub_category: z.string().optional(),
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
  paymentMethod: z.enum(['cash', 'credit', 'check']),
  amountPaid: z.coerce.number().nonnegative(),
  checkNumber: z.string().optional(),
  previousBalance: z.number().nonnegative(),
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
  paymentMethod: z.enum(['cash', 'credit', 'check']),
  amountPaid: z.coerce.number().nonnegative(),
  checkNumber: z.string().optional().default(''),
});

const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal('')),
});

const UserManagementSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'manager', 'sales']),
    password: z.string().optional(),
});


// --- PRODUCT QUERIES ---

// CREATE
export async function createProduct(formData: FormData): Promise<Product | null> {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Authentication required.");

  const parsedData = Object.fromEntries(formData.entries());
  if (!parsedData.stock) {
    parsedData.stock = '0';
  }

  const validatedFields = ProductSchema.omit({id: true}).safeParse(parsedData);

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
      id: newProductRef.id,
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
  if (!userId) throw new Error("Authentication required.");
  
  const parsedData = Object.fromEntries(formData.entries());
  if (!parsedData.stock) {
    parsedData.stock = '0';
  }

  const validatedFields = ProductSchema.omit({id: true}).safeParse(parsedData);

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
        timestamp: serverTimestamp(),
        id,
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
  if (!userId) throw new Error("Authentication required.");

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
        timestamp: serverTimestamp(),
        id,
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
    if (!userId) throw new Error("Authentication required.");

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
            credit_balance: 0,
        }

        transaction.set(newCustomerRef, newCustomerData);
        transaction.set(counterRef, { lastId: nextId }, { merge: true });

        return {
          id: formattedId,
          userId,
          name: validatedFields.data.name,
          phone: validatedFields.data.phone || '',
          credit_balance: 0,
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
        const snapshot = await getDocs(q);
        let customers = snapshot.docs.map(doc => {
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
    if (!userId) throw new Error("Authentication required.");

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
    if (!userId) throw new Error("Authentication required.");

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
  if (!userId) throw new Error("Authentication required.");

  const validatedFields = POSSaleSchema.safeParse(saleData);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid sale data.');
  }
  
  const { items, previousBalance, total_amount, amountPaid, ...saleDetails } = validatedFields.data;
  
  try {
    const saleId = await runTransaction(db, async (transaction) => {
        const itemIds = items.map(item => item.id);

        const productRefsAndData = await Promise.all(items.map(async (item) => {
            const productRef = doc(db, 'products', item.id);
            const productDoc = await transaction.get(productRef);
            return { ref: productRef, doc: productDoc };
        }));

        const counterRef = doc(db, 'counters', `sales_${userId}`);
        const counterDoc = await transaction.get(counterRef);

        let customerRef: any = null;
        if (saleDetails.customer_id) {
            customerRef = doc(db, 'customers', saleDetails.customer_id);
            const customerDoc = await transaction.get(customerRef);
            if (!customerDoc.exists()) throw new Error('Customer not found for balance update.');
        }
        
        for (const { doc: productDoc, ref: productRef } of productRefsAndData) {
            const item = items.find(i => i.id === productDoc.id)!;
            if (!productDoc.exists() || productDoc.data().userId !== userId) throw new Error(`Product "${item.name}" not found or access denied.`);
            
            const currentStock = productDoc.data().stock || 0;
            if (currentStock < item.quantity) throw new Error(`Not enough stock for ${item.name}. Only ${currentStock} available.`);
            
            transaction.update(productRef, { stock: increment(-item.quantity) });
        }
        
        const newTotalDue = previousBalance + total_amount;
        const newCreditBalance = newTotalDue - amountPaid;

        if (customerRef) {
            transaction.update(customerRef, { credit_balance: newCreditBalance > 0 ? newCreditBalance : 0 });
        }

        let paymentStatus: Sale['paymentStatus'] = 'paid';
        if (saleDetails.paymentMethod === 'credit' && newCreditBalance > 0.001) {
            paymentStatus = 'partial';
        } else if (saleDetails.paymentMethod === 'check') {
            paymentStatus = 'pending_check_clearance';
        }
        
        const nextId = counterDoc.exists() ? (counterDoc.data().lastId || 0) + 1 : 1;
        const formattedId = `sale${String(nextId).padStart(6, '0')}`;
        const newSaleRef = doc(db, 'sales', formattedId);
        const itemsToSave = items.map(({ stock, ...rest }) => rest);
        
        transaction.set(newSaleRef, {
            userId,
            items: itemsToSave,
            item_ids: itemIds,
            ...saleDetails,
            total_amount,
            amountPaid,
            previousBalance,
            creditAmount: newCreditBalance > 0 ? newCreditBalance : 0,
            paymentStatus,
            sale_date: serverTimestamp(),
        });

        transaction.set(counterRef, { lastId: nextId }, { merge: true });

        const newActivityRef = doc(collection(db, 'recent_activity'));
        transaction.set(newActivityRef, {
            type: 'sale',
            product_id: 'multiple',
            product_name: `${items.length} item(s)`,
            product_image: items[0]?.image || '',
            details: `Sale to ${saleDetails.customer_name} for LKR ${total_amount.toFixed(2)}`,
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
    revalidatePath('/dashboard/moneyflow');
    
    const finalCreditAmount = (previousBalance + total_amount) - amountPaid;
    let paymentStatus: Sale['paymentStatus'] = 'paid';
    if (validatedFields.data.paymentMethod === 'credit' && finalCreditAmount > 0.001) {
        paymentStatus = 'partial';
    } else if (validatedFields.data.paymentMethod === 'check') {
        paymentStatus = 'pending_check_clearance';
    }

    const returnedSale: Sale = {
        id: saleId,
        userId,
        items: items.map(({stock, ...rest}) => rest),
        item_ids: items.map(i => i.id),
        ...saleDetails,
        total_amount,
        amountPaid,
        previousBalance,
        creditAmount: finalCreditAmount > 0 ? finalCreditAmount : 0,
        paymentStatus,
        sale_date: new Date().toISOString(),
    }
    return returnedSale;
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
        cost_price: data.cost_price as number,
        stock: data.stock as number,
        image: data.image as string || '',
        category: data.category as string,
        brand: data.brand as string | undefined,
        sub_category: data.sub_category as string | undefined,
        barcode: data.barcode as string | undefined,
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
        const q = query(salesCollection, where('userId', '==', userId), where('customer_id', '==', customerId));
        const querySnapshot = await getDocs(q);
        const sales = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                sale_date: (data.sale_date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Sale
        });
        sales.sort((a,b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
        
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
    if (!userId) throw new Error("Authentication required.");

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
              credit_balance: 0,
          }
  
          transaction.set(newSupplierRef, newSupplierData);
          transaction.set(counterRef, { lastId: nextId }, { merge: true });

          return {
            id: formattedId,
            userId,
            name: validatedFields.data.name,
            phone: validatedFields.data.phone || '',
            credit_balance: 0,
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
        const snapshot = await getDocs(q);
        let suppliers = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: (data.created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Supplier
        });
        
        // Sort in code to avoid complex index
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
    if (!userId) throw new Error("Authentication required.");

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
    if (!userId) throw new Error("Authentication required.");

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
  if (!userId) throw new Error("Authentication required.");

  const validatedFields = POSPurchaseSchema.safeParse(purchaseData);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid purchase data.');
  }
  
  const { items, total_amount: currentBillTotal, amountPaid, ...purchaseDetails } = validatedFields.data;
  
  try {
    const purchaseId = await runTransaction(db, async (transaction) => {
      const itemIds = items.map(item => item.id);
      
      const productRefsAndData = await Promise.all(items.map(async (item) => {
          const productRef = doc(db, 'products', item.id);
          const productDoc = await transaction.get(productRef);
          return { ref: productRef, doc: productDoc, item: item };
      }));

      const counterRef = doc(db, 'counters', `purchases_${userId}`);
      const counterDoc = await transaction.get(counterRef);
      
      const supplierRef = doc(db, 'suppliers', purchaseDetails.supplier_id);
      const supplierDoc = await transaction.get(supplierRef);
      if (!supplierDoc.exists()) throw new Error('Supplier not found.');
      
      const previousBalance = supplierDoc.data().credit_balance || 0;

      for (const { ref: productRef, doc: productDoc, item } of productRefsAndData) {
        if (!productDoc.exists()) throw new Error(`Product ${item.name} not found.`);
        
        const product = productDoc.data() as Product;
        const currentStock = product.stock || 0;
        const currentCost = product.cost_price || 0;
        
        const currentTotalValue = currentStock * currentCost;
        const purchaseTotalValue = item.quantity * item.cost_price;
        const newTotalStock = currentStock + item.quantity;
        const newAverageCost = newTotalStock > 0 ? (currentTotalValue + purchaseTotalValue) / newTotalStock : item.cost_price;

        transaction.update(productRef, { 
          stock: increment(item.quantity), 
          cost_price: newAverageCost 
        });
      }
      
      const newBalance = (previousBalance + currentBillTotal) - amountPaid;
      transaction.update(supplierRef, { credit_balance: newBalance });
      
      const settlementAmount = amountPaid - currentBillTotal;
      if (settlementAmount > 0.001 && previousBalance > 0) {
          const settled = Math.min(settlementAmount, previousBalance);
          const settlementActivityRef = doc(collection(db, 'recent_activity'));
          transaction.set(settlementActivityRef, {
              type: 'credit_settled',
              details: `Settled LKR ${settled.toFixed(2)} with ${purchaseDetails.supplier_name}`,
              timestamp: serverTimestamp(),
              userId,
              id: `settle-${supplierRef.id}-${Date.now()}`
          });
      }

      let paymentStatus: Purchase['paymentStatus'] = 'paid';
      if (purchaseDetails.paymentMethod === 'credit' && newBalance > 0.001) { 
          paymentStatus = 'partial';
      } else if (purchaseDetails.paymentMethod === 'check') {
          paymentStatus = 'pending_check_clearance';
      }
      
      const nextId = counterDoc.exists() ? (counterDoc.data().lastId || 0) + 1 : 1;
      const formattedId = `pur${String(nextId).padStart(6, '0')}`;
      const newPurchaseRef = doc(db, 'purchases', formattedId);
      
      transaction.set(newPurchaseRef, {
        userId,
        items,
        item_ids: itemIds,
        ...purchaseDetails,
        total_amount: currentBillTotal,
        amountPaid,
        previousBalance: previousBalance,
        creditAmount: newBalance > 0 ? newBalance : 0,
        paymentStatus,
        purchase_date: serverTimestamp(),
      });

      transaction.set(counterRef, { lastId: nextId }, { merge: true });

      const newActivityRef = doc(collection(db, 'recent_activity'));
      transaction.set(newActivityRef, {
        type: 'purchase',
        product_id: 'multiple',
        product_name: `${items.length} item(s)`,
        product_image: items[0]?.image || '',
        details: `Purchase from ${purchaseDetails.supplier_name} for LKR ${currentBillTotal.toFixed(2)}`,
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
    revalidatePath('/dashboard/moneyflow');
    
    // For returning the object to the client
    const supplierDoc = await getDoc(doc(db, 'suppliers', purchaseDetails.supplier_id));
    const previousBalance = supplierDoc.data()?.credit_balance || 0; // Re-fetch to be sure, though it's already updated.
    const newBalance = (supplierDoc.data()?.credit_balance || 0);

    let paymentStatus: Purchase['paymentStatus'] = 'paid';
    if (validatedFields.data.paymentMethod === 'credit' && newBalance > 0.001) {
        paymentStatus = 'partial';
    } else if (validatedFields.data.paymentMethod === 'check') {
        paymentStatus = 'pending_check_clearance';
    }
    
    return {
        id: purchaseId,
        userId,
        items,
        item_ids: items.map(i => i.id),
        ...purchaseDetails,
        total_amount: currentBillTotal,
        amountPaid,
        previousBalance: previousBalance, // The balance before this transaction
        creditAmount: newBalance > 0 ? newBalance : 0,
        purchase_date: new Date().toISOString(),
        paymentStatus,
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
        const q = query(purchasesCollection, where('userId', '==', userId), where('supplier_id', '==', supplierId));
        const querySnapshot = await getDocs(q);
        const purchases = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                purchase_date: (data.purchase_date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Purchase
        });
        
        purchases.sort((a,b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
        
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

export async function fetchUserProfile(userId?: string): Promise<UserProfile | null> {
    noStore();
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) return null;

    const { db } = getFirebaseServices();
    const profileRef = doc(db, 'users', currentUserId);
    
    try {
        const profileDoc = await getDoc(profileRef);
        if (profileDoc.exists()) {
            return { id: profileDoc.id, ...profileDoc.data() } as UserProfile;
        }
        return null;
    } catch (error) {
        console.error("Failed to fetch user profile:", error);
        return null;
    }
}

export async function fetchAllUsers(): Promise<UserProfile[]> {
    noStore();
    const { db } = getFirebaseServices();
    const currentUser = await getCurrentUser();
    // This function should only be callable by an admin, but as an extra check
    if(currentUser?.role !== 'admin') return [];

    try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where('businessName', '==', currentUser.businessName)); // Only fetch users from the same company
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
    } catch (error) {
        console.error("Failed to fetch all users:", error);
        return [];
    }
}

export async function fetchUserByEmail(email: string): Promise<UserProfile | null> {
    noStore();
    const { db } = getFirebaseServices();
    try {
        const usersCollection = collection(db, 'users');
        const q = query(usersCollection, where('email', '==', email), limit(1));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {
            return null;
        }
        const userDoc = querySnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() } as UserProfile;
    } catch (error) {
        console.error("Failed to fetch user by email:", error);
        return null;
    }
}

export async function createInitialUser({email, password}: {email: string, password: string}): Promise<UserProfile | null> {
    noStore();
    const { db } = getFirebaseServices();

    try {
        const newUser: Omit<UserProfile, 'id'> = {
            email,
            password, // In a real app, this should be hashed
            name: "Admin User",
            businessName: "My Store",
            role: "admin"
        };
        
        const usersCollectionRef = collection(db, 'users');
        const newUserRef = doc(usersCollectionRef);

        await setDoc(newUserRef, newUser);
        
        console.log("Initial admin user created successfully.");

        return { id: newUserRef.id, ...newUser };

    } catch (error) {
        console.error("Failed to create initial user:", error);
        return null;
    }
}


export async function updateUserProfile(formData: FormData): Promise<{ success: boolean; message: string }> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, message: 'Authentication required.' };

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

export async function manageUser(formData: FormData): Promise<{ success: boolean, message: string }> {
    const { db } = getFirebaseServices();
    const adminUser = await getCurrentUser();
    if (adminUser?.role !== 'admin') {
        return { success: false, message: "Permission denied." };
    }

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = UserManagementSchema.safeParse(rawData);

    if (!validatedFields.success) {
        return { success: false, message: "Invalid user data." };
    }
    
    const { id, password, ...userData } = validatedFields.data;
    
    try {
        let finalId = id;
        if (!finalId) { // Creating new user, generate ID
             const counterRef = doc(db, 'counters', 'users');
             const counterDoc = await getDoc(counterRef);
             const nextId = counterDoc.exists() ? (counterDoc.data().lastId || 0) + 1 : 1;
             finalId = `user${String(nextId).padStart(4, '0')}`;
             await setDoc(counterRef, { lastId: nextId }, { merge: true });
        }

        const userRef = doc(db, 'users', finalId);

        const updateData: any = { 
            ...userData, 
            businessName: adminUser.businessName, // Ensure they are part of the same business
        };
        
        if (password) {
            updateData.password = password; // In a real app, hash this
        }
        
        await setDoc(userRef, updateData, { merge: true });
        
        revalidatePath('/dashboard/account');
        return { success: true, message: `User ${id ? 'updated' : 'created'} successfully.` };

    } catch (error) {
        return { success: false, message: "Failed to save user data." };
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
        const productsQuery = query(collection(db, 'products'), where('userId', '==', userId));
        const salesQuery = query(collection(db, 'sales'), where('userId', '==', userId));
        const activityQuery = query(collection(db, 'recent_activity'), where('userId', '==', userId));

        const [productsSnapshot, salesSnapshot, activitySnapshot] = await Promise.all([
            getDocs(productsQuery),
            getDocs(salesQuery),
            getDocs(activityQuery)
        ]);
        
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

        let totalSales = 0;
        let salesToday = 0;
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        
        const allSales = salesSnapshot.docs.map(doc => doc.data() as Sale);

        allSales.forEach(sale => {
            const saleDate = (sale.sale_date as unknown as Timestamp)?.toDate();
            if (saleDate) {
              totalSales += sale.total_amount || 0;
              if (isWithinInterval(saleDate, { start: todayStart, end: todayEnd })) {
                  salesToday += sale.total_amount || 0;
              }
            }
        });

        let recentActivities = activitySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: data.id || doc.id,
            ...data,
            timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
          }
        }) as RecentActivity[];

        recentActivities.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return {
            inventoryValue,
            productCount,
            salesToday,
            totalSales,
            recentActivities: recentActivities.slice(0, 5),
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
        const salesQuery = query(collection(db, 'sales'), where('userId', '==', userId));
        const salesSnapshot = await getDocs(salesQuery);
        const allSales = salesSnapshot.docs.map(doc => doc.data() as Sale);

        let aggregatedData: { [key: string]: number } = {};
        const now = new Date();

        if (filter === 'daily') {
            const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, i)).reverse();
            last7Days.forEach(date => aggregatedData[format(date, 'yyyy-MM-dd')] = 0);
            
            allSales.forEach(sale => {
                const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
                if (saleDate && isWithinInterval(saleDate, { start: last7Days[0], end: now })) {
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
            last4Weeks.forEach(date => aggregatedData[format(date, 'yyyy-ww')] = 0);
            
            allSales.forEach(sale => {
                const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
                if (saleDate && isWithinInterval(saleDate, { start: last4Weeks[0], end: now })) {
                    const weekKey = format(startOfWeek(saleDate), 'yyyy-ww');
                    aggregatedData[weekKey] = (aggregatedData[weekKey] || 0) + sale.total_amount;
                }
            });

             return last4Weeks.map(date => ({
                month: `W${format(date, 'w')}`,
                sales: aggregatedData[format(date, 'yyyy-ww')] || 0,
            }));

        } else if (filter === 'yearly') {
            const dateLabels = Array.from({ length: 12 }, (_, i) => format(new Date(now.getFullYear(), i), 'MMM'));
            dateLabels.forEach(label => aggregatedData[label] = 0);

            allSales.forEach(sale => {
                const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
                if (saleDate && isWithinInterval(saleDate, { start: startOfYear(now), end: endOfYear(now) })) {
                    const monthKey = format(saleDate, 'MMM');
                    aggregatedData[monthKey] = (aggregatedData[monthKey] || 0) + sale.total_amount;
                }
            });
             return dateLabels.map(label => ({ month: label, sales: aggregatedData[label] || 0 }));
        } else { // monthly (default)
            const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(now, i)).reverse();
            last6Months.forEach(date => aggregatedData[format(date, 'yyyy-MM')] = 0);
            
            allSales.forEach(sale => {
                const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
                if (saleDate && isWithinInterval(saleDate, { start: last6Months[0], end: now })) {
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
        const salesQuery = query(collection(db, 'sales'), where('userId', '==', userId));
        const salesSnapshot = await getDocs(salesQuery);

        const productSales: Record<string, { name: string, totalQuantity: number }> = {};

        salesSnapshot.docs.forEach(doc => {
            const sale = doc.data() as Sale;
            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
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

export async function fetchInventoryRecords(filters: InventoryRecordsFilter): Promise<DetailedRecord[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const q = query(collection(db, 'recent_activity'), where('userId', '==', userId));
        
        const activitySnapshot = await getDocs(q);
        let activities = activitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: data.id || doc.id,
                ...data,
                timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
            }
        }) as RecentActivity[];
        
        if (filters.date?.from) {
            const from = startOfDay(filters.date.from);
            const to = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            activities = activities.filter(act => isWithinInterval(new Date(act.timestamp), { start: from, end: to }));
        }

        if (filters.type) {
            activities = activities.filter(act => act.type === filters.type);
        }

        if (filters.productId) {
            activities = activities.filter(act => act.product_id === filters.productId || act.product_id === 'multiple');
        }
        
        activities.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Fetch full details for sale/purchase
        const detailedRecordsPromises = activities.map(async (rec): Promise<DetailedRecord | null> => {
            let detailedRec: DetailedRecord = { ...rec, items: [] };

            if (rec.type === 'sale') {
                const saleDoc = await getDoc(doc(db, 'sales', rec.id));
                if (saleDoc.exists()) {
                    const saleData = saleDoc.data();
                    detailedRec.details = saleData.customer_name;
                    detailedRec.items = saleData.items || [];
                }
            } else if (rec.type === 'purchase') {
                const purchaseDoc = await getDoc(doc(db, 'purchases', rec.id));
                if (purchaseDoc.exists()) {
                    const purchaseData = purchaseDoc.data();
                    detailedRec.details = purchaseData.supplier_name;
                    detailedRec.items = purchaseData.items || [];
                }
            }

            if (filters.productId && detailedRec.items) {
                 detailedRec.items = detailedRec.items.filter(item => item.id === filters.productId);
                 if(detailedRec.items.length === 0) return null;
            }

            return detailedRec;
        });

        const resolvedRecords = await Promise.all(detailedRecordsPromises);
        return resolvedRecords.filter((rec): rec is DetailedRecord => rec !== null);

    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch activities.');
    }
}


export async function fetchProductHistory(productId: string): Promise<ProductTransaction[]> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const salesCollection = collection(db, 'sales');
    const purchasesCollection = collection(db, 'purchases');

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

    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
}


// --- MONEYFLOW QUERIES ---

export type MoneyflowData = {
    receivablesTotal: number;
    payablesTotal: number;
    pendingChecksTotal: number;
    transactions: MoneyflowTransaction[];
}

export type MoneyflowTransaction = {
    id: string; // Can be a sale, purchase, customer, or supplier ID
    type: 'receivable' | 'payable';
    partyName: string; // Customer or Supplier Name
    partyId: string;
    paymentMethod: 'credit' | 'check';
    amount: number;
    date: string; // ISO String
    checkNumber?: string;
};

export async function fetchMoneyflowData(): Promise<MoneyflowData> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return { receivablesTotal: 0, payablesTotal: 0, pendingChecksTotal: 0, transactions: [] };

    const { db } = getFirebaseServices();
    try {
        const transactions: MoneyflowTransaction[] = [];
        let receivablesTotal = 0;
        let payablesTotal = 0;
        let pendingChecksTotal = 0;
        
        const customersQuery = query(collection(db, 'customers'), where('userId', '==', userId));
        const suppliersQuery = query(collection(db, 'suppliers'), where('userId', '==', userId));
        const salesQuery = query(collection(db, 'sales'), where('userId', '==', userId));
        const purchasesQuery = query(collection(db, 'purchases'), where('userId', '==', userId));

        const [customersSnapshot, suppliersSnapshot, salesSnapshot, purchasesSnapshot] = await Promise.all([
            getDocs(customersQuery), getDocs(suppliersQuery), getDocs(salesQuery), getDocs(purchasesQuery)
        ]);

        customersSnapshot.forEach(doc => {
            const balance = doc.data().credit_balance || 0;
            if (balance > 0) {
                receivablesTotal += balance;
                transactions.push({
                    id: `customer-${doc.id}`, type: 'receivable', partyName: doc.data().name, partyId: doc.id,
                    paymentMethod: 'credit', amount: balance,
                    date: (doc.data().updated_at || doc.data().created_at)?.toDate().toISOString() || new Date().toISOString(),
                });
            }
        });

        suppliersSnapshot.forEach(doc => {
            const balance = doc.data().credit_balance || 0;
            if (balance > 0) {
                payablesTotal += balance;
                transactions.push({
                    id: `supplier-${doc.id}`, type: 'payable', partyName: doc.data().name, partyId: doc.id,
                    paymentMethod: 'credit', amount: balance,
                    date: (doc.data().updated_at || doc.data().created_at)?.toDate().toISOString() || new Date().toISOString(),
                });
            } else if (balance < 0) {
                receivablesTotal += Math.abs(balance);
                transactions.push({
                    id: `supplier-receivable-${doc.id}`, type: 'receivable', partyName: doc.data().name, partyId: doc.id,
                    paymentMethod: 'credit', amount: Math.abs(balance),
                    date: (doc.data().updated_at || doc.data().created_at)?.toDate().toISOString() || new Date().toISOString(),
                });
            }
        });
        
        salesSnapshot.forEach(doc => {
            const sale = doc.data() as Sale;
            if (sale.paymentStatus === 'pending_check_clearance') {
                pendingChecksTotal += sale.total_amount;
                transactions.push({
                    id: doc.id, type: 'receivable', partyName: sale.customer_name, partyId: sale.customer_id!,
                    paymentMethod: 'check', amount: sale.total_amount, date: (sale.sale_date as any).toDate().toISOString(),
                    checkNumber: sale.checkNumber,
                });
            }
        });

        purchasesSnapshot.forEach(doc => {
            const purchase = doc.data() as Purchase;
            if (purchase.paymentStatus === 'pending_check_clearance') {
                pendingChecksTotal += purchase.total_amount;
                 transactions.push({
                    id: doc.id, type: 'payable', partyName: purchase.supplier_name, partyId: purchase.supplier_id,
                    paymentMethod: 'check', amount: purchase.total_amount, date: (purchase.purchase_date as any).toDate().toISOString(),
                    checkNumber: purchase.checkNumber,
                });
            }
        });

        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { receivablesTotal, payablesTotal, pendingChecksTotal, transactions };

    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch moneyflow data.');
    }
}


export async function settlePayment(transaction: MoneyflowTransaction, status: 'paid' | 'rejected' = 'paid', amount?: number): Promise<{success: boolean, message: string}> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, message: 'Authentication required.' };
    const settlementAmount = amount ?? transaction.amount;

    if (settlementAmount <= 0) return { success: false, message: 'Settlement amount must be positive.' };
    if (settlementAmount > transaction.amount + 0.001) return { success: false, message: 'Settlement amount cannot exceed outstanding balance.' };

    try {
        await runTransaction(db, async (t) => {
            const newActivityRef = doc(collection(db, 'recent_activity'));
            let partyRef;
            let activityType: RecentActivity['type'] = 'credit_settled';
            let details = '';

            if (transaction.paymentMethod === 'credit') {
              if(transaction.id.startsWith('customer-')) {
                  partyRef = doc(db, 'customers', transaction.partyId);
              } else {
                  partyRef = doc(db, 'suppliers', transaction.partyId);
              }

              if (status === 'paid') {
                  t.update(partyRef, { credit_balance: increment(-settlementAmount) });
              }

              details = `Credit payment of LKR ${settlementAmount.toFixed(2)} ${transaction.type === 'receivable' ? 'from' : 'to'} ${transaction.partyName} settled.`;
            } else { // Check
              if(transaction.type === 'receivable') {
                  const saleRef = doc(db, 'sales', transaction.id);
                  t.update(saleRef, { paymentStatus: status === 'paid' ? 'paid' : 'rejected' });
              } else {
                  const purchaseRef = doc(db, 'purchases', transaction.id);
                   t.update(purchaseRef, { paymentStatus: status === 'paid' ? 'paid' : 'rejected' });
              }
              activityType = status === 'paid' ? 'check_cleared' : 'check_rejected';
              details = `Check ${transaction.type === 'receivable' ? 'from' : 'to'} ${transaction.partyName} for LKR ${settlementAmount.toFixed(2)} was ${status === 'paid' ? 'cleared' : 'rejected'}.`;
            }
            
            t.set(newActivityRef, { 
              type: activityType, 
              details, 
              timestamp: serverTimestamp(), 
              userId,
              id: newActivityRef.id
            });
        });

        revalidatePath('/dashboard/moneyflow');
        revalidatePath('/dashboard/customers');
        revalidatePath('/dashboard/suppliers');
        revalidatePath('/dashboard');

        return { success: true, message: 'Payment settled successfully.' };
    } catch (error) {
        console.error('Settle Payment Error:', error);
        return { success: false, message: (error as Error).message || 'Failed to settle payment.' };
    }
}


export async function fetchFinancialActivities(): Promise<RecentActivity[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const financialTypes: RecentActivity['type'][] = ['sale', 'purchase', 'credit_settled', 'check_cleared', 'check_rejected'];
        
        const q = query(collection(db, 'recent_activity'), where('userId', '==', userId), where('type', 'in', financialTypes));
        
        const activitySnapshot = await getDocs(q);
        let allActivities = activitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
            }
        }) as RecentActivity[];

        allActivities.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return allActivities;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch financial activities.');
    }
}

export { logoutUser };
