
'use server';

import { suggestOptimalPrice, type SuggestOptimalPriceInput, type SuggestOptimalPriceOutput } from '@/ai/flows/suggest-optimal-price';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { z } from 'zod';
import type { Sale } from './types';

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

type Period = 'daily' | 'weekly' | 'monthly';
type ReportData = {
    sales: Sale[];
    totalSales: number;
    transactionCount: number;
};

export async function fetchSalesReport(period: Period): Promise<{ success: boolean; data: ReportData | null; message: string; }> {
  try {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    switch (period) {
      case 'daily':
        startDate = startOfDay(now);
        break;
      case 'weekly':
        startDate = startOfWeek(now);
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        break;
      default:
        throw new Error('Invalid period specified.');
    }
    
    const salesCollection = collection(db, 'sales');
    const q = query(
      salesCollection,
      where('sale_date', '>=', startDate),
      where('sale_date', '<=', endDate),
      orderBy('sale_date', 'desc')
    );

    const querySnapshot = await getDocs(q);
    
    let totalSales = 0;
    const sales: Sale[] = querySnapshot.docs.map(doc => {
      const data = doc.data();
      totalSales += data.total_amount;
      return {
        id: doc.id,
        ...data,
        sale_date: (data.sale_date as Timestamp).toDate().toISOString(),
      } as Sale;
    });

    const transactionCount = sales.length;

    return {
      success: true,
      data: { sales, totalSales, transactionCount },
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
