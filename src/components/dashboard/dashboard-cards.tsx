

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
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, LabelList, Legend } from 'recharts';
import type { Product, RecentActivity, SalesData, TopSellingProduct } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { ArrowUpRight, DollarSign, Package, ShoppingCart, Users, CreditCard, Loader2, CheckCircle, XCircle, HandCoins } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { useEffect, useState, useTransition } from 'react';
import { fetchSalesData } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';

const icons = {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  CreditCard
};

const activityIcons: Record<RecentActivity['type'], React.ElementType> = {
    sale: ShoppingCart,
    purchase: DollarSign,
    update: Package,
    new: Package,
    delete: Package,
    credit_settled: HandCoins,
    check_cleared: CheckCircle,
    check_rejected: XCircle,
}

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

export function SalesChartCard({ initialData }: { initialData: SalesData[] }) {
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

export function LowStockCard({ products }: { products: Product[] }) {
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
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="hidden sm:table-cell">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={product.image || 'https://placehold.co/40x40.png'} alt={product.name} data-ai-hint="product image" />
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

function ActivityTime({ timestamp }: { timestamp: string }) {
  const [timeAgo, setTimeAgo] = useState('');

  useEffect(() => {
    if (timestamp && !isNaN(new Date(timestamp).getTime())) {
      try {
        setTimeAgo(formatDistanceToNow(new Date(timestamp), { addSuffix: true }));
      } catch (error) {
        console.error("Error formatting date:", error);
        setTimeAgo("Invalid date");
      }
    } else {
        setTimeAgo("A while ago");
    }
  }, [timestamp]);

  return <>{timeAgo || '...'}</>;
}

export function RecentActivityCard({ activities }: { activities: RecentActivity[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>What's been happening in your store.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8">
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type] || Package;
          return (
            <div key={activity.id} className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                {activity.product_image ? (
                  <AvatarImage src={activity.product_image} alt={activity.product_name || 'Activity'} data-ai-hint="product avatar" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <AvatarFallback>
                  {activity.product_name?.charAt(0).toUpperCase() || (activity.type === 'sale' ? 'S' : 'A')}
                </AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">
                  {activity.product_name && <span className="font-semibold">{activity.product_name}</span>}
                  <span className={cn('ml-2 capitalize text-xs font-semibold', 
                    activity.type === 'sale' && 'text-accent-foreground',
                    activity.type === 'update' && 'text-blue-500',
                    activity.type === 'new' && 'text-purple-500',
                    activity.type === 'delete' && 'text-destructive',
                    activity.type === 'purchase' && 'text-green-600 dark:text-green-500',
                    activity.type === 'credit_settled' && 'text-green-600 dark:text-green-500',
                    activity.type === 'check_cleared' && 'text-green-600 dark:text-green-500',
                    activity.type === 'check_rejected' && 'text-destructive',
                  )}>({activity.type.replace('_', ' ')})</span>
                </p>
                <p className="text-sm text-muted-foreground">{activity.details}</p>
              </div>
              <div className="ml-auto text-sm text-muted-foreground">
                 <ActivityTime timestamp={activity.timestamp} />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  );
}
