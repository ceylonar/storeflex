
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
import type { Sale, Customer } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { fetchSalesByCustomer } from '@/lib/queries';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { FormattedDate } from '../ui/formatted-date';
import type { SelectableCustomer } from './customers-client';


interface SalesHistoryProps {
    selectedCustomer: SelectableCustomer | null;
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
          A history of all transactions for this customer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sales.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No sales recorded for this customer yet.</p>
        ) : (
            <ScrollArea className="h-[60vh]">
              <Accordion type="single" collapsible className="w-full">
                {sales.map((sale) => (
                    <AccordionItem value={sale.id} key={sale.id} className="border-b">
                        <AccordionTrigger className="p-4 hover:no-underline">
                            <div className="flex justify-between w-full">
                                <div className="text-left">
                                    <p className="font-semibold text-primary">Sale ID: {sale.id}</p>
                                    <p className="text-sm text-muted-foreground"><FormattedDate timestamp={sale.sale_date} /></p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">LKR {sale.total_amount.toFixed(2)}</p>
                                    <p className="text-sm text-muted-foreground">{sale.items.length} item(s)</p>
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
                                            <TableHead>Unit Price</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sale.items.map(item => (
                                            <TableRow key={`${sale.id}-${item.id}`}>
                                                <TableCell className="hidden sm:table-cell">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarImage src={item.image || 'https://placehold.co/40x40.png'} alt={item.name} data-ai-hint="product avatar" />
                                                    <AvatarFallback>{item.name?.charAt(0).toUpperCase() || 'P'}</AvatarFallback>
                                                </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium">{item.name}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>LKR {item.price_per_unit.toFixed(2)}</TableCell>
                                                <TableCell className="text-right">LKR {item.total_amount.toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>

                                <div className="max-w-sm ml-auto space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>LKR {sale.subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Service Charge</span><span>LKR {sale.service_charge.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Tax ({sale.tax_percentage}%)</span><span>LKR {sale.tax_amount.toFixed(2)}</span></div>
                                    <div className="flex justify-between text-destructive"><span >Discount</span><span>- LKR {sale.discount_amount.toFixed(2)}</span></div>
                                    <div className="flex justify-between border-t pt-2 font-bold"><span >Bill Total</span><span>LKR {sale.total_amount.toFixed(2)}</span></div>
                                    <Separator className="my-1" />
                                    <div className="flex justify-between"><span className="text-muted-foreground">Payment Method</span><span className="capitalize">{sale.paymentMethod}</span></div>
                                    <div className="flex justify-between"><span className="text-muted-foreground">Amount Paid</span><span>LKR {(sale.amountPaid || 0).toFixed(2)}</span></div>
                                    {(sale.creditAmount || 0) > 0 && (
                                        <div className="flex justify-between font-semibold text-destructive"><span >Credit Added</span><span>LKR {(sale.creditAmount || 0).toFixed(2)}</span></div>
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
