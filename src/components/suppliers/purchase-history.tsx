
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
import type { Purchase, Supplier } from '@/lib/types';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { fetchPurchasesBySupplier } from '@/lib/queries';
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

interface PurchaseHistoryProps {
    selectedSupplier: Supplier | null;
}

export function PurchaseHistory({ selectedSupplier }: PurchaseHistoryProps) {
  const [purchases, setPurchases] = React.useState<Purchase[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (selectedSupplier) {
      setIsLoading(true);
      fetchPurchasesBySupplier(selectedSupplier.id)
        .then(setPurchases)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setPurchases([]);
    }
  }, [selectedSupplier]);

  if (!selectedSupplier) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Purchase History</CardTitle>
                <CardDescription>
                Select a supplier from the table above to view their purchase history.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  if (isLoading) {
    return (
        <Card>
             <CardHeader>
                <CardTitle>Purchase History for {selectedSupplier.name}</CardTitle>
                <CardDescription>Loading purchase history...</CardDescription>
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
        <CardTitle>Purchase History for {selectedSupplier.name}</CardTitle>
        <CardDescription>
          A history of all items purchased from this supplier.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {purchases.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No purchases recorded for this supplier yet.</p>
        ) : (
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                    <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead className="text-right">Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {purchases.flatMap((purchase) => 
                    purchase.items.map(item => (
                        <TableRow key={`${purchase.id}-${item.id}`}>
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
                            <TableCell>LKR {item.cost_price.toFixed(2)}</TableCell>
                            <TableCell className="text-right">
                            <FormattedDate timestamp={purchase.purchase_date} />
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
