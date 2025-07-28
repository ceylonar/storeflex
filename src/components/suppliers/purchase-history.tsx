
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

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
        .catch((err) => {
            console.error(err)
        })
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
            <ScrollArea className="h-[60vh]">
              <Accordion type="single" collapsible className="w-full">
                {purchases.map((purchase) => (
                    <AccordionItem value={purchase.id} key={purchase.id} className="border-b">
                        <AccordionTrigger className="p-4 hover:no-underline">
                            <div className="flex justify-between w-full">
                                <div className="text-left">
                                    <p className="font-semibold text-primary">Purchase ID: {purchase.id}</p>
                                    <p className="text-sm text-muted-foreground"><FormattedDate timestamp={purchase.purchase_date} /></p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">LKR {(purchase.total_amount || 0).toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">{(purchase.items || []).length} item(s)</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                           <div className="space-y-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[60px] sm:table-cell">Image</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Unit Cost</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(purchase.items || []).map(item => (
                                            <TableRow key={`${purchase.id}-${item.id}`}>
                                                <TableCell className="hidden sm:table-cell">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={item.image || 'https://placehold.co/40x40.png'} alt={item.name} data-ai-hint="product avatar" />
                                                    <AvatarFallback>{item.name?.charAt(0).toUpperCase() || 'P'}</AvatarFallback>
                                                </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>LKR {(item.cost_price || 0).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">LKR {(item.total_cost || 0).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <div className="max-w-sm ml-auto space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>LKR {(purchase.subtotal || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Service Charge</span><span>LKR {(purchase.service_charge || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Tax ({(purchase.tax_percentage || 0)}%)</span><span>LKR {(purchase.tax_amount || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between text-destructive"><span >Discount</span><span>- LKR {(purchase.discount_amount || 0).toFixed(2)}</span></div>
                                    <div className="flex justify-between border-t pt-2 font-bold"><span >Total Cost</span><span>LKR {(purchase.total_amount || 0).toFixed(2)}</span></div>
                                    <Separator className="my-1" />
                                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="capitalize">{purchase.paymentMethod}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span>LKR {(purchase.amountPaid || 0).toFixed(2)}</span></div>
                                    {(purchase.creditAmount || 0) > 0 && (
                                        <div className="flex justify-between font-semibold text-green-600"><span >Credit Received</span><span>LKR {(purchase.creditAmount || 0).toFixed(2)}</span></div>
                                    )}
                                </div>
                           </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
