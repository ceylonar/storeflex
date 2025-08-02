

'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RecentActivity } from '@/lib/types';
import { cn } from '@/lib/utils';
import { CheckCircle, HandCoins, Scroll, ShoppingCart, Truck, XCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { FormattedDate } from '../ui/formatted-date';

const activityIcons: Record<RecentActivity['type'], React.ElementType> = {
    sale: ShoppingCart,
    purchase: Truck,
    update: Scroll,
    new: Scroll,
    delete: Scroll,
    credit_settled: HandCoins,
    check_cleared: CheckCircle,
    check_rejected: XCircle,
}

interface FinancialHistoryProps {
  history: RecentActivity[];
}

export function FinancialHistory({ history }: FinancialHistoryProps) {
  if (!history || history.length === 0) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                      A log of your sales, purchases, and other financial transactions will appear here.
                  </CardDescription>
              </CardHeader>
              <CardContent>
                  <p className="text-center text-muted-foreground py-8">No financial history found.</p>
              </CardContent>
          </Card>
      )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          A log of sales, purchases, and other financial transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[40vh]">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[120px]">Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {history.map((activity) => {
                    const Icon = activityIcons[activity.type] || Scroll;
                    return (
                        <TableRow key={activity.id}>
                            <TableCell>
                            <Badge
                                variant="outline"
                                className={cn(
                                'font-semibold capitalize',
                                activity.type === 'credit_settled' && 'border-green-500 text-green-600',
                                activity.type === 'check_cleared' && 'border-green-500 text-green-600',
                                activity.type === 'check_rejected' && 'border-destructive text-destructive',
                                activity.type === 'sale' && 'border-accent text-accent-foreground',
                                activity.type === 'purchase' && 'border-blue-500 text-blue-500',
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <Icon className="h-3 w-3" />
                                    <span>{activity.type.replace('_', ' ')}</span>
                                </div>
                            </Badge>
                            </TableCell>
                            <TableCell>{activity.details}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">
                            <FormattedDate timestamp={activity.timestamp} />
                            </TableCell>
                        </TableRow>
                    )
                })}
            </TableBody>
            </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
