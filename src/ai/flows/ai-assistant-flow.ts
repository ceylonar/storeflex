
'use server';

/**
 * @fileOverview A flow for the AI Assistant chatbot.
 *
 * - askAiAssistant - A function that handles chatbot queries.
 * - AiAssistantOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { fetchInventoryRecords } from '@/lib/queries';

const AiAssistantOutputSchema = z.object({
  answer: z.string().describe('The answer to the user\'s question.'),
});
export type AiAssistantOutput = z.infer<typeof AiAssistantOutputSchema>;

export async function askAiAssistant(query: string): Promise<AiAssistantOutput> {
  // Fetch latest transaction data to provide context to the AI
  const allTransactions = await fetchInventoryRecords({});
  
  // Format transactions into a simplified string for the prompt
  const transactionContext = allTransactions.map(t => {
      let details = `${t.type} on ${new Date(t.timestamp).toLocaleDateString()}: ${t.details}`;
      if (t.items && t.items.length > 0) {
          details += ` Items: ${t.items.map(i => `${i.name} (Qty: ${(i as any).quantity || (i as any).return_quantity})`).join(', ')}`;
      }
      return details;
  }).join('\n');

  const input = {
      query,
      transactionContext,
  };
  
  return aiAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiAssistantPrompt',
  input: {
    schema: z.object({
      query: z.string(),
      transactionContext: z.string(),
    }),
  },
  output: { schema: AiAssistantOutputSchema },
  prompt: `You are an AI assistant for an inventory management system called "StoreFlex Lite".
  Your role is to answer questions about the application's features and analyze its transaction data.
  
  **IMPORTANT**: You must detect the language of the user's question and respond in the same language.

  Here is a summary of the application's features:
  - Dashboard: Overview of key metrics like inventory value, sales, and low-stock items.
  - Inventory: Manage products and services. You can add, edit, delete, and view the transaction history for each item. Barcode scanning with AI is supported to pre-fill product details.
  - Sales (POS): A point-of-sale terminal to conduct sales. Supports cash, credit, and check payments, and handles customer credit balances. It also has a section for processing customer returns.
  - Buy: A terminal for recording purchases from suppliers, which automatically updates stock and weighted-average cost prices. It also has a section for processing returns to suppliers.
  - Orders: A section to create and manage pending Sales Orders (for customers) and Purchase Orders (for suppliers). These orders can be processed later to become actual sales or purchases.
  - Customers & Suppliers: Manage contact information and view transaction histories.
  - Moneyflow: Track receivables (money owed to you) and payables (money you owe). You can settle credit balances and clear check payments here.
  - Expenses: Log business expenses like bills, rent, or supplies. You can also record lost or damaged products, which deducts them from inventory.
  - Reports: Generate detailed financial ledgers with filtering and CSV export capabilities.
  - Price Optimizer: An AI tool to suggest optimal product prices based on cost, competitor pricing, and sales data.
  - Account: Manage store details, branding, and user passwords.

  Based on the user's question and the following recent transaction data, provide a concise and helpful answer in the user's language.

  Transaction History:
  {{{transactionContext}}}

  User's Question:
  "{{{query}}}"
  `,
});

const aiAssistantFlow = ai.defineFlow(
  {
    name: 'aiAssistantFlow',
    inputSchema: z.object({
        query: z.string(),
        transactionContext: z.string(),
    }),
    outputSchema: AiAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
