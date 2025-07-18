'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { lowStockProducts, recentActivities, salesData } from '@/lib/data';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ArrowUpRight, DollarSign, Package, ShoppingCart, Users } from 'lucide-react';

const icons: { [key: string]: LucideIcon } = {
  DollarSign,
  Package,
  ShoppingCart,
  Users
};

interface StatCardProps {
  title: string;
  value: string;
  iconName: keyof typeof icons;
  description?: string;
}

export function StatCard({ title, value, iconName, description }: StatCardProps) {
  const Icon = icons[iconName];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardContent>
    </Card>
  );
}

export function SalesChartCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Overview</CardTitle>
        <CardDescription>Monthly sales performance.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesData}>
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
              tickFormatter={(value) => `$${value / 1000}K`}
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

export function LowStockCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Low Stock Items</CardTitle>
        <CardDescription>
          These items are running low. Reorder soon to avoid stockouts.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden sm:table-cell">Image</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStockProducts.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="hidden sm:table-cell">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={product.image} alt={product.name} data-ai-hint="product image" />
                    <AvatarFallback>{product.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive">{product.stock}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function RecentActivityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>What's been happening in your store.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8">
        {recentActivities.map((activity) => (
          <div key={activity.id} className="flex items-center gap-4">
            <Avatar className="hidden h-9 w-9 sm:flex">
              <AvatarImage src={`https://placehold.co/40x40.png`} alt="Avatar" data-ai-hint="product avatar" />
              <AvatarFallback>
                {activity.type === 'sale' ? 'S' : activity.type === 'update' ? 'U' : 'N'}
              </AvatarFallback>
            </Avatar>
            <div className="grid gap-1">
              <p className="text-sm font-medium leading-none">
                {activity.productName}
                <span className={cn('ml-2 capitalize text-xs', 
                  activity.type === 'sale' && 'text-accent-foreground',
                  activity.type === 'update' && 'text-blue-500',
                  activity.type === 'new' && 'text-purple-500'
                )}>({activity.type})</span>
              </p>
              <p className="text-sm text-muted-foreground">{activity.details}</p>
            </div>
            <div className="ml-auto text-sm text-muted-foreground">
              {activity.timestamp}
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter>
        <Button size="sm" className="w-full">
            View All
            <ArrowUpRight className="h-4 w-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
