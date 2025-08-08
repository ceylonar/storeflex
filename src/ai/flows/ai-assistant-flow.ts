
'use server';

/**
 * @fileOverview A flow for the AI Assistant chatbot.
 *
 * - askAiAssistant - A function that handles chatbot queries.
 * - AiAssistantOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { fetchInventoryRecords, fetchDashboardData, fetchCustomers, fetchSuppliers, fetchExpenses, fetchPendingOrders } from '@/lib/queries';

const AiAssistantOutputSchema = z.object({
  answer: z.string().describe('The answer to the user\'s question.'),
});
export type AiAssistantOutput = z.infer<typeof AiAssistantOutputSchema>;

export async function askAiAssistant(query: string): Promise<AiAssistantOutput> {
  // Fetch a comprehensive set of data to provide context to the AI
  const [allTransactions, dashboardData, customers, suppliers, expenses, pendingOrders] = await Promise.all([
    fetchInventoryRecords({}),
    fetchDashboardData(),
    fetchCustomers(),
    fetchSuppliers(),
    fetchExpenses(),
    fetchPendingOrders(),
  ]);
  
  // Format transactions into a simplified string for the prompt
  const transactionContext = allTransactions.map(t => {
      let details = `${t.type} on ${new Date(t.timestamp).toLocaleDateString()}: ${t.details}`;
      // For credit settlements and similar activities, ensure the party name is included if available.
      if ((t.type === 'credit_settled' || t.type.includes('return')) && t.partyName) {
        details = `${t.type} on ${new Date(t.timestamp).toLocaleDateString()} involving ${t.partyName}: ${t.details}`;
      }
      else if (t.items && t.items.length > 0) {
          details += ` Items: ${t.items.map(i => `${i.name} (Qty: ${(i as any).quantity || (i as any).return_quantity})`).join(', ')}`;
      }
      return details;
  }).join('\n');

  // Create a detailed breakdown of payables and receivables
  const payables = suppliers.filter(s => s.credit_balance > 0);
  const receivables = customers.filter(c => c.credit_balance < 0);
  
  const balanceContext = `
**Detailed Payables (Money you owe):**
${payables.length > 0 ? payables.map(s => `- Owed to ${s.name}: LKR ${s.credit_balance.toFixed(2)}`).join('\n') : "No outstanding payables."}

**Detailed Receivables (Money owed to you):**
${receivables.length > 0 ? receivables.map(c => `- Owed by ${c.name}: LKR ${Math.abs(c.credit_balance).toFixed(2)}`).join('\n') : "No outstanding receivables."}
  `;


  // Format key financial and operational data
  const dataContext = `
**Financial Snapshot:**
- Total Inventory Value: LKR ${dashboardData.inventoryValue.toFixed(2)}
- Total Sales: LKR ${dashboardData.totalSales.toFixed(2)}
- Total Expenses: LKR ${dashboardData.totalExpenses.toFixed(2)}
- Total Receivables (Money owed to you): LKR ${dashboardData.totalReceivables.toFixed(2)}
- Total Payables (Money you owe): LKR ${dashboardData.totalPayables.toFixed(2)}
- Profit Today: LKR ${dashboardData.profitToday.toFixed(2)}
- Profit This Month: LKR ${dashboardData.profitThisMonth.toFixed(2)}
- Profit This Year: LKR ${dashboardData.profitThisYear.toFixed(2)}

**Operational Snapshot:**
- Total Customers: ${customers.length}
- Total Suppliers: ${suppliers.length}
- Total Expenses Logged: ${expenses.length}
- Pending Sales Orders: ${pendingOrders.filter(o => o.type === 'sale').length}
- Pending Purchase Orders: ${pendingOrders.filter(o => o.type === 'purchase').length}
  `;

  const input = {
      query,
      transactionContext,
      dataContext,
      balanceContext,
  };
  
  return aiAssistantFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiAssistantPrompt',
  input: {
    schema: z.object({
      query: z.string(),
      transactionContext: z.string(),
      dataContext: z.string(),
      balanceContext: z.string(),
    }),
  },
  output: { schema: AiAssistantOutputSchema },
  prompt: `You are an AI assistant for an inventory management system called "StoreFlex Lite".
  Your role is to answer questions about the application's features and analyze its operational and financial data.
  
  **IMPORTANT**: You must detect the language of the user's question and respond in the same language.

  Here is a summary of the application's features:
  - Dashboard: Overview of key metrics.
  - Inventory: Manage products and services.
  - Sales (POS): Point-of-sale terminal.
  - Buy: Record purchases from suppliers.
  - Orders: Manage sales and purchase orders.
  - Customers & Suppliers: Manage contacts.
  - Moneyflow: Track receivables and payables.
  - Expenses: Log business expenses.
  - Reports: Generate detailed financial ledgers.
  - Price Optimizer: AI tool for pricing suggestions.
  - Account: Manage store and user settings.

  Based on the user's question, use the following real-time data to provide a concise and helpful answer in the user's language.
  - For questions about current balances (receivables/payables), use the "Detailed Financial Balances" as the primary source of truth.
  - For questions about past events, settlements, or specific transactions, use the "Detailed Transaction History".
  - For general stats, use the "Real-time Data Snapshot".

  **Detailed Financial Balances:**
  {{{balanceContext}}}

  **Real-time Data Snapshot:**
  {{{dataContext}}}

  **Detailed Transaction History:**
  {{{transactionContext}}}

  **User's Question:**
  "{{{query}}}"
  `,
});

const aiAssistantFlow = ai.defineFlow(
  {
    name: 'aiAssistantFlow',
    inputSchema: z.object({
        query: z.string(),
        transactionContext: z.string(),
        dataContext: z.string(),
        balanceContext: z.string(),
    }),
    outputSchema: AiAssistantOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
