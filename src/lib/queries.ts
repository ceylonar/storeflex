
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
import type { Product, RecentActivity, SalesData, Store, Sale, ProductSelect, UserProfile } from './types';
import { z } from 'zod';
import { startOfDay, endOfDay, subMonths } from 'date-fns';
import { getAuthenticatedAppForUser } from './firebase-admin';

// Helper to get current user ID
async function getCurrentUserId() {
    const authData = await getAuthenticatedAppForUser();
    if (!authData || !authData.auth.currentUser) {
        throw new Error('User not authenticated.');
    }
    return authData.auth.currentUser.uid;
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

const SaleSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().min(1, 'Product is required.'),
  quantity: z.coerce.number().int().positive('Quantity must be a positive number'),
  price_per_unit: z.coerce.number().positive('Unit price must be positive.'),
  total_amount: z.coerce.number().positive('Total amount must be positive.'),
  sale_date: z.string().min(1, 'Sale date is required'),
});

const UserProfileSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    businessName: z.string().min(1, 'Business name is required'),
    address: z.string().optional(),
    contactNumber: z.string().optional(),
    googleSheetUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

interface CreateUserArgs {
    uid: string;
    email: string;
}


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
    const q = query(productsCollection, where('userId', '==', userId), orderBy('created_at', 'desc'));
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
    const q = query(productsCollection, where('userId', '==', userId), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name as string,
        selling_price: data.selling_price as number,
      }
    });
    return products;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch products for select.');
  }
}

export async function fetchStores() {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const { db } = getFirebaseServices();
    try {
        const storesCollection = collection(db, 'stores');
        const q = query(storesCollection, where('userId', '==', userId), orderBy('name'));
        const querySnapshot = await getDocs(q);
        const stores = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Store[];
        return stores;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch stores.');
    }
}

export async function createInitialStoreForUser({ uid, email }: CreateUserArgs): Promise<{ success: boolean; message: string; }> {
    const { db } = getFirebaseServices();

    if (!uid) {
        return { success: false, message: 'User is not authenticated. Please log in.' };
    }

    try {
        const batch = writeBatch(db);

        const userRef = doc(db, 'users', uid);
        batch.set(userRef, {
            email,
            id: uid,
            name: email.split('@')[0] || 'New User',
            businessName: `${email.split('@')[0]}'s Store`,
            created_at: serverTimestamp()
        });
        
        const storesCollection = collection(db, 'stores');
        const newStoreRef = doc(storesCollection);
        batch.set(newStoreRef, {
            name: `${email.split('@')[0]}'s Store`,
            userId: uid,
            created_at: serverTimestamp()
        });

        await batch.commit();
        return { success: true, message: 'User profile and store created.' };
    } catch (error) {
        console.error('Failed to create initial user data:', error);
        return { success: false, message: 'Failed to set up your profile.' };
    }
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
    noStore();
    const userId = await getCurrentUserId();
    if (!userId) return null;
    
    const { db } = getFirebaseServices();
    try {
        const userRef = doc(db, 'users', userId);
        const docSnap = await getDoc(userRef);

        if (docSnap.exists()) {
            return docSnap.data() as UserProfile;
        }
        return null;
    } catch(e) {
        console.error("Failed to fetch user profile", e);
        throw new Error("Failed to fetch user profile");
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

        // Sales (Today)
        const todayStart = startOfDay(new Date());
        const todayEnd = endOfDay(new Date());
        const todaySalesQuery = query(salesCollection, where('userId', '==', userId), where('sale_date', '>=', todayStart), where('sale_date', '<=', todayEnd));
        const todaySalesSnapshot = await getDocs(todaySalesQuery);
        let salesToday = 0;
        todaySalesSnapshot.forEach(doc => {
            salesToday += doc.data().total_amount;
        });

        // Total Sales
        const allSalesQuery = query(salesCollection, where('userId', '==', userId));
        const allSalesSnapshot = await getDocs(allSalesQuery);
        let totalSales = 0;
        allSalesSnapshot.forEach(doc => {
          totalSales += doc.data().total_amount;
        });


        // Recent Activities
        const activityCollection = collection(db, 'recent_activity');
        const activityQuery = query(activityCollection, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(5));
        const activitySnapshot = await getDocs(activityQuery);
        const recentActivities = activitySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
          }
        }) as RecentActivity[];

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
        const sixMonthsAgo = subMonths(new Date(), 6);
        const salesCollection = collection(db, 'sales');
        const salesQuery = query(salesCollection, where('userId', '==', userId), where('sale_date', '>=', sixMonthsAgo));
        const salesSnapshot = await getDocs(salesQuery);

        // Initialize months
        const salesByMonth: Record<string, { sales: number }> = {};
        for (let i = 5; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const month = date.toLocaleString('default', { month: 'short' });
            salesByMonth[month] = { sales: 0 };
        }

        salesSnapshot.docs.forEach(doc => {
            const sale = doc.data() as Omit<Sale, 'id'>;
            const saleDate = (sale.sale_date as unknown as Timestamp).toDate();
            const month = saleDate.toLocaleString('default', { month: 'short' });
            
            if (salesByMonth[month]) {
                salesByMonth[month].sales += sale.total_amount;
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

        const productSales: Record<string, number> = {};

        salesSnapshot.docs.forEach(doc => {
            const sale = doc.data() as Omit<Sale, 'id'>;
            if (productSales[sale.product_name]) {
                productSales[sale.product_name] += sale.quantity;
            } else {
                productSales[sale.product_name] = sale.quantity;
            }
        });

        const sortedProducts = Object.entries(productSales)
            .map(([name, totalQuantity]) => ({ name, totalQuantity }))
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
        const activityQuery = query(activityCollection, where('userId', '==', userId), orderBy('timestamp', 'desc'));
        const activitySnapshot = await getDocs(activityQuery);
        const activities = activitySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
            }
        }) as RecentActivity[];
        return activities;
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

export async function updateUserProfile(formData: FormData) {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();
    
    const profileData = Object.fromEntries(formData.entries());
    const validatedFields = UserProfileSchema.partial().safeParse(profileData);

    if (!validatedFields.success) {
        console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
        throw new Error('Invalid profile data.');
    }
    
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            ...validatedFields.data,
            updated_at: serverTimestamp(),
        });
        revalidatePath('/dashboard/settings');
        return { success: true, message: 'Profile updated successfully.' };
    } catch (e) {
        console.error('Database Error:', e);
        throw new Error('Failed to update profile.');
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
export async function createSale(formData: FormData) {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();

  const validatedFields = SaleSchema.omit({id: true}).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid sale data.');
  }
  
  const { product_id, quantity, price_per_unit, total_amount, sale_date } = validatedFields.data;
  
  try {
    await runTransaction(db, async (transaction) => {
      const productRef = doc(db, 'products', product_id);
      const productDoc = await transaction.get(productRef);

      if (!productDoc.exists() || productDoc.data().userId !== userId) {
        throw new Error('Product not found or access denied.');
      }
      
      const productData = productDoc.data();
      const newStock = (productData.stock || 0) - quantity;

      if (newStock < 0) {
        throw new Error('Not enough stock for this sale.');
      }
      
      transaction.update(productRef, { stock: newStock });

      const salesCollection = collection(db, 'sales');
      const newSaleRef = doc(salesCollection);
      transaction.set(newSaleRef, {
        product_id,
        product_name: productData.name,
        product_image: productData.image || '',
        quantity,
        price_per_unit,
        total_amount: total_amount,
        sale_date: new Date(sale_date),
        userId,
      });

      const activityCollection = collection(db, 'recent_activity');
      const newActivityRef = doc(activityCollection);
      transaction.set(newActivityRef, {
        type: 'sale',
        product_name: productData.name,
        product_image: productData.image || '',
        details: `Sold ${quantity} unit(s)`,
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

// READ SALES
export async function fetchSales() {
  noStore();
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { db } = getFirebaseServices();
  try {
    const salesCollection = collection(db, 'sales');
    const q = query(salesCollection, where('userId', '==', userId), orderBy('sale_date', 'desc'));
    const querySnapshot = await getDocs(q);
    const sales = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        sale_date: data.sale_date.toDate().toISOString(),
      }
    }) as Sale[];
    return sales;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch sales.');
  }
}

// UPDATE SALE
export async function updateSale(id: string, formData: FormData) {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();

  const validatedFields = SaleSchema.omit({id: true}).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid sale data.');
  }

  const { product_id, quantity, price_per_unit, total_amount, sale_date } = validatedFields.data;
  
  try {
    await runTransaction(db, async (transaction) => {
        const saleRef = doc(db, 'sales', id);
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists() || saleDoc.data().userId !== userId) {
            throw new Error('Sale not found or access denied');
        }

        const oldSaleData = saleDoc.data() as Sale;
        
        // If the product changed, we need to revert stock on old product and decrement on new one
        if (oldSaleData.product_id !== product_id) {
          const oldProductRef = doc(db, 'products', oldSaleData.product_id);
          const oldProductDoc = await transaction.get(oldProductRef);
          if (oldProductDoc.exists() && oldProductDoc.data().userId === userId) {
            transaction.update(oldProductRef, { stock: (oldProductDoc.data().stock || 0) + oldSaleData.quantity });
          }
        }

        const productRef = doc(db, 'products', product_id);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists() || productDoc.data().userId !== userId) {
            throw new Error('Product not found or access denied');
        }
        
        const currentStock = productDoc.data().stock || 0;
        const stockAfterRevert = oldSaleData.product_id === product_id ? currentStock + oldSaleData.quantity : currentStock;
        const newStock = stockAfterRevert - quantity;

        if (newStock < 0) {
            throw new Error('Not enough stock to fulfill the updated sale quantity.');
        }

        transaction.update(productRef, { stock: newStock });

        transaction.update(saleRef, {
            product_id,
            quantity,
            price_per_unit,
            total_amount: total_amount,
            sale_date: new Date(sale_date),
            product_name: productDoc.data().name,
            product_image: productDoc.data().image || '',
            userId,
        });
    });

    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/inventory');
    return { success: true, message: 'Sale updated successfully.' };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error((error as Error).message || 'Failed to update sale.');
  }
}

// DELETE SALE
export async function deleteSale(id: string) {
  const { db } = getFirebaseServices();
  const userId = await getCurrentUserId();
  
  try {
    const saleRef = doc(db, 'sales', id);
    
    await runTransaction(db, async (transaction) => {
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists() || saleDoc.data().userId !== userId) {
            throw new Error('Sale not found or access denied');
        }

        const { product_id, quantity } = saleDoc.data() as Sale;
        const productRef = doc(db, 'products', product_id);
        const productDoc = await transaction.get(productRef);

        if(productDoc.exists() && productDoc.data().userId === userId) {
            const newStock = (productDoc.data().stock || 0) + quantity;
            transaction.update(productRef, { stock: newStock });
        }

        transaction.delete(saleRef);
    });
    
    revalidatePath('/dashboard/sales');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/inventory');
    return { success: true, message: 'Sale deleted and stock restored.' };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to delete sale.');
  }
}
