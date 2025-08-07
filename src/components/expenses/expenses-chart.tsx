
'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTransition, useState } from 'react';
import type { ExpenseData } from '@/lib/types';
import { fetchExpenseChartData } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ExpensesChartProps {
    initialData: ExpenseData[];
    onDataChange: (data: ExpenseData[]) => void;
}

export function ExpensesChart({ initialData, onDataChange }: ExpensesChartProps) {
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleFilterChange = (newFilter: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    if (newFilter === filter) return;

    setFilter(newFilter);
    startTransition(async () => {
      try {
        const newData = await fetchExpenseChartData(newFilter);
        onDataChange(newData);
        toast({
          title: 'Chart Updated',
          description: `Showing ${newFilter} expenses data.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch new expenses data.',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Expenses Overview</CardTitle>
            <CardDescription>Your expenses over time.</CardDescription>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-secondary p-1">
            <Button size="sm" variant={filter === 'daily' ? 'default' : 'ghost'} onClick={() => handleFilterChange('daily')}>Daily</Button>
            <Button size="sm" variant={filter === 'weekly' ? 'default' : 'ghost'} onClick={() => handleFilterChange('weekly')}>Weekly</Button>
            <Button size="sm" variant={filter === 'monthly' ? 'default' : 'ghost'} onClick={() => handleFilterChange('monthly')}>Monthly</Button>
            <Button size="sm" variant={filter === 'yearly' ? 'default' : 'ghost'} onClick={() => handleFilterChange('yearly')}>Yearly</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-2 relative">
         {isPending && (
          <div className="absolute inset-0 flex items-center justify-center bg-card/50 z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={initialData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `LKR ${value / 1000}K`}
            />
            <Tooltip
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
              cursor={{fill: 'hsla(var(--primary), 0.1)'}}
            />
            <Bar dataKey="amount" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
