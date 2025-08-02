

'use server';

import { suggestOptimalPrice, type SuggestOptimalPriceInput, type SuggestOptimalPriceOutput } from '@/ai/flows/suggest-optimal-price';
import { getProductInfoFromBarcode, type ProductInfoOutput } from '@/ai/flows/getProductInfoFromBarcode';
import { collection, getDocs, query, where, Timestamp, getDoc, doc } from 'firebase/firestore';
import { getFirebaseServices } from './firebase';
import { isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { z } from 'zod';
import type { Sale, ProductTransaction, RecentActivity, DetailedRecord, SaleItem, PurchaseItem, Product } from './types';
import type { DateRange } from 'react-day-picker';
import { fetchInventoryRecords, getCurrentUserId } from './queries';


const FormSchema = z.object({
  productName: z.string().min(1, "Product name is required."),
  productCategory: z.string().min(1, "Product category is required."),
  costPrice: z.number().min(0, "Cost price must be positive."),
  competitorPrices: z.array(z.number()).min(1, "At least one competitor price is required."),
  salesData: z.array(z.object({
    date: z.string().min(1, "Date is required."),
    quantitySold: z.number().min(0, "Quantity must be positive."),
    sellingPrice: z.number().min(0, "Price must be positive."),
  })).optional()
});

export async function getPriceSuggestion(input: SuggestOptimalPriceInput): Promise<{ success: boolean; data: SuggestOptimalPriceOutput | null; message: string; }> {
  const validatedFields = FormSchema.safeParse(input);

  if (!validatedFields.success) {
    const errorMessages = Object.entries(validatedFields.error.flatten().fieldErrors)
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join('; ');
    return {
      success: false,
      data: null,
      message: `Invalid input: ${errorMessages}`,
    };
  }

  try {
    const result = await suggestOptimalPrice(validatedFields.data);
    return {
      success: true,
      data: result,
      message: 'Price suggestion generated successfully.',
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { 
      success: false,
      data: null,
      message: `An error occurred while generating the price suggestion: ${errorMessage}` 
    };
  }
}

export async function getProductDetailsFromBarcode(barcode: string): Promise<{ success: boolean; data: ProductInfoOutput | null; message: string; }> {
    if (!barcode) {
        return { success: false, data: null, message: "Barcode is required." };
    }
    try {
        const result = await getProductInfoFromBarcode(barcode);
        return { success: true, data: result, message: "Successfully fetched product info." };
    } catch (error) {
        console.error("AI Barcode Lookup Error:", error);
        return { success: false, data: null, message: "Failed to get product info from barcode." };
    }
}


type ReportData = {
    sales: Sale[];
    totalSales: number;
    transactionCount: number;
};

// A mock user ID. In a real app, you'd get this from the user's session.
const MOCK_USER_ID = 'user-123-abc';

export async function fetchSalesReport(range: DateRange): Promise<{ success: boolean; data: ReportData | null; message: string; }> {
  const { db } = getFirebaseServices();
  const userId = MOCK_USER_ID;
  try {
    const { from, to } = range;

    if (!from || !to) {
        throw new Error('A valid date range is required.');
    }

    const startDate = startOfDay(from);
    const endDate = endOfDay(to);

    const salesCollection = collection(db, 'sales');
    // Simplified query to avoid composite index requirement
    const q = query(salesCollection, where('userId', '==', userId));

    const querySnapshot = await getDocs(q);
    
    let totalSales = 0;
    const allSales: Sale[] = [];
    querySnapshot.forEach(doc => {
        allSales.push({
            id: doc.id,
            ...doc.data(),
            sale_date: (doc.data().sale_date as Timestamp).toDate().toISOString(),
        } as Sale);
    });
    
    // Manual filtering by date
    const filteredSales = allSales.filter(sale => 
        isWithinInterval(new Date(sale.sale_date), { start: startDate, end: endDate })
    );

    filteredSales.forEach(sale => {
        totalSales += sale.total_amount;
    });

    const transactionCount = filteredSales.length;
    
    filteredSales.sort((a,b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());

    return {
      success: true,
      data: { sales: filteredSales, totalSales, transactionCount },
      message: 'Report generated successfully.',
    };

  } catch (error) {
    console.error('Report Generation Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return {
      success: false,
      data: null,
      message: `Failed to generate report: ${errorMessage}`,
    };
  }
}

export async function fetchProductHistory(productId: string): Promise<ProductTransaction[]> {
    const { db } = getFirebaseServices();
    const userId = await getCurrentUserId();

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

    // Sort all transactions by date
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return transactions;
}
    


