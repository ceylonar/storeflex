
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
import type { Product, ProductTransaction } from '@/lib/types';
import { fetchProductHistory } from '@/lib/queries';
import { Loader2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { FormattedDate } from '../ui/formatted-date';

interface ProductHistoryProps {
    selectedProduct: Product | null;
}

export function ProductHistory({ selectedProduct }: ProductHistoryProps) {
  const [transactions, setTransactions] = React.useState<ProductTransaction[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (selectedProduct) {
      setIsLoading(true);
      fetchProductHistory(selectedProduct.id)
        .then(setTransactions)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setTransactions([]);
    }
  }, [selectedProduct]);

  if (!selectedProduct) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Product History</CardTitle>
                <CardDescription>
                Select a product from the table above to view its transaction history.
                </CardDescription>
            </CardHeader>
        </Card>
    );
  }

  if (isLoading) {
    return (
        <Card>
             <CardHeader>
                <CardTitle>Transaction History for {selectedProduct.name}</CardTitle>
                <CardDescription>Loading transaction history...</CardDescription>
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
        <CardTitle>Transaction History for {selectedProduct.name}</CardTitle>
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground mt-2">
            <div className="flex flex-col">
                <span className="font-semibold">Available Stock</span>
                <span className="text-lg font-bold text-foreground">{selectedProduct.stock} units</span>
            </div>
            <div className="flex flex-col">
                <span className="font-semibold">Current Cost Price</span>
                <span className="text-lg font-bold text-foreground">LKR {selectedProduct.cost_price.toFixed(2)}</span>
            </div>
        </div>
        <CardDescription className="pt-4">
          A log of all sales and purchases for this product.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No transactions recorded for this product yet.</p>
        ) : (
             <ScrollArea className="h-[60vh]">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Unit Price/Cost</TableHead>
                            <TableHead>Details</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.map((tx, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                        'font-semibold capitalize',
                                        tx.type === 'sale' && 'border-accent text-accent-foreground',
                                        tx.type === 'purchase' && 'border-green-500 text-green-600 dark:text-green-500',
                                        tx.type === 'loss' && 'border-destructive text-destructive'
                                        )}
                                    >
                                        {tx.type}
                                    </Badge>
                                </TableCell>
                                <TableCell><FormattedDate timestamp={tx.date} /></TableCell>
                                <TableCell className={cn(tx.type === 'sale' || tx.type === 'loss' ? 'text-destructive' : 'text-green-600 dark:text-green-500')}>
                                    {tx.type === 'sale' || tx.type === 'loss' ? '-' : '+'}{tx.quantity}
                                </TableCell>
                                <TableCell>LKR {tx.price.toFixed(2)}</TableCell>
                                <TableCell>{tx.source_or_destination}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
