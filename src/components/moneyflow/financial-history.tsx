
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
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle, HandCoins, Scroll, XCircle } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

function FormattedDate({ timestamp }: { timestamp: string }) {
    const [date, setDate] = React.useState('');

    React.useEffect(() => {
        if(timestamp && !isNaN(new Date(timestamp).getTime())) {
            try {
                setDate(format(new Date(timestamp), 'PPP p'));
            } catch (error) {
                console.error("Failed to format date:", error);
                setDate("Invalid Date");
            }
        } else {
            setDate("Not available");
        }
    }, [timestamp]);

    return <>{date || '...'}</>;
}

const activityIcons: Record<RecentActivity['type'], React.ElementType> = {
    sale: Scroll,
    purchase: Scroll,
    update: Scroll,
    new: Scroll,
    delete: Scroll,
    credit_settled: HandCoins,
    check_cleared: CheckCircle,
    check_rejected: XCircle,
}


export function FinancialHistory({ initialHistory }: { initialHistory: RecentActivity[] }) {
  if (!initialHistory || initialHistory.length === 0) {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>
                      A log of your settled credit payments and check clearances will appear here.
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
          A log of recently settled credit payments and checks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[40vh]">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[100px]">Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead className="text-right">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {initialHistory.map((activity) => {
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
