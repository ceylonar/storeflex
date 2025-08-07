
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Download, Receipt } from 'lucide-react';
import type { Expense, ExpenseData } from '@/lib/types';
import { createExpense, fetchExpenses, fetchExpenseChartData } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import { ExpensesChart } from './expenses-chart';
import { ExpensesTable } from './expenses-table';
import { AddExpenseDialog } from './add-expense-dialog';
import { format } from 'date-fns';

interface ExpensesClientProps {
  initialExpenses: Expense[];
  initialChartData: ExpenseData[];
}

export function ExpensesClient({ initialExpenses, initialChartData }: ExpensesClientProps) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [expenses, setExpenses] = React.useState<Expense[]>(initialExpenses);
  const [chartData, setChartData] = React.useState<ExpenseData[]>(initialChartData);
  const [isDownloading, setIsDownloading] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const refreshExpenses = async () => {
    const updatedExpenses = await fetchExpenses();
    setExpenses(updatedExpenses);
  };
  
  const handleAddExpense = async (formData: FormData) => {
    try {
      await createExpense(formData);
      toast({ title: "Success", description: "Expense added successfully." });
      refreshExpenses();
      setIsDialogOpen(false);
      return true;
    } catch (error) {
      toast({ variant: 'destructive', title: "Error", description: (error as Error).message });
      return false;
    }
  };

  const handleDownload = () => {
    if (expenses.length === 0) {
        toast({ variant: 'destructive', title: "No Data", description: "There are no expenses to download." });
        return;
    }
    setIsDownloading(true);
    toast({ title: "Preparing Download", description: "Generating expenses report..." });

    try {
        const headers = ['ID', 'Date', 'Type', 'Description', 'Amount (LKR)'];
        const csvRows = expenses.map(exp => [
            exp.id,
            format(new Date(exp.date), 'yyyy-MM-dd'),
            `"${exp.type}"`,
            `"${exp.description}"`,
            exp.amount.toFixed(2)
        ].join(','));
        
        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `storeflex_expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Download Started", description: "Your expenses report is being downloaded." });
    } catch (error) {
        toast({ variant: 'destructive', title: "Download Failed", description: "Could not generate the CSV report."});
    } finally {
        setIsDownloading(false);
    }
  };
  
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Receipt className="h-8 w-8 text-primary" />
            <div>
            <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">
                Track your business's operational costs and expenditures.
            </p>
            </div>
        </div>
         <div className="flex w-full sm:w-auto gap-2">
            <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
            </Button>
            <Button variant="outline" className="w-full" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download CSV
            </Button>
        </div>
      </div>
      
      <AddExpenseDialog 
        isOpen={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddExpense}
      />

      <ExpensesChart initialData={chartData} onDataChange={setChartData} />
      <ExpensesTable expenses={expenses} />
    </div>
  );
}
