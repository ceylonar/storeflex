
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import type { Product, TopSellingProduct } from '@/lib/types';
import { DollarSign, Package, ShoppingCart, Users, CreditCard, ArrowDownLeft, Briefcase, Receipt, ArrowUpRight } from 'lucide-react';

const icons = {
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Briefcase,
  Receipt,
};

interface StatCardProps {
  title: string;
  value: string;
  iconName: keyof typeof icons;
  description?: string;
  href?: string;
}

export function StatCard({ title, value, iconName, description, href }: StatCardProps) {
  const Icon = icons[iconName];
  
  const cardContent = (
      <Card className="h-full transition-all hover:bg-secondary">
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

  if (href) {
    return <Link href={href} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-lg">{cardContent}</Link>;
  }

  return cardContent;
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
         {products.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            <p>No low stock items. Well done!</p>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
