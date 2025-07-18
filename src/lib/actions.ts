'use server';

import { suggestOptimalPrice, type SuggestOptimalPriceInput, type SuggestOptimalPriceOutput } from '@/ai/flows/suggest-optimal-price';
import { z } from 'zod';

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
