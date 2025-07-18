
'use server';

import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import { db } from './db';
import type { Product, RecentActivity, SalesData, Store } from './types';
import { z } from 'zod';

// Form validation schemas
const ProductSchema = z.object({
  id: z.string().uuid().optional(),
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

  const { sku, name, category, stock, cost_price, selling_price, image } = validatedFields.data;
  
  try {
    await db.query(`
      INSERT INTO products (sku, name, category, stock, cost_price, selling_price, image)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [sku, name, category, stock, cost_price, selling_price, image || 'https://placehold.co/64x64.png']);
    
    await db.query(`
      INSERT INTO recent_activity(type, product_name, details)
      VALUES ('new', $1, 'New product added to inventory')
    `, [name]);

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
    const { rows } = await db.query<Product>('SELECT * FROM products ORDER BY created_at DESC');
    return rows;
  } catch (error) {
    console.error('Database Error:', error);
    // In a real-world scenario, you might want to return an empty array or a specific error object
    // For now, we throw to let the caller handle it, which Next.js will catch with an error boundary.
    throw new Error('Failed to fetch products.');
  }
}

export async function fetchStores() {
    noStore();
    try {
        const { rows } = await db.query<Store>('SELECT id, name FROM stores ORDER BY name');
        return rows;
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch stores.');
    }
}

export async function fetchDashboardData() {
    noStore();
    try {
        const inventoryValuePromise = db.query(`SELECT SUM(stock * cost_price) as total FROM products`);
        const productCountPromise = db.query(`SELECT COUNT(*) as total FROM products`);
        const recentActivitiesPromise = db.query<RecentActivity>(`SELECT id, type, product_name, details, timestamp FROM recent_activity ORDER BY timestamp DESC LIMIT 5`);
        const lowStockProductsPromise = db.query<Product>(`SELECT * FROM products WHERE stock < 5 ORDER BY stock ASC LIMIT 5`);

        const [
            inventoryValueResult,
            productCountResult,
            recentActivitiesResult,
            lowStockProductsResult
        ] = await Promise.all([
            inventoryValuePromise,
            productCountPromise,
            recentActivitiesPromise,
            lowStockProductsPromise
        ]);

        return {
            inventoryValue: parseFloat(inventoryValueResult.rows[0]?.total || 0),
            productCount: parseInt(productCountResult.rows[0]?.total || 0, 10),
            recentActivities: recentActivitiesResult.rows,
            lowStockProducts: lowStockProductsResult.rows,
        };
    } catch (error) {
        console.error('Database Error:', error);
        throw new Error('Failed to fetch dashboard data.');
    }
}

export async function fetchSalesData() {
    noStore();
    try {
        // This query assumes sales data for the last 6 months. 
        // In a real app, you might want a more sophisticated date range handling.
        const { rows } = await db.query<SalesData>(`
            SELECT 
                TO_CHAR(sale_date, 'Mon') as month, 
                SUM(quantity_sold * selling_price)::int as sales 
            FROM sales 
            WHERE sale_date > NOW() - INTERVAL '6 months'
            GROUP BY 1, date_trunc('month', sale_date)
            ORDER BY date_trunc('month', sale_date);
        `);
        return rows;
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

  const { sku, name, category, stock, cost_price, selling_price, image } = validatedFields.data;

  try {
    await db.query(`
      UPDATE products
      SET sku = $1, name = $2, category = $3, stock = $4, cost_price = $5, selling_price = $6, image = $7
      WHERE id = $8
    `, [sku, name, category, stock, cost_price, selling_price, image || 'https://placehold.co/64x64.png', id]);
    
    await db.query(`
        INSERT INTO recent_activity(type, product_name, details)
        VALUES ('update', $1, 'Product details updated')
    `, [name]);

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
    // Fetch product name before deleting for the activity log
    const productResult = await db.query('SELECT name FROM products WHERE id = $1', [id]);
    
    if (productResult.rows.length > 0) {
      const productName = productResult.rows[0].name;
      
      await db.query('DELETE FROM products WHERE id = $1', [id]);
      
      await db.query(`
          INSERT INTO recent_activity(type, product_name, details)
          VALUES ('delete', $1, 'Product removed from inventory')
      `, [productName]);

      revalidatePath('/dashboard/inventory');
      revalidatePath('/dashboard');
    }
    return { success: true, message: 'Product deleted successfully.' };
  } catch (error)
 {
    console.error('Database Error:', error);
    throw new Error('Failed to delete product.');
  }
}
