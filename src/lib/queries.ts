
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
  setDoc
} from 'firebase/firestore';
import type { Product, RecentActivity, SalesData, Store, Sale, ProductSelect, UserProfile, TopSellingProduct, SaleItem } from './types';
import { z } from 'zod';
import { startOfDay, endOfDay, subMonths, isWithinInterval } from 'date-fns';

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
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  stock: z.coerce.number().int().nonnegative('Stock must be a non-negative number'),
  cost_price: z.coerce.number().positive('Cost price must be positive'),
  selling_price: z.coerce.number().positive('Selling price must be positive'),
  image: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
  low_stock_threshold: z.coerce.number().int().nonnegative('Low stock threshold must be a non-negative number'),
});

const SaleItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    image: z.string().optional(),
    quantity: z.number().int().positive(),
    price_per_unit: z.number().positive(),
    total_amount: z.number().positive(),
});

const POSSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1, 'At least one item is required in the sale.'),
  customer_name: z.string().optional(),
  customer_id: z.string().optional(),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative(),
  total: z.number().nonnegative(),
});


// CREATE
export async function createProduct(formData: FormData) {
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
    batch.set(newProductRef, {
      ...productData,
      name,
      image: image || '',
      userId,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    
    const activityCollection = collection(db, 'recent_activity');
    const newActivityRef = doc(activityCollection);
    batch.set(newActivityRef, {
      type: 'new',
      product_name: name,
      product_image: image || '',
      details: 'New product added to inventory',
      userId,
      timestamp: serverTimestamp(),
    });

    await batch.commit();

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');
    return { success: true, message: 'Product created successfully.' };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to create product.');
  }
}

// READ
export async function fetchProducts() {
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
        image: data.image as string || '',
      }
    });
    return products.sort((a,b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch products for select.');
  }
}

export async function fetchStores() {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];
    
    // Bypassing Firestore query to avoid index errors.
    // In a real app, you would create the required Firestore index.
    const defaultStore = { id: 'store-1', name: 'My Store', userId };
    return [defaultStore];
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return null;
    
    // Return mock data since there's no auth
    return {
        id: userId,
        email: 'user@example.com',
        name: 'Demo User',
        businessName: "Demo Store",
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
            totalSales += sale.total || 0;
            if (isWithinInterval(saleDate, { start: todayStart, end: todayEnd })) {
                salesToday += sale.total || 0;
            }
        });

        // Recent Activities
        const activityQuery = query(activityCollection, where('userId', '==', userId), limit(5));
        const activitySnapshot = await getDocs(activityQuery);
        const recentActivities = activitySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
          }
        }) as RecentActivity[];

        // Manual sort since we removed orderBy from the query
        recentActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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

export async function fetchSalesData(): Promise<SalesData[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const salesCollection = collection(db, 'sales');
        const salesQuery = query(salesCollection, where('userId', '==', userId));
        const salesSnapshot = await getDocs(salesQuery);

        // Initialize months
        const salesByMonth: Record<string, { sales: number }> = {};
        const sixMonthsAgo = subMonths(new Date(), 5);
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const month = date.toLocaleString('default', { month: 'short' });
            salesByMonth[month] = { sales: 0 };
        }

        salesSnapshot.docs.forEach(doc => {
            const sale = doc.data() as Sale;
            const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
            
            // Manual date filtering
            if (saleDate >= sixMonthsAgo) {
                const month = saleDate.toLocaleString('default', { month: 'short' });
                if (salesByMonth[month]) {
                    // Add a guard to ensure sale.total is a number
                    salesByMonth[month].sales += typeof sale.total === 'number' ? sale.total : 0;
                }
            }
        });

        const salesData: SalesData[] = Object.entries(salesByMonth).map(([month, data]) => ({
            month,
            sales: data.sales,
        }));
        
        return salesData;

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
                    if (productSales[item.name]) {
                        productSales[item.name].totalQuantity += quantity;
                    } else {
                        productSales[item.name] = { name: item.name, totalQuantity: quantity };
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


export async function fetchAllActivities(): Promise<RecentActivity[]> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const activityCollection = collection(db, 'recent_activity');
        const activityQuery = query(activityCollection, where('userId', '==', userId));
        const activitySnapshot = await getDocs(activityQuery);
        const activities = activitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
            }
        }) as RecentActivity[];
        return activities.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch activities.');
    }
}

// UPDATE
export async function updateProduct(id: string, formData: FormData) {
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

    batch.update(productRef, {
      ...productData,
      name,
      image: image || '',
      updated_at: serverTimestamp(),
    });
    
    const activityCollection = collection(db, 'recent_activity');
    const newActivityRef = doc(activityCollection);
    batch.set(newActivityRef, {
        type: 'update',
        product_name: name,
        product_image: image || '',
        details: 'Product details updated',
        userId,
        timestamp: serverTimestamp()
    });

    await batch.commit();

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');
    return { success: true, message: 'Product updated successfully.' };
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

// --- SALES QUERIES ---

// CREATE SALE
export async function createSale(saleData: z.infer<typeof POSSaleSchema>) {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();

  const validatedFields = POSSaleSchema.safeParse(saleData);

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid sale data.');
  }
  
  const { items, customer_name, customer_id, subtotal, tax, total } = validatedFields.data;
  
  try {
    await runTransaction(db, async (transaction) => {
        // 1. Update stock for all items
        for (const item of items) {
            const productRef = doc(db, 'products', item.id);
            const productDoc = await transaction.get(productRef);

            if (!productDoc.exists() || productDoc.data().userId !== userId) {
                throw new Error(`Product "${item.name}" not found or access denied.`);
            }
            
            const newStock = (productDoc.data().stock || 0) - item.quantity;

            if (newStock < 0) {
                throw new Error(`Not enough stock for ${item.name}.`);
            }
            transaction.update(productRef, { stock: newStock });
        }

      // 2. Create a single sale document
      const salesCollection = collection(db, 'sales');
      const newSaleRef = doc(salesCollection);
      transaction.set(newSaleRef, {
        userId,
        items,
        customer_name,
        customer_id,
        subtotal,
        tax,
        total,
        sale_date: serverTimestamp(),
      });

      // 3. Create a single activity log for the entire transaction
      const activityCollection = collection(db, 'recent_activity');
      const newActivityRef = doc(activityCollection);
      transaction.set(newActivityRef, {
        type: 'sale',
        product_name: `${items.length} items`,
        product_image: items[0]?.image || '',
        details: `Sale to ${customer_name || 'Walk-in'} for LKR ${total.toFixed(2)}`,
        timestamp: serverTimestamp(),
        userId,
      });
    });

    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/inventory');
    return { success: true, message: 'Sale recorded successfully.' };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error((error as Error).message || 'Failed to record sale.');
  }
}
