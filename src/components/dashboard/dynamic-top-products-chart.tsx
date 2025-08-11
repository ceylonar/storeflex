
'use client';

import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { TopSellingProduct } from '@/lib/types';


export function TopSellingProductsCard({ products }: { products: TopSellingProduct[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Products</CardTitle>
        <CardDescription>Your best-performing products by quantity sold.</CardDescription>
      </CardHeader>
      <CardContent className="pr-0">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart layout="vertical" data={products} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis 
                type="number" 
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
            />
            <YAxis 
                type="category" 
                dataKey="name" 
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={80}
                tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
            />
             <Tooltip
              contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
              cursor={{fill: 'hsla(var(--primary), 0.1)'}}
            />
            <Bar dataKey="totalQuantity" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}


const DynamicTopSellingProductsCard = dynamic(
  () => Promise.resolve(TopSellingProductsCard),
  { 
    ssr: false,
    loading: () => (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
    )
  }
)

export default DynamicTopSellingProductsCard;
