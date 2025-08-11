

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
  Query,
  collectionGroup,
  or,
} from 'firebase/firestore';
import type { Product, RecentActivity, SalesData, Store, Sale, ProductSelect, UserProfile, TopSellingProduct, SaleItem, Customer, Supplier, Purchase, PurchaseItem, ProductTransaction, DetailedRecord, SaleReturn, PurchaseReturn, SaleReturnItem, PurchaseReturnItem, Expense, ExpenseData, SalesOrder, PurchaseOrder } from './types';
import { z } from 'zod';
import { startOfDay, endOfDay, subMonths, isWithinInterval, startOfWeek, endOfWeek, startOfYear, format, subDays, endOfYear, startOfMonth, endOfMonth } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { getUser } from './auth';


// This is now a placeholder, authentication is handled by the auth library
export async function getCurrentUserId() {
    const user = await getUser();
    return user?.id ?? null;
}

// Form validation schemas
const ProductSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['product', 'service']),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  sub_category: z.string().optional(),
  brand: z.string().optional(),
  stock: z.coerce.number().int().nonnegative('Stock must be a non-negative number').optional().default(0),
  cost_price: z.coerce.number().optional().default(0),
  selling_price: z.coerce.number().positive('Selling price must be positive'),
  image: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
  low_stock_threshold: z.coerce.number().int().nonnegative('Low stock threshold must be a non-negative number').optional().default(0),
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

const PurchaseItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    quantity: z.number().int().positive(),
    cost_price: z.number().nonnegative(),
    total_cost: z.number().nonnegative(),
    sku: z.string().optional(),
});


const SaleItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    type: z.enum(['product', 'service']),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().positive(),
    cost_price: z.number().nonnegative(),
    total_amount: z.number().positive(),
    stock: z.number().int().nonnegative().optional(),
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
  previousBalance: z.number(),
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

const OrderItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    type: z.enum(['product', 'service']),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().nonnegative(),
    cost_price: z.number().nonnegative(),
    total_amount: z.number().nonnegative(),
    sku: z.string().optional(),
});

const SalesOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  customer_id: z.string().nullable(),
  customer_name: z.string(),
  subtotal: z.number(),
  total_amount: z.number(),
  dueDate: z.string().optional(),
});

const PurchaseOrderSchema = z.object({
  items: z.array(OrderItemSchema).min(1),
  supplier_id: z.string(),
  supplier_name: z.string(),
  subtotal: z.number(),
  total_amount: z.number(),
  dueDate: z.string().optional(),
});


// --- PRODUCT QUERIES ---

// CREATE
export async function createProduct(formData: FormData): Promise<Product | null> {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User ID not found.");

  const parsedData = Object.fromEntries(formData.entries());
  if (!parsedData.stock) parsedData.stock = '0';
  if (!parsedData.cost_price) parsedData.cost_price = '0';
  if (!parsedData.low_stock_threshold) parsedData.low_stock_threshold = '0';


  const validatedFields = ProductSchema.omit({id: true}).safeParse(parsedData);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid product data.');
  }
  
  const { name, image, ...productData } = validatedFields.data;

  try {
    const newProduct = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', `products_${userId}`);
        const counterDoc = await transaction.get(counterRef);
        let nextId = counterDoc.exists() ? (counterDoc.data().lastId || 0) + 1 : 1;
        const formattedId = `prod${String(nextId).padStart(4, '0')}`;
        
        const newProductRef = doc(db, 'products', formattedId);
        
        const newProductData = {
          ...productData,
          sku: productData.sku || formattedId, // Use ID as SKU if not provided
          name,
          image: image || '',
          userId,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        }
        transaction.set(newProductRef, newProductData);
        transaction.set(counterRef, { lastId: nextId }, { merge: true });

        const activityCollection = collection(db, 'recent_activity');
        const newActivityRef = doc(activityCollection);
        transaction.set(newActivityRef, {
          type: 'new',
          product_id: newProductRef.id,
          product_name: name,
          product_image: image || '',
          details: `New ${productData.type} added to inventory`,
          userId,
          timestamp: serverTimestamp(),
          id: newActivityRef.id,
        });

        return {
            id: newProductRef.id,
            userId,
            ...validatedFields.data,
            sku: newProductData.sku,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as Product;
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');

    return newProduct;
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
        created_at: (data.created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        updated_at: (data.updated_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
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
  if (!userId) throw new Error("User ID not found.");
  
  const parsedData = Object.fromEntries(formData.entries());
  if (!parsedData.stock) parsedData.stock = '0';
  if (!parsedData.cost_price) parsedData.cost_price = '0';
  if (!parsedData.low_stock_threshold) parsedData.low_stock_threshold = '0';

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
      sku: productData.sku || id,
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
        details: `${productData.type} details updated`,
        userId,
        timestamp: serverTimestamp(),
        id: newActivityRef.id,
    });

    await batch.commit();

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');
    
    return {
        id,
        userId,
        ...validatedFields.data,
        sku: updatedData.sku,
        created_at: (productDoc.data().created_at as Timestamp)?.toDate().toISOString(),
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
  if (!userId) throw new Error("User ID not found.");

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
        details: 'Item removed from inventory',
        userId,
        timestamp: serverTimestamp(),
        id: newActivityRef.id,
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
    if (!userId) throw new Error("User ID not found.");

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
            updated_at: serverTimestamp(),
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Customer;
      });
      
      revalidatePath('/dashboard/customers');
      revalidatePath('/dashboard/sales');
      revalidatePath('/dashboard/reports');
      
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
        const q = query(customersCollection, where('userId', '==', userId), orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);
        let customers = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: (data.created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                updated_at: (data.updated_at as Timestamp)?.toDate().toISOString(),
            } as Customer
        });
        
        return customers;
    } catch(error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch customers.');
    }
}

export async function updateCustomer(id: string, formData: FormData): Promise<Customer | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User ID not found.");

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
            created_at: (data?.created_at as Timestamp)?.toDate().toISOString(),
            updated_at: (data?.updated_at as Timestamp)?.toDate().toISOString(),
        } as Customer;

    } catch (error) {
        throw new Error("Failed to update customer.");
    }
}

export async function deleteCustomer(id: string) {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User ID not found.");

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
  if (!userId) throw new Error("User ID not found.");

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
            
            if (item.type === 'product') {
                const currentStock = productDoc.data().stock || 0;
                if (currentStock < item.quantity) throw new Error(`Not enough stock for ${item.name}. Only ${currentStock} available.`);
                transaction.update(productRef, { stock: increment(-item.quantity) });
            }
        }
        
        const totalDue = total_amount - previousBalance;
        const newCreditBalance = totalDue - amountPaid;

        if (customerRef) {
            transaction.update(customerRef, { credit_balance: increment(newCreditBalance) });
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
        const saleProfit = items.reduce((profit, item) => profit + ((item.price_per_unit - item.cost_price) * item.quantity), 0);
        transaction.set(newActivityRef, {
            type: 'sale',
            product_id: 'multiple',
            product_name: `${items.length} item(s)`,
            product_image: items[0]?.image || '',
            details: `Sale to ${saleDetails.customer_name} for LKR ${total_amount.toFixed(2)}. Profit: LKR ${saleProfit.toFixed(2)}`,
            timestamp: serverTimestamp(),
            userId,
            id: newSaleRef.id,
            customer_id: saleDetails.customer_id,
        });

        return formattedId;
    });

    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/customers');
    revalidatePath('/dashboard/moneyflow');
    
    const finalCreditAmount = (total_amount - previousBalance) - amountPaid;
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
        type: data.type as 'product' | 'service',
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
        
        const q = customerId === 'walk-in'
            ? query(salesCollection, where('userId', '==', userId), where('customer_id', '==', null), orderBy('sale_date', 'desc'))
            : query(salesCollection, where('userId', '==', userId), where('customer_id', '==', customerId), orderBy('sale_date', 'desc'));

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

export async function fetchSaleById(saleId: string): Promise<Sale | null> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const { db } = getFirebaseServices();
    try {
        const saleRef = doc(db, 'sales', saleId);
        const saleDoc = await getDoc(saleRef);

        if (!saleDoc.exists() || saleDoc.data().userId !== userId) {
            return null;
        }

        const data = saleDoc.data();
        return {
            id: saleDoc.id,
            ...data,
            sale_date: (data.sale_date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Sale;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch sale details.');
    }
}


// --- SUPPLIER & PURCHASE QUERIES ---

export async function createSupplier(formData: FormData): Promise<Supplier | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User ID not found.");

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
              updated_at: serverTimestamp(),
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Supplier;
        });
  
        revalidatePath('/dashboard/suppliers');
        revalidatePath('/dashboard/buy');
        revalidatePath('/dashboard/reports');
        
        return newSupplier;

    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to create supplier.');
    }
}

export async function fetchSuppliers(): Promise<Supplier[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const suppliersCollection = collection(db, 'suppliers');
        const q = query(suppliersCollection, where('userId', '==', userId), orderBy('created_at', 'desc'));
        const snapshot = await getDocs(q);
        let suppliers = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: (data.created_at as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                updated_at: (data.updated_at as Timestamp)?.toDate().toISOString(),
            } as Supplier
        });
        
        return suppliers;

    } catch(error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch suppliers.');
    }
}

export async function updateSupplier(id: string, formData: FormData): Promise<Supplier | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User ID not found.");

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
            created_at: (data?.created_at as Timestamp)?.toDate().toISOString(),
            updated_at: (data?.updated_at as Timestamp)?.toDate().toISOString(),
        } as Supplier;

    } catch (error) {
        throw new Error("Failed to update supplier.");
    }
}

export async function deleteSupplier(id: string) {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User ID not found.");

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
  if (!userId) throw new Error("User ID not found.");

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
              id: settlementActivityRef.id,
              supplier_id: purchaseDetails.supplier_id,
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
        supplier_id: purchaseDetails.supplier_id,
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
    const previousBalance = supplierDoc.data()?.credit_balance || 0; // This will be the balance *before* the transaction
    const newBalance = (previousBalance + currentBillTotal) - amountPaid;

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
        const q = query(purchasesCollection, where('userId', '==', userId), where('supplier_id', '==', supplierId), orderBy('purchase_date', 'desc'));
        const querySnapshot = await getDocs(q);
        const purchases = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                purchase_date: (data.purchase_date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            } as Purchase
        });
        
        return purchases;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch purchase history.');
    }
}

export async function fetchPurchaseById(purchaseId: string): Promise<Purchase | null> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const { db } = getFirebaseServices();
    try {
        const purchaseRef = doc(db, 'purchases', purchaseId);
        const purchaseDoc = await getDoc(purchaseRef);

        if (!purchaseDoc.exists() || purchaseDoc.data().userId !== userId) {
            return null;
        }

        const data = purchaseDoc.data();
        return {
            id: purchaseDoc.id,
            ...data,
            purchase_date: (data.purchase_date as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Purchase;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch purchase details.');
    }
}


// --- DASHBOARD & OTHER QUERIES ---

export async function fetchStores() {
    noStore();
    // Bypassing Firestore query to avoid index errors.
    const defaultStore = { id: 'store-1', name: 'My Store' };
    return [defaultStore];
}

export async function fetchDashboardData() {
    noStore();
    const userId = await getCurrentUserId();
    const defaultData = {
        inventoryValue: 0,
        productCount: 0,
        serviceCount: 0,
        salesToday: 0,
        profitToday: 0,
        profitThisMonth: 0,
        profitThisYear: 0,
        totalSales: 0,
        totalExpenses: 0,
        totalReceivables: 0,
        totalPayables: 0,
        recentActivities: [],
        lowStockProducts: [],
        pendingSalesOrders: [],
        pendingPurchaseOrders: [],
    };
    if (!userId) return defaultData;

    try {
        const { db } = getFirebaseServices();
        
        const productsQuery = query(collection(db, 'products'), where('userId', '==', userId));
        const salesQuery = query(collection(db, 'sales'), where('userId', '==', userId));
        const customersQuery = query(collection(db, 'customers'), where('userId', '==', userId));
        const suppliersQuery = query(collection(db, 'suppliers'), where('userId', '==', userId));
        const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', userId));

        const [productsSnapshot, salesSnapshot, customersSnapshot, suppliersSnapshot, expensesSnapshot] = await Promise.all([
            getDocs(productsQuery),
            getDocs(salesQuery),
            getDocs(customersQuery),
            getDocs(suppliersQuery),
            getDocs(expensesQuery),
        ]);
        
        let inventoryValue = 0;
        let productCount = 0;
        let serviceCount = 0;
        const allProducts: Product[] = [];

        productsSnapshot.forEach(doc => {
            const product = { id: doc.id, ...doc.data() } as Omit<Product, 'created_at' | 'updated_at'> & { created_at: Timestamp, updated_at: Timestamp };
            if (product.type === 'product') {
                inventoryValue += (product.stock || 0) * (product.cost_price || 0);
                productCount++;
            } else {
                serviceCount++;
            }
            allProducts.push({
                ...product,
                created_at: product.created_at?.toDate().toISOString() || new Date().toISOString(),
                updated_at: product.updated_at?.toDate().toISOString() || new Date().toISOString(),
            });
        });

        const lowStockProducts = allProducts
            .filter(p => p.type === 'product' && p.stock < p.low_stock_threshold)
            .sort((a, b) => a.stock - b.stock)
            .slice(0, 5);

        const now = new Date();
        const todayStart = startOfDay(now);
        const todayEnd = endOfDay(now);
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const yearStart = startOfYear(now);
        const yearEnd = endOfYear(now);

        let salesToday = 0;
        let cogsToday = 0;
        let salesThisMonth = 0;
        let cogsThisMonth = 0;
        let salesThisYear = 0;
        let cogsThisYear = 0;
        let totalSales = 0;

        salesSnapshot.forEach(doc => {
            const sale = doc.data() as Sale;
            const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
            const saleTotal = sale.total_amount || 0;
            const saleCogs = sale.items.reduce((acc, item) => acc + ((item.cost_price || 0) * item.quantity), 0);
            totalSales += saleTotal;

            if (isWithinInterval(saleDate, { start: todayStart, end: todayEnd })) {
                salesToday += saleTotal;
                cogsToday += saleCogs;
            }
            if (isWithinInterval(saleDate, { start: monthStart, end: monthEnd })) {
                salesThisMonth += saleTotal;
                cogsThisMonth += saleCogs;
            }
             if (isWithinInterval(saleDate, { start: yearStart, end: yearEnd })) {
                salesThisYear += saleTotal;
                cogsThisYear += saleCogs;
            }
        });

        let expensesToday = 0;
        let expensesThisMonth = 0;
        let expensesThisYear = 0;
        let totalExpenses = 0;

        expensesSnapshot.forEach(doc => {
            const expense = doc.data() as Expense;
            const expenseDate = (expense.date as unknown as Timestamp).toDate();
            const expenseAmount = expense.amount;
            totalExpenses += expenseAmount;
            
            if (isWithinInterval(expenseDate, {start: todayStart, end: todayEnd})) {
                expensesToday += expenseAmount;
            }
            if (isWithinInterval(expenseDate, {start: monthStart, end: monthEnd})) {
                expensesThisMonth += expenseAmount;
            }
             if (isWithinInterval(expenseDate, {start: yearStart, end: yearEnd})) {
                expensesThisYear += expenseAmount;
            }
        });

        const profitToday = salesToday - cogsToday - expensesToday;
        const profitThisMonth = salesThisMonth - cogsThisMonth - expensesThisMonth;
        const profitThisYear = salesThisYear - cogsThisYear - expensesThisYear;
        
        const totalReceivables = customersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().credit_balance || 0), 0);
        const totalPayables = suppliersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().credit_balance || 0), 0);
        
        const allPendingOrders = await fetchPendingOrders();
        const pendingSalesOrders = allPendingOrders.filter(o => o.type === 'sale') as (SalesOrder & { type: 'sale' })[];
        const pendingPurchaseOrders = allPendingOrders.filter(o => o.type === 'purchase') as (PurchaseOrder & { type: 'purchase' })[];
        
        return {
            inventoryValue,
            productCount,
            serviceCount,
            salesToday,
            totalSales,
            totalExpenses,
            profitToday,
            profitThisMonth,
            profitThisYear,
            totalReceivables,
            totalPayables,
            recentActivities: [], // Removed for stability
            lowStockProducts,
            pendingSalesOrders: pendingSalesOrders.slice(0, 3),
            pendingPurchaseOrders: pendingPurchaseOrders.slice(0, 3),
        };
    } catch (error) {
        console.error('CRITICAL: Failed to fetch dashboard data.', error);
        // Return default data on error to prevent crashing the entire dashboard page.
        return defaultData;
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

interface FinancialActivitiesFilter {
    date?: DateRange;
    type?: string;
    productId?: string;
    partyId?: string;
    limit?: number;
}


export async function fetchProductHistory(productId: string): Promise<ProductTransaction[]> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const salesCollection = collection(db, 'sales');
    const purchasesCollection = collection(db, 'purchases');
    const activityCollection = collection(db, 'recent_activity');

    const salesQuery = query(salesCollection, where('userId', '==', userId), where('item_ids', 'array-contains', productId));
    const purchasesQuery = query(purchasesCollection, where('userId', '==', userId), where('item_ids', 'array-contains', productId));
    const lossQuery = query(activityCollection, where('userId', '==', userId), where('product_id', '==', productId), where('type', '==', 'loss'));
    
    const [salesSnapshot, purchasesSnapshot, lossSnapshot] = await Promise.all([
        getDocs(salesQuery),
        getDocs(purchasesQuery),
        getDocs(lossQuery)
    ]);
    
    const transactions: ProductTransaction[] = [];

    salesSnapshot.forEach(doc => {
        const sale = doc.data() as Sale;
        const item = sale.items.find((i: any) => i.id === productId);
        if (item) {
            transactions.push({
                type: 'sale',
                date: (sale.sale_date as any as Timestamp).toDate().toISOString(),
                quantity: item.quantity,
                price: item.price_per_unit,
                source_or_destination: `Sale to ${sale.customer_name}`,
            });
        }
    });

    purchasesSnapshot.forEach(doc => {
        const purchase = doc.data() as Purchase;
        const item = purchase.items.find((i: any) => i.id === productId);
        if (item) {
            transactions.push({
                type: 'purchase',
                date: (purchase.purchase_date as any as Timestamp).toDate().toISOString(),
                quantity: item.quantity,
                price: item.cost_price,
                source_or_destination: `Purchase from ${purchase.supplier_name}`,
            });
        }
    });
    
    lossSnapshot.forEach(doc => {
        const activity = doc.data() as RecentActivity;
        const expense = activity.transaction as Expense | undefined; // Assuming expense data is stored in transaction
        if (expense) {
             transactions.push({
                type: 'loss',
                date: (activity.timestamp as any as Timestamp).toDate().toISOString(),
                quantity: expense.quantity || 0,
                price: (expense.amount / (expense.quantity || 1)), // Calculate unit cost from total loss
                source_or_destination: activity.details,
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
    id: string; // A unique identifier for the list key
    transactionId: string; // The readable ID (e.g., cus0001, sale00001)
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
            const data = doc.data();
            const balance = data.credit_balance || 0;
            const date = (data.updated_at || data.created_at)?.toDate().toISOString() || new Date().toISOString();

            if (balance > 0) {
                receivablesTotal += balance;
                transactions.push({
                    id: `customer-receivable-${doc.id}`, transactionId: doc.id, type: 'receivable', partyName: data.name, partyId: doc.id,
                    paymentMethod: 'credit', amount: balance,
                    date,
                });
            }
        });

        suppliersSnapshot.forEach(doc => {
            const data = doc.data();
            const balance = data.credit_balance || 0;
            const date = (data.updated_at || data.created_at)?.toDate().toISOString() || new Date().toISOString();

            if (balance > 0) { // We owe supplier (payable)
                payablesTotal += balance;
                transactions.push({
                    id: `supplier-payable-${doc.id}`, transactionId: doc.id, type: 'payable', partyName: data.name, partyId: doc.id,
                    paymentMethod: 'credit', amount: balance,
                    date,
                });
            }
        });
        
        salesSnapshot.forEach(doc => {
            const sale = doc.data() as Sale;
            const saleDate = (sale.sale_date as any)?.toDate();
            if (sale.paymentStatus === 'pending_check_clearance' && saleDate) {
                pendingChecksTotal += sale.total_amount;
                transactions.push({
                    id: `sale-check-${doc.id}`, transactionId: doc.id, type: 'receivable', partyName: sale.customer_name, partyId: sale.customer_id!,
                    paymentMethod: 'check', amount: sale.total_amount, date: saleDate.toISOString(),
                    checkNumber: sale.checkNumber,
                });
            }
        });

        purchasesSnapshot.forEach(doc => {
            const purchase = doc.data() as Purchase;
            const purchaseDate = (purchase.purchase_date as any)?.toDate();
            if (purchase.paymentStatus === 'pending_check_clearance' && purchaseDate) {
                pendingChecksTotal += purchase.total_amount;
                 transactions.push({
                    id: `purchase-check-${doc.id}`, transactionId: doc.id, type: 'payable', partyName: purchase.supplier_name, partyId: purchase.supplier_id,
                    paymentMethod: 'check', amount: purchase.total_amount, date: purchaseDate.toISOString(),
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


export async function settlePayment(transaction: MoneyflowTransaction, status: 'paid' | 'rejected' = 'paid', amount?: number): Promise<{success: boolean; message: string;}> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, message: 'User not authenticated.' };
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
              let partyType = '';
              if(transaction.id.startsWith('customer-')) {
                  partyType = 'customers';
              } else {
                  partyType = 'suppliers';
              }
              partyRef = doc(db, partyType, transaction.partyId);
              
              const incrementValue = transaction.type === 'receivable' ? -settlementAmount : -settlementAmount;
              t.update(partyRef, { credit_balance: increment(incrementValue) });

              details = `Credit payment of LKR ${settlementAmount.toFixed(2)} ${transaction.type === 'receivable' ? 'from' : 'to'} ${transaction.partyName} settled.`;
            } else { // Check
              if(transaction.type === 'receivable') {
                  const saleRef = doc(db, 'sales', transaction.transactionId);
                  t.update(saleRef, { paymentStatus: status === 'paid' ? 'paid' : 'rejected' });
              } else {
                  const purchaseRef = doc(db, 'purchases', transaction.transactionId);
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

export async function fetchFinancialActivities(filters: FinancialActivitiesFilter = {}): Promise<RecentActivity[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        let q: Query = query(collection(db, 'recent_activity'), where('userId', '==', userId), orderBy('timestamp', 'desc'));

        if (filters.limit) {
            q = query(q, limit(filters.limit));
        }

        const activitySnapshot = await getDocs(q);

        let allActivities = activitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
                partyName: data.customer_name || data.supplier_name || 'N/A'
            } as RecentActivity;
        });
        
        const financialTypes: RecentActivity['type'][] = ['sale', 'purchase', 'credit_settled', 'check_cleared', 'check_rejected', 'sale_return', 'purchase_return', 'loss'];

        // Post-fetch filtering
        let filteredActivities = allActivities.filter(a => financialTypes.includes(a.type));

        if (filters.type) {
            filteredActivities = filteredActivities.filter(a => a.type === filters.type);
        }
        
        if (filters.productId) {
            filteredActivities = filteredActivities.filter(a => a.item_ids?.includes(filters.productId!));
        }

        if (filters.partyId) {
            const [partyType, id] = filters.partyId.split('_');
            const partyKey = partyType === 'customer' ? 'customer_id' : 'supplier_id';
            filteredActivities = filteredActivities.filter(a => (a as any)[partyKey] === id);
        }

        if (filters.date?.from) {
            const from = startOfDay(filters.date.from);
            const to = filters.date.to ? endOfDay(filters.date.to) : endOfDay(filters.date.from);
            filteredActivities = filteredActivities.filter(a => isWithinInterval(new Date(a.timestamp), { start: from, end: to }));
        }

        return filteredActivities;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch financial activities.');
    }
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  noStore();
  const userId = await getCurrentUserId();
  if (!userId) return null;
  
  const { db } = getFirebaseServices();
  const profileRef = doc(db, 'user_profiles', userId);
  const profileDoc = await getDoc(profileRef);

  if (profileDoc.exists()) {
    const data = profileDoc.data();
    return {
        id: userId,
        businessName: data.businessName || "StoreFlex Lite",
        logoUrl: data.logoUrl || "",
        address: data.address || "123 Demo Street, Colombo",
        contactNumber: data.contactNumber || "011-123-4567"
    } as UserProfile;
  }
  
  // Return a default profile if one doesn't exist
  return {
    id: userId,
    businessName: "StoreFlex Lite",
    logoUrl: "",
    address: "123 Demo Street, Colombo",
    contactNumber: "011-123-4567"
  } as UserProfile;
}

const UserProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export async function updateUserProfile(data: z.infer<typeof UserProfileSchema>): Promise<{success: boolean; message: string;}> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) return { success: false, message: 'User not authenticated.'};

    const validatedData = UserProfileSchema.safeParse(data);
    if (!validatedData.success) {
        return { success: false, message: 'Invalid data provided.' };
    }

    try {
        const profileRef = doc(db, 'user_profiles', userId);
        await setDoc(profileRef, validatedData.data, { merge: true });
        revalidatePath('/dashboard/account');
        revalidatePath('/dashboard/sales');
        revalidatePath('/dashboard/buy');
        return { success: true, message: 'Profile updated successfully.' };
    } catch(error) {
        console.error("Update Profile Error:", error);
        return { success: false, message: 'Failed to update profile.' };
    }
}

export async function updateUserCredentials(userId: string, password: string):Promise<void> {
    const { app, db } = getFirebaseServices();
    const currentUser = await getUser();
    if (!currentUser || currentUser.id !== userId) throw new Error("Unauthorized");

    if(!password || password.length < 6) throw new Error("Password must be at least 6 characters.");

    const { getAuth, updatePassword } = await import('firebase/auth');
    const auth = getAuth(app);
    const user = auth.currentUser;

    if (user) {
        try {
            await updatePassword(user, password);
        } catch (error: any) {
            console.error("Firebase Auth password update error:", error.code);
            throw new Error("Failed to update password. Please re-authenticate and try again.");
        }
    } else {
        throw new Error("No authenticated user found to update password.");
    }
}


export async function fetchAllUsers(): Promise<UserProfile[]> {
    noStore();
    const currentUser = await getUser();
    if (!currentUser) return [];

    return [{
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        businessName: '',
    }]
}

// --- RETURN QUERIES ---

export async function createSaleReturn(returnData: SaleReturn): Promise<void> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    await runTransaction(db, async (transaction) => {
        // 1. Update stock for each returned item
        for (const item of returnData.items) {
             if (item.type === 'product') {
                const productRef = doc(db, 'products', item.id);
                transaction.update(productRef, { stock: increment(item.return_quantity) });
            }
        }

        // 2. Update customer credit balance.
        if (returnData.customer_id && returnData.refund_method === 'credit_balance') {
            const customerRef = doc(db, 'customers', returnData.customer_id);
            transaction.update(customerRef, { credit_balance: increment(-returnData.total_refund_amount) });
        }
        
        // 3. Create a new sale return document with a readable ID
        const counterRef = doc(db, 'counters', `sale_returns_${userId}`);
        const counterDoc = await transaction.get(counterRef);
        const nextId = counterDoc.exists() ? (counterDoc.data().lastId || 0) + 1 : 1;
        const formattedId = `ret${String(nextId).padStart(6, '0')}`;
        const returnRef = doc(db, 'sales_returns', formattedId);

        transaction.set(returnRef, {
            ...returnData,
            id: formattedId,
            userId,
            return_date: serverTimestamp(),
            item_ids: returnData.items.map(i => i.id),
        });
        transaction.set(counterRef, { lastId: nextId }, { merge: true });
        
        // 4. Create an activity log
        const activityRef = doc(collection(db, 'recent_activity'));
        transaction.set(activityRef, {
            type: 'sale_return',
            details: `Return from ${returnData.customer_name} for LKR ${returnData.total_refund_amount.toFixed(2)} credited`,
            timestamp: serverTimestamp(),
            userId,
            id: formattedId,
            item_ids: returnData.items.map(i => i.id),
            customer_id: returnData.customer_id,
            product_id: 'multiple'
        });
    });

    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/customers');
    revalidatePath('/dashboard/moneyflow');
}

export async function createPurchaseReturn(returnData: PurchaseReturn): Promise<void> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    await runTransaction(db, async (transaction) => {
        // 1. Update stock for each returned item
        for (const item of returnData.items) {
            const productRef = doc(db, 'products', item.id);
            const productDoc = await transaction.get(productRef);
            if (productDoc.exists() && productDoc.data().stock >= item.return_quantity) {
                transaction.update(productRef, { stock: increment(-item.return_quantity) });
            } else {
                throw new Error(`Not enough stock to return for ${item.name}.`);
            }
        }

        // 2. Update supplier credit balance (reduce what we owe them)
        const supplierRef = doc(db, 'suppliers', returnData.supplier_id);
        transaction.update(supplierRef, { credit_balance: increment(-returnData.total_credit_amount) });

        // 3. Create a new purchase return document with a readable ID
        const counterRef = doc(db, 'counters', `purchase_returns_${userId}`);
        const counterDoc = await transaction.get(counterRef);
        const nextId = counterDoc.exists() ? (counterDoc.data().lastId || 0) + 1 : 1;
        const formattedId = `pret${String(nextId).padStart(6, '0')}`;
        const returnRef = doc(db, 'purchase_returns', formattedId);

        transaction.set(returnRef, {
            ...returnData,
            id: formattedId,
            userId,
            return_date: serverTimestamp(),
            item_ids: returnData.items.map(i => i.id),
        });
        transaction.set(counterRef, { lastId: nextId }, { merge: true });

        // 4. Create an activity log
        const activityRef = doc(collection(db, 'recent_activity'));
        transaction.set(activityRef, {
            type: 'purchase_return',
            details: `Return to ${returnData.supplier_name} for LKR ${returnData.total_credit_amount.toFixed(2)} credited`,
            timestamp: serverTimestamp(),
            userId,
            id: formattedId,
            item_ids: returnData.items.map(i => i.id),
            supplier_id: returnData.supplier_id,
            product_id: 'multiple'
        });
    });
    
    revalidatePath('/dashboard/buy');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/suppliers');
    revalidatePath('/dashboard/moneyflow');
}

// --- EXPENSE QUERIES ---

const ExpenseSchema = z.object({
  type: z.string().min(1, 'Expense type is required'),
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  productId: z.string().optional(),
  quantity: z.coerce.number().int().positive().optional(),
});

export async function createExpense(formData: FormData): Promise<Expense> {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("User not authenticated");

  const validatedFields = ExpenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validatedFields.success) {
    console.error(validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid expense data.');
  }

  const { date, productId, quantity, ...expenseData } = validatedFields.data;

  if (expenseData.type === 'Lost / Damaged Product') {
    if (!productId || !quantity) {
      throw new Error("Product and quantity are required for lost/damaged expenses.");
    }
    await runTransaction(db, async (transaction) => {
        const productRef = doc(db, 'products', productId);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists()) {
            throw new Error("Product to be written off not found.");
        }
        const product = productDoc.data();
        if (product.stock < quantity) {
            throw new Error(`Cannot write off ${quantity} items. Only ${product.stock} in stock.`);
        }
        
        // 1. Decrement stock
        transaction.update(productRef, { stock: increment(-quantity) });

        // 2. Create expense record
        const expenseRef = doc(collection(db, 'expenses'));
        const expenseWithUser = {
            ...expenseData,
            date: Timestamp.fromDate(new Date(date)),
            userId,
            productId,
            quantity,
        };
        transaction.set(expenseRef, expenseWithUser);

        // 3. Create activity log
        const activityRef = doc(collection(db, 'recent_activity'));
        transaction.set(activityRef, {
            type: 'loss',
            product_id: productId,
            product_name: product.name,
            product_image: product.image || '',
            details: `Wrote off ${quantity} unit(s) as lost/damaged.`,
            timestamp: serverTimestamp(),
            userId,
            id: activityRef.id,
            transaction: expenseWithUser, // Embed the expense data for history
        });
    });
  } else {
    // Standard expense creation
    await addDoc(collection(db, 'expenses'), {
      ...expenseData,
      date: Timestamp.fromDate(new Date(date)),
      userId,
    });
  }
  
  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard/inventory'); // Revalidate if stock changes
  revalidatePath('/dashboard');
  
  return {
    ...validatedFields.data,
    id: 'temp-id', // This won't be correct for the transaction case but the page reloads anyway
    userId,
  };
}


export async function fetchExpenses(): Promise<Expense[]> {
  noStore();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { db } = getFirebaseServices();
  const expensesCollection = collection(db, 'expenses');
  const q = query(expensesCollection, where('userId', '==', userId), orderBy('date', 'desc'));
  
  try {
    const snapshot = await getDocs(q);
    const expenses = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: (data.date as Timestamp).toDate().toISOString(),
      } as Expense;
    });
    return expenses;
  } catch (e) {
      console.error("Firebase query failed for expenses.", e)
      throw new Error("Failed to fetch expenses.");
  }
}

export async function fetchExpenseChartData(filter: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'): Promise<ExpenseData[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', userId));
    const expensesSnapshot = await getDocs(expensesQuery);
    const allExpenses = expensesSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
            ...data,
            date: (data.date as Timestamp).toDate()
        }
    }) as (Omit<Expense, 'date'> & { date: Date })[];

    let aggregatedData: { [key: string]: number } = {};
    const now = new Date();

    if (filter === 'daily') {
        const last7Days = Array.from({ length: 7 }, (_, i) => subDays(now, i)).reverse();
        last7Days.forEach(date => aggregatedData[format(date, 'yyyy-MM-dd')] = 0);
        
        allExpenses.forEach(expense => {
            const expenseDate = expense.date;
            if (isWithinInterval(expenseDate, { start: last7Days[0], end: now })) {
                const dayKey = format(expenseDate, 'yyyy-MM-dd');
                aggregatedData[dayKey] = (aggregatedData[dayKey] || 0) + expense.amount;
            }
        });

        return last7Days.map(date => ({
            label: format(date, 'EEE'),
            amount: aggregatedData[format(date, 'yyyy-MM-dd')] || 0,
        }));

    } else if (filter === 'weekly') {
        const last4Weeks = Array.from({ length: 4 }, (_, i) => startOfWeek(subDays(now, i * 7))).reverse();
        last4Weeks.forEach(date => aggregatedData[format(date, 'yyyy-ww')] = 0);
        
        allExpenses.forEach(expense => {
            const expenseDate = expense.date;
            if (isWithinInterval(expenseDate, { start: last4Weeks[0], end: now })) {
                const weekKey = format(startOfWeek(expenseDate), 'yyyy-ww');
                aggregatedData[weekKey] = (aggregatedData[weekKey] || 0) + expense.amount;
            }
        });

         return last4Weeks.map(date => ({
            label: `W${format(date, 'w')}`,
            amount: aggregatedData[format(date, 'yyyy-ww')] || 0,
        }));

    } else if (filter === 'yearly') {
        const dateLabels = Array.from({ length: 12 }, (_, i) => format(new Date(now.getFullYear(), i), 'MMM'));
        dateLabels.forEach(label => aggregatedData[label] = 0);

        allExpenses.forEach(expense => {
            const expenseDate = expense.date;
            if (isWithinInterval(expenseDate, { start: startOfYear(now), end: endOfYear(now) })) {
                const monthKey = format(expenseDate, 'MMM');
                aggregatedData[monthKey] = (aggregatedData[monthKey] || 0) + expense.amount;
            }
        });
         return dateLabels.map(label => ({ label: label, amount: aggregatedData[label] || 0 }));
    } else { // monthly (default)
        const last6Months = Array.from({ length: 6 }, (_, i) => subMonths(now, i)).reverse();
        last6Months.forEach(date => aggregatedData[format(date, 'yyyy-MM')] = 0);
        
        allExpenses.forEach(expense => {
            const expenseDate = expense.date;
            if (isWithinInterval(expenseDate, { start: last6Months[0], end: now })) {
                const monthKey = format(expenseDate, 'yyyy-MM');
                aggregatedData[monthKey] = (aggregatedData[monthKey] || 0) + expense.amount;
            }
        });
        
        return last6Months.map(date => ({
            label: format(date, 'MMM'),
            amount: aggregatedData[format(date, 'yyyy-MM')] || 0,
        }));
    }
}


// --- ORDER QUERIES ---

export async function createSalesOrder(orderData: z.infer<typeof SalesOrderSchema>): Promise<SalesOrder | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const validatedData = SalesOrderSchema.safeParse(orderData);
    if (!validatedData.success) {
        throw new Error('Invalid sales order data.');
    }

    const newOrder = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', `sales_orders_${userId}`);
        const counterDoc = await transaction.get(counterRef);
        const nextId = counterDoc.exists() ? (counterDoc.data().lastId || 0) + 1 : 1;
        const formattedId = `so${String(nextId).padStart(6, '0')}`;
        const newOrderRef = doc(db, 'salesOrders', formattedId);

        const orderToSave = {
            ...validatedData.data,
            id: formattedId,
            userId,
            order_date: serverTimestamp(),
            status: 'pending',
            item_ids: validatedData.data.items.map(i => i.id)
        };
        transaction.set(newOrderRef, orderToSave);
        transaction.set(counterRef, { lastId: nextId }, { merge: true });

        return {
            ...orderToSave,
            order_date: new Date().toISOString()
        } as SalesOrder;
    });

    revalidatePath('/dashboard/orders');
    return newOrder;
}

export async function createPurchaseOrder(orderData: z.infer<typeof PurchaseOrderSchema>): Promise<PurchaseOrder | null> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const validatedData = PurchaseOrderSchema.safeParse(orderData);
    if (!validatedData.success) {
        throw new Error('Invalid purchase order data.');
    }

    const newOrder = await runTransaction(db, async (transaction) => {
        const counterRef = doc(db, 'counters', `purchase_orders_${userId}`);
        const counterDoc = await transaction.get(counterRef);
        const nextId = counterDoc.exists() ? (counterDoc.data().lastId || 0) + 1 : 1;
        const formattedId = `po${String(nextId).padStart(6, '0')}`;
        const newOrderRef = doc(db, 'purchaseOrders', formattedId);

        const orderToSave = {
            ...validatedData.data,
            id: formattedId,
            userId,
            order_date: serverTimestamp(),
            status: 'pending',
            item_ids: validatedData.data.items.map(i => i.id)
        };
        transaction.set(newOrderRef, orderToSave);
        transaction.set(counterRef, { lastId: nextId }, { merge: true });

        return {
            ...orderToSave,
            order_date: new Date().toISOString()
        } as PurchaseOrder;
    });
    
    revalidatePath('/dashboard/orders');
    return newOrder;
}

export async function processSalesOrder(orderId: string): Promise<void> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const orderRef = doc(db, 'salesOrders', orderId);
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists() || orderDoc.data().userId !== userId) {
        throw new Error("Sales order not found or access denied.");
    }
    const order = orderDoc.data() as SalesOrder;
    if (order.status !== 'pending') {
        throw new Error("Order has already been processed or cancelled.");
    }
    
    // Simplified: converting order to a cash sale with full amount paid
    const saleData = {
        items: order.items.map(i => ({...i, cost_price: i.cost_price || 0, price_per_unit: i.price_per_unit})),
        customer_id: order.customer_id,
        customer_name: order.customer_name,
        subtotal: order.subtotal,
        tax_amount: 0,
        tax_percentage: 0,
        discount_amount: 0,
        service_charge: 0,
        total_amount: order.total_amount,
        paymentMethod: 'cash' as const,
        amountPaid: order.total_amount,
        previousBalance: 0, // Assume no previous balance for simplicity
        checkNumber: '',
    };
    
    await createSale(saleData);
    await updateDoc(orderRef, { status: 'completed' });

    revalidatePath('/dashboard/orders');
}

export async function processPurchaseOrder(orderId: string): Promise<void> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) throw new Error("User not authenticated");

    const orderRef = doc(db, 'purchaseOrders', orderId);
    const orderDoc = await getDoc(orderRef);
    if (!orderDoc.exists() || orderDoc.data().userId !== userId) {
        throw new Error("Purchase order not found or access denied.");
    }
    const order = orderDoc.data() as PurchaseOrder;
    if (order.status !== 'pending') {
        throw new Error("Order has already been processed or cancelled.");
    }
    
    // Simplified: converting order to a cash purchase with full amount paid
    const purchaseData = {
        items: order.items.map(i => ({...i, total_cost: i.total_amount, cost_price: i.cost_price || 0})),
        supplier_id: order.supplier_id,
        supplier_name: order.supplier_name,
        subtotal: order.subtotal,
        tax_amount: 0,
        tax_percentage: 0,
        discount_amount: 0,
        service_charge: 0,
        total_amount: order.total_amount,
        paymentMethod: 'cash' as const,
        amountPaid: order.total_amount,
    };
    
    await createPurchase(purchaseData);
    await updateDoc(orderRef, { status: 'completed' });
    
    revalidatePath('/dashboard/orders');
}

export async function fetchPendingOrders(): Promise<((SalesOrder & {type: 'sale'}) | (PurchaseOrder & {type: 'purchase'}))[]> {
    noStore();
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const salesOrdersQuery = query(collection(db, 'salesOrders'), where('userId', '==', userId), where('status', '==', 'pending'));
    const purchaseOrdersQuery = query(collection(db, 'purchaseOrders'), where('userId', '==', userId), where('status', '==', 'pending'));
    
    const [salesOrdersSnapshot, purchaseOrdersSnapshot] = await Promise.all([
        getDocs(salesOrdersQuery),
        getDocs(purchaseOrdersQuery),
    ]);

    const salesOrders = salesOrdersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            type: 'sale',
            order_date: (data.order_date as Timestamp).toDate().toISOString()
        } as SalesOrder & {type: 'sale'};
    });
    
    const purchaseOrders = purchaseOrdersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            type: 'purchase',
            order_date: (data.order_date as Timestamp).toDate().toISOString()
        } as PurchaseOrder & {type: 'purchase'};
    });

    const combined = [...salesOrders, ...purchaseOrders];
    combined.sort((a,b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());

    return combined;
}


    

