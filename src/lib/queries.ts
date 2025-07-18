
'use server';

import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import { db } from './firebase';
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
  getCountFromServer
} from 'firebase/firestore';
import type { Product, RecentActivity, SalesData, Store } from './types';
import { z } from 'zod';

// Form validation schemas
const ProductSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  stock: z.coerce.number().int().nonnegative('Stock must be a positive number'),
  cost_price: z.coerce.number().positive('Cost price must be positive'),
  selling_price: z.coerce.number().positive('Selling price must be positive'),
  image: z.string().url('Must be a valid image URL').optional().or(z.literal('')),
});

// CREATE
export async function createProduct(formData: FormData) {
  const validatedFields = ProductSchema.omit({id: true}).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid product data.');
  }
  
  const { name, ...productData } = validatedFields.data;

  try {
    const productsCollection = collection(db, 'products');
    await addDoc(productsCollection, {
      ...productData,
      name,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      image: productData.image || 'https://placehold.co/64x64.png',
    });
    
    const activityCollection = collection(db, 'recent_activity');
    await addDoc(activityCollection, {
      type: 'new',
      product_name: name,
      details: 'New product added to inventory',
      timestamp: serverTimestamp(),
    });

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
  try {
    const productsCollection = collection(db, 'products');
    const q = query(productsCollection, orderBy('created_at', 'desc'));
    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Product[];
    return products;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch products.');
  }
}

export async function fetchStores() {
    noStore();
    try {
        const storesCollection = collection(db, 'stores');
        const q = query(storesCollection, orderBy('name'));
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

export async function fetchDashboardData() {
    noStore();
    try {
        const productsCollection = collection(db, 'products');

        // Inventory Value & Product Count
        const productsSnapshot = await getDocs(productsCollection);
        let inventoryValue = 0;
        productsSnapshot.forEach(doc => {
            const product = doc.data() as Omit<Product, 'id'>;
            inventoryValue += (product.stock || 0) * (product.cost_price || 0);
        });

        const productCountSnapshot = await getCountFromServer(productsCollection);
        const productCount = productCountSnapshot.data().count;

        // Recent Activities
        const activityCollection = collection(db, 'recent_activity');
        const activityQuery = query(activityCollection, orderBy('timestamp', 'desc'), limit(5));
        const activitySnapshot = await getDocs(activityQuery);
        const recentActivities = activitySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            timestamp: (data.timestamp?.toDate() || new Date()).toISOString(),
          }
        }) as RecentActivity[];

        // Low Stock Products
        const lowStockQuery = query(productsCollection, where('stock', '<', 5), orderBy('stock', 'asc'), limit(5));
        const lowStockSnapshot = await getDocs(lowStockQuery);
        const lowStockProducts = lowStockSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Product[];

        return {
            inventoryValue,
            productCount,
            recentActivities,
            lowStockProducts,
        };
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch dashboard data.');
    }
}

export async function fetchSalesData() {
    noStore();
    try {
        // Firestore doesn't support complex aggregations like SQL's GROUP BY on the server-side easily.
        // This is a simplified example. For a real app, you'd likely use a separate analytics solution,
        // a Cloud Function to aggregate data, or process the sales data client-side (not recommended for large datasets).
        
        // This mock data simulates the expected output format.
        const mockSalesData: SalesData[] = [
            { month: 'Jan', sales: 4000 },
            { month: 'Feb', sales: 3000 },
            { month: 'Mar', sales: 5000 },
            { month: 'Apr', sales: 4500 },
            { month: 'May', sales: 6000 },
            { month: 'Jun', sales: 7500 },
        ];
        // In a real implementation, you would fetch raw sales documents from a 'sales' collection
        // and perform the aggregation here or on the client.
        // const salesCollection = collection(db, 'sales');
        // const salesSnapshot = await getDocs(salesCollection);
        // ... aggregation logic ...

        return mockSalesData;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch sales data.');
    }
}


// UPDATE
export async function updateProduct(id: string, formData: FormData) {
  const validatedFields = ProductSchema.omit({id: true}).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid product data.');
  }

  const { name, ...productData } = validatedFields.data;
  const productRef = doc(db, 'products', id);

  try {
    await updateDoc(productRef, {
      ...productData,
      name,
      updated_at: serverTimestamp(),
      image: productData.image || 'https://placehold.co/64x64.png',
    });
    
    const activityCollection = collection(db, 'recent_activity');
    await addDoc(activityCollection, {
        type: 'update',
        product_name: name,
        details: 'Product details updated',
        timestamp: serverTimestamp()
    });

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
  const productRef = doc(db, 'products', id);

  try {
    // Note: To get product name for activity log, we would need to fetch the doc first.
    // For simplicity here, we'll log a generic message.
    await deleteDoc(productRef);
    
    const activityCollection = collection(db, 'recent_activity');
    await addDoc(activityCollection, {
        type: 'delete',
        product_name: `Product ID: ${id}`,
        details: 'Product removed from inventory',
        timestamp: serverTimestamp()
    });

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard');
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to delete product.');
  }
}
