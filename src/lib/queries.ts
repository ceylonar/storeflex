
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
  getDoc,
  writeBatch,
  Timestamp,
  runTransaction
} from 'firebase/firestore';
import type { Product, RecentActivity, SalesData, Store, Sale, ProductSelect, TopSellingProduct } from './types';
import { z } from 'zod';
import { startOfDay, endOfDay, subMonths } from 'date-fns';

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


// CREATE
export async function createProduct(formData: FormData) {
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
  try {
    const productsCollection = collection(db, 'products');
    const q = query(productsCollection, orderBy('created_at', 'desc'));
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
  try {
    const productsCollection = collection(db, 'products');
    const q = query(productsCollection, orderBy('name', 'asc'));
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
        const salesCollection = collection(db, 'sales');

        const productsSnapshot = await getDocs(productsCollection);
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
        const todaySalesQuery = query(salesCollection, where('sale_date', '>=', todayStart), where('sale_date', '<=', todayEnd));
        const todaySalesSnapshot = await getDocs(todaySalesQuery);
        let salesToday = 0;
        todaySalesSnapshot.forEach(doc => {
            salesToday += doc.data().total_amount;
        });

        // Total Sales
        const allSalesSnapshot = await getDocs(salesCollection);
        let totalSales = 0;
        allSalesSnapshot.forEach(doc => {
          totalSales += doc.data().total_amount;
        });


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
    try {
        const sixMonthsAgo = subMonths(new Date(), 6);
        const salesCollection = collection(db, 'sales');
        const salesQuery = query(salesCollection, where('sale_date', '>=', sixMonthsAgo));
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
    try {
        const salesCollection = collection(db, 'sales');
        const salesSnapshot = await getDocs(salesCollection);

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
    try {
        const activityCollection = collection(db, 'recent_activity');
        const activityQuery = query(activityCollection, orderBy('timestamp', 'desc'));
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
  const validatedFields = ProductSchema.omit({id: true}).safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    console.error('Validation Error:', validatedFields.error.flatten().fieldErrors);
    throw new Error('Invalid product data.');
  }

  const { name, image, ...productData } = validatedFields.data;
  
  try {
    const batch = writeBatch(db);
    const productRef = doc(db, 'products', id);
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
  try {
    const batch = writeBatch(db);
    const productRef = doc(db, 'products', id);

    const productDoc = await getDoc(productRef);
    if (!productDoc.exists()) {
        throw new Error('Product not found.');
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

      if (!productDoc.exists()) {
        throw new Error('Product not found.');
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
      });

      const activityCollection = collection(db, 'recent_activity');
      const newActivityRef = doc(activityCollection);
      transaction.set(newActivityRef, {
        type: 'sale',
        product_name: productData.name,
        product_image: productData.image || '',
        details: `Sold ${quantity} unit(s)`,
        timestamp: serverTimestamp(),
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
  try {
    const salesCollection = collection(db, 'sales');
    const q = query(salesCollection, orderBy('sale_date', 'desc'));
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
        if (!saleDoc.exists()) {
            throw new Error('Sale not found');
        }

        const oldSaleData = saleDoc.data() as Sale;
        const quantityChange = quantity - oldSaleData.quantity;

        // If the product changed, we need to revert stock on old product and decrement on new one
        if (oldSaleData.product_id !== product_id) {
          const oldProductRef = doc(db, 'products', oldSaleData.product_id);
          const oldProductDoc = await transaction.get(oldProductRef);
          if (oldProductDoc.exists()) {
            transaction.update(oldProductRef, { stock: (oldProductDoc.data().stock || 0) + oldSaleData.quantity });
          }
        }

        const productRef = doc(db, 'products', product_id);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists()) {
            throw new Error('Product not found');
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
  try {
    const saleRef = doc(db, 'sales', id);
    
    await runTransaction(db, async (transaction) => {
        const saleDoc = await transaction.get(saleRef);
        if (!saleDoc.exists()) {
            throw new Error('Sale not found');
        }

        const { product_id, quantity } = saleDoc.data() as Sale;
        const productRef = doc(db, 'products', product_id);
        const productDoc = await transaction.get(productRef);

        if(productDoc.exists()) {
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
