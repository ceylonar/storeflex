
'use client';

import dynamic from 'next/dynamic'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Bar } from 'recharts';
import { Button } from '../ui/button';
import { useTransition, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { SalesData } from '@/lib/types';
import { fetchSalesData } from '@/lib/queries';
import { Loader2 } from 'lucide-react';


function SalesChartCard({ initialData }: { initialData: SalesData[] }) {
  const [data, setData] = useState(initialData);
  const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleFilterChange = (newFilter: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    if (newFilter === filter) return;

    setFilter(newFilter);
    startTransition(async () => {
      try {
        const newData = await fetchSalesData(newFilter);
        setData(newData);
        toast({
          title: 'Chart Updated',
          description: `Showing ${newFilter} sales data.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to fetch new sales data.',
        });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Your sales performance over time.</CardDescription>
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
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="month"
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
            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


const DynamicSalesChart = dynamic(
  () => Promise.resolve(SalesChartCard),
  { 
    ssr: false,
    loading: () => (
      <Card>
        <CardHeader>
           <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
              <Skeleton className="h-10 w-64" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    )
  }
)

export default DynamicSalesChart;
