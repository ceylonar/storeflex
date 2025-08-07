
import { fetchExpenses, fetchExpenseChartData, fetchProductsForSelect } from '@/lib/queries';
import { ExpensesClient } from '@/components/expenses/expenses-client';

export default async function ExpensesPage() {
  const initialExpenses = await fetchExpenses();
  const initialChartData = await fetchExpenseChartData('monthly');
  const products = await fetchProductsForSelect();

  return (
      <ExpensesClient 
        initialExpenses={initialExpenses} 
        initialChartData={initialChartData} 
        products={products}
      />
  );
}
