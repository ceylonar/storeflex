
'use server';

/**
 * @fileOverview This file defines a Genkit flow for fetching product information from a barcode.
 *
 * - getProductInfoFromBarcode - A function that calls the getProductInfoFlow.
 * - ProductInfoOutput - The return type for the function.
 */

import {ai, ensureAiIsConfigured} from '@/ai/genkit';
import {z} from 'genkit';

const ProductInfoOutputSchema = z.object({
  name: z.string().describe('The full name of the product.'),
  brand: z.string().optional().describe('The brand name of the product.'),
  category: z.string().describe('A suitable category for the product.'),
});
export type ProductInfoOutput = z.infer<typeof ProductInfoOutputSchema>;

export async function getProductInfoFromBarcode(barcode: string): Promise<ProductInfoOutput> {
  ensureAiIsConfigured();
  return getProductInfoFlow(barcode);
}

const prompt = ai.definePrompt({
  name: 'getProductInfoPrompt',
  input: {schema: z.string()},
  output: {schema: ProductInfoOutputSchema},
  prompt: `You are a product information specialist. Given the following barcode (UPC/EAN), find the product information online.
  
  Return the product's full name, its brand, and a suitable category for an inventory management system.
  
  If you cannot find the product, return a plausible name, brand, and category based on the barcode if possible, otherwise indicate that the product was not found in the name field.

  Barcode: {{{input}}}
  `,
});

const getProductInfoFlow = ai.defineFlow(
  {
    name: 'getProductInfoFlow',
    inputSchema: z.string(),
    outputSchema: ProductInfoOutputSchema,
  },
  async (barcode) => {
    const {output} = await prompt(barcode);
    return output!;
  }
);
