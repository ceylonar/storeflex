
import { fetchExpenses, fetchExpenseChartData } from '@/lib/queries';
import { ExpensesClient } from '@/components/expenses/expenses-client';

export default async function ExpensesPage() {
  const initialExpenses = await fetchExpenses();
  const initialChartData = await fetchExpenseChartData('monthly');

  return (
      <ExpensesClient initialExpenses={initialExpenses} initialChartData={initialChartData} />
  );
}
