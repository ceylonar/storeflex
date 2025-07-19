
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
import type { Sale, Customer } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { fetchSalesByCustomer } from '@/lib/queries';
import { Loader2 } from 'lucide-react';

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

interface SalesHistoryProps {
    selectedCustomer: Customer | null;
}

export function SalesHistory({ selectedCustomer }: SalesHistoryProps) {
  const [sales, setSales] = React.useState<Sale[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (selectedCustomer) {
      setIsLoading(true);
      fetchSalesByCustomer(selectedCustomer.id)
        .then(setSales)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setSales([]);
    }
  }, [selectedCustomer]);

  if (!selectedCustomer) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Sales History</CardTitle>
                <CardDescription>
                Select a customer from the table above to view their sales history.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  if (isLoading) {
    return (
        <Card>
             <CardHeader>
                <CardTitle>Sales History for {selectedCustomer.name}</CardTitle>
                <CardDescription>Loading sales history...</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </CardContent>
        </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales History for {selectedCustomer.name}</CardTitle>
        <CardDescription>
          A history of all items purchased by this customer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No sales recorded for this customer yet.</p>
        ) : (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                    Image
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sales.flatMap((sale) => 
                    sale.items.map(item => (
                        <TableRow key={`${sale.id}-${item.id}`}>
                            <TableCell className="hidden sm:table-cell">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={item.image || 'https://placehold.co/40x40.png'} alt={item.name} data-ai-hint="product avatar" />
                                <AvatarFallback>
                                    {item.name?.charAt(0).toUpperCase() || 'P'}
                                </AvatarFallback>
                            </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">{item.name}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>LKR {item.price_per_unit.toFixed(2)}</TableCell>
                            <TableCell>LKR {item.total_amount.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                                <FormattedDate timestamp={sale.sale_date} />
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
            </Table>
        )}
      </CardContent>
    </Card>
  );
}
