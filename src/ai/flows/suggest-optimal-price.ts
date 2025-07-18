'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting optimal product prices based on competitor prices and sales data.
 *
 * - suggestOptimalPrice - A function that calls the suggestOptimalPriceFlow to determine the best price.
 * - SuggestOptimalPriceInput - The input type for the suggestOptimalPrice function.
 * - SuggestOptimalPriceOutput - The return type for the suggestOptimalPrice function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOptimalPriceInputSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  productCategory: z.string().describe('The category of the product.'),
  costPrice: z.number().describe('The cost price of the product.'),
  competitorPrices: z.array(z.number()).describe('An array of competitor prices for the product.'),
  salesData: z.array(z.object({
    date: z.string().describe('The date of the sale (YYYY-MM-DD).'),
    quantitySold: z.number().describe('The quantity of the product sold on that date.'),
    sellingPrice: z.number().describe('The price at which the product was sold on that date.'),
  })).describe('Historical sales data for the product.'),
});
export type SuggestOptimalPriceInput = z.infer<typeof SuggestOptimalPriceInputSchema>;

const SuggestOptimalPriceOutputSchema = z.object({
  suggestedPrice: z.number().describe('The AI-suggested optimal selling price for the product.'),
  reasoning: z.string().describe('The AI reasoning behind the suggested price.'),
});
export type SuggestOptimalPriceOutput = z.infer<typeof SuggestOptimalPriceOutputSchema>;

export async function suggestOptimalPrice(input: SuggestOptimalPriceInput): Promise<SuggestOptimalPriceOutput> {
  return suggestOptimalPriceFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOptimalPricePrompt',
  input: {schema: SuggestOptimalPriceInputSchema},
  output: {schema: SuggestOptimalPriceOutputSchema},
  prompt: `You are an AI pricing specialist helping store managers determine the optimal selling price for their products.

  Given the following information about a product, analyze competitor prices and sales data to suggest the optimal selling price that maximizes profitability.

  Product Name: {{{productName}}}
  Product Category: {{{productCategory}}}
  Cost Price: {{{costPrice}}}
  Competitor Prices: {{#each competitorPrices}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Sales Data:
  {{#each salesData}}
  - Date: {{{date}}}, Quantity Sold: {{{quantitySold}}}, Selling Price: {{{sellingPrice}}}
  {{/each}}

  Based on this information, what is the optimal selling price for the product, and what is your reasoning behind this suggestion? Return the suggested price and reasoning in the JSON format. Make sure the suggestedPrice is a number and the reasoning is a string.
  `,
});

const suggestOptimalPriceFlow = ai.defineFlow(
  {
    name: 'suggestOptimalPriceFlow',
    inputSchema: SuggestOptimalPriceInputSchema,
    outputSchema: SuggestOptimalPriceOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
