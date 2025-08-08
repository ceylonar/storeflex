
'use client';

import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { SalesOrder, PurchaseOrder } from '@/lib/types';
import { ShoppingCart, Package, ArrowRight } from 'lucide-react';
import { FormattedDate } from '../ui/formatted-date';

interface PendingOrdersCardProps {
  salesOrders: (SalesOrder & { type: 'sale' })[];
  purchaseOrders: (PurchaseOrder & { type: 'purchase' })[];
}

export function PendingOrdersCard({ salesOrders, purchaseOrders }: PendingOrdersCardProps) {
  const totalSalesOrders = salesOrders.length;
  const totalPurchaseOrders = purchaseOrders.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Orders</CardTitle>
        <CardDescription>
          A summary of outstanding sales and purchase orders that need to be processed.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <ShoppingCart className="h-5 w-5" />
                    <h3 className="font-semibold">Sales Orders</h3>
                </div>
                <p className="text-2xl font-bold mt-2">{totalSalesOrders}</p>
                 {salesOrders.slice(0, 2).map(order => (
                    <div key={order.id} className="text-xs mt-2 p-2 bg-background/50 rounded">
                        <p className="font-medium truncate">{order.id} to {order.customer_name}</p>
                        <p className="text-muted-foreground">
                            <FormattedDate timestamp={order.order_date} formatString="MMM dd, yyyy" /> - LKR {order.total_amount.toFixed(2)}
                        </p>
                    </div>
                ))}
            </div>
             <div className="p-4 rounded-lg bg-secondary">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Package className="h-5 w-5" />
                    <h3 className="font-semibold">Purchase Orders</h3>
                </div>
                <p className="text-2xl font-bold mt-2">{totalPurchaseOrders}</p>
                {purchaseOrders.slice(0, 2).map(order => (
                    <div key={order.id} className="text-xs mt-2 p-2 bg-background/50 rounded">
                        <p className="font-medium truncate">{order.id} from {order.supplier_name}</p>
                         <p className="text-muted-foreground">
                            <FormattedDate timestamp={order.order_date} formatString="MMM dd, yyyy" /> - LKR {order.total_amount.toFixed(2)}
                        </p>
                    </div>
                ))}
            </div>
        </div>

      </CardContent>
       <CardFooter>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/dashboard/orders">
              Manage All Orders <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
      </CardFooter>
    </Card>
  );
}
