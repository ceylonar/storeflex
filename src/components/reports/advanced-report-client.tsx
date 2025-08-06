
'use client';

import { useState, useTransition, useEffect } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { Button } from '@/components/ui/button';
import { Loader2, Download, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import type { ProductSelect, DetailedRecord, SaleItem, PurchaseItem } from '@/lib/types';
import { fetchInventoryRecords } from '@/lib/queries';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { FormattedDate } from '../ui/formatted-date';


interface AdvancedReportClientProps {
  initialRecords: DetailedRecord[];
  products: ProductSelect[];
}

export function AdvancedReportClient({ initialRecords, products }: AdvancedReportClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>();
  const [type, setType] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [records, setRecords] = useState<DetailedRecord[]>(initialRecords);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if(initialRecords) {
        setRecords(initialRecords);
    }
  }, [initialRecords]);

  const handleGenerateReport = () => {
    startTransition(async () => {
      const result = await fetchInventoryRecords({ date, type, productId });
      setRecords(result);
      toast({
          title: 'Records Filtered',
          description: `Found ${result.length} matching records.`,
      });
    });
  };

  const clearFilters = () => {
    setDate(undefined);
    setType('');
    setProductId('');
    startTransition(async () => {
      const result = await fetchInventoryRecords({});
      setRecords(result);
      toast({
          title: 'Filters Cleared',
          description: 'Showing all records.',
      });
    });
  }

  const handleDownload = async () => {
    if (!records || records.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Data',
            description: 'There is no data to download.',
        });
        return;
    }
    
    setIsDownloading(true);
    toast({ title: 'Preparing Download', description: 'Generating detailed report for export...' });

    try {
        const detailedRecords = await fetchInventoryRecords({ date, type, productId });
        
        const headers = [
          'Transaction ID', 'Date', 'Type', 'Product Name', 'SKU', 'Quantity', 'Unit Price (LKR)', 'Total Amount (LKR)', 'Details'
        ];
        
        const csvRows = detailedRecords.flatMap((rec: DetailedRecord) => {
            if ((rec.type === 'sale' || rec.type === 'purchase' || rec.type === 'sale_return' || rec.type === 'purchase_return') && rec.items && rec.items.length > 0) {
                 return rec.items.map(item => {
                    const isSale = rec.type === 'sale';
                    const isPurchase = rec.type === 'purchase';
                    const isSaleReturn = rec.type === 'sale_return';
                    const isPurchaseReturn = rec.type === 'purchase_return';

                    let quantity = 0;
                    let unitPrice = 0;
                    let totalAmount = 0;

                    if (isSale) {
                        const saleItem = item as SaleItem;
                        quantity = -saleItem.quantity;
                        unitPrice = saleItem.price_per_unit;
                        totalAmount = saleItem.total_amount;
                    } else if (isPurchase) {
                        const purchaseItem = item as PurchaseItem;
                        quantity = purchaseItem.quantity;
                        unitPrice = purchaseItem.cost_price;
                        totalAmount = purchaseItem.total_cost;
                    } else if (isSaleReturn) {
                        const returnItem = item as any; // SaleReturnItem
                        quantity = returnItem.return_quantity;
                        unitPrice = returnItem.price_per_unit;
                        totalAmount = unitPrice * quantity;
                    } else if (isPurchaseReturn) {
                        const returnItem = item as any; // PurchaseReturnItem
                        quantity = -returnItem.return_quantity;
                        unitPrice = returnItem.cost_price;
                        totalAmount = unitPrice * Math.abs(quantity);
                    }
                    
                    return [
                        rec.id,
                        format(new Date(rec.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                        rec.type.replace('_', ' '),
                        `"${item.name}"`,
                        `"${item.sku || ''}"`,
                        quantity,
                        unitPrice.toFixed(2),
                        totalAmount.toFixed(2),
                        `"${rec.details}"`
                    ].join(',');
                });
            }
            
            // Handle non-transactional records
            return [[
                rec.id,
                format(new Date(rec.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                rec.type,
                `"${rec.product_name || ''}"`,
                `"${rec.product_sku || ''}"`,
                'N/A', // Quantity
                'N/A', // Unit Price
                'N/A', // Total Amount
                `"${rec.details}"`,
            ].join(',')];
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `storeflex_report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Download Started', description: 'Your report is being downloaded.' });

    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Download Failed',
            description: (error as Error).message || 'Could not generate the report.',
        });
    } finally {
        setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter Report</CardTitle>
          <CardDescription>Select filters and generate a targeted report of inventory activities.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
           <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-full sm:w-[300px] justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date?.from ? (
                  date.to ? (
                    <>
                      {format(date.from, "LLL dd, y")} -{" "}
                      {format(date.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(date.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Type" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="new">New Product</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                 <SelectItem value="sale_return">Sale Return</SelectItem>
                <SelectItem value="purchase_return">Purchase Return</SelectItem>
            </SelectContent>
          </Select>

          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue placeholder="Filter by Product" />
            </SelectTrigger>
            <SelectContent>
                {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>


          <Button onClick={handleGenerateReport} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Filter className="mr-2 h-4 w-4" />
            )}
            Apply Filters
          </Button>

           <Button onClick={clearFilters} variant="ghost" disabled={isPending}>
              <X className="mr-2 h-4 w-4" />
              Clear
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Report Results</CardTitle>
                <CardDescription>
                    {`Displaying ${records.length} of all matching transactions.`}
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={records.length === 0 || isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4"/>}
                Download CSV
            </Button>
        </CardHeader>
        <CardContent>
            {isPending ? (
                 <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center space-x-4 p-2">
                            <Skeleton className="h-12 w-12 rounded-md" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-1/2" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                            <Skeleton className="h-4 w-24" />
                        </div>
                    ))}
                </div>
            ) : (
                <ScrollArea className="h-[60vh]">
                    <Accordion type="single" collapsible className="w-full">
                        {records.length > 0 ? records.map((activity) => (
                            <AccordionItem value={activity.id} key={activity.id}>
                                <AccordionTrigger className="p-4 text-sm hover:no-underline">
                                    <div className="flex items-center gap-4 w-full">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                            'w-32 justify-center font-semibold capitalize',
                                            activity.type === 'sale' && 'border-accent text-accent-foreground',
                                            activity.type === 'update' && 'border-blue-500 text-blue-500',
                                            activity.type === 'new' && 'border-purple-500 text-purple-500',
                                            activity.type === 'delete' && 'border-destructive text-destructive',
                                            activity.type === 'purchase' && 'border-green-500 text-green-600 dark:text-green-500',
                                            (activity.type === 'sale_return' || activity.type === 'purchase_return') && 'border-yellow-500 text-yellow-600 dark:text-yellow-500'
                                            )}
                                        >
                                            {activity.type.replace('_', ' ')}
                                        </Badge>
                                        <span className="flex-1 text-left font-medium">
                                            {activity.type === 'sale' || activity.type === 'purchase' || activity.type === 'sale_return' || activity.type === 'purchase_return' ? activity.details : activity.product_name}
                                        </span>
                                        <span className="text-muted-foreground"><FormattedDate timestamp={activity.timestamp} /></span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 pt-0 pl-16">
                                     {activity.items && activity.items.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead>Quantity</TableHead>
                                                    <TableHead>Unit Price</TableHead>
                                                    <TableHead className="text-right">Total</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {activity.items.map((item, index) => {
                                                    let quantity = 0, unitPrice = 0, total = 0;
                                                    if(activity.type === 'sale'){
                                                        const saleItem = item as SaleItem;
                                                        quantity = saleItem.quantity;
                                                        unitPrice = saleItem.price_per_unit;
                                                        total = saleItem.total_amount;
                                                    } else if(activity.type === 'purchase') {
                                                        const purchaseItem = item as PurchaseItem;
                                                        quantity = purchaseItem.quantity;
                                                        unitPrice = purchaseItem.cost_price;
                                                        total = purchaseItem.total_cost;
                                                    } else if (activity.type === 'sale_return' || activity.type === 'purchase_return') {
                                                        const returnItem = item as any;
                                                        quantity = returnItem.return_quantity;
                                                        unitPrice = returnItem.price_per_unit || returnItem.cost_price;
                                                        total = quantity * unitPrice;
                                                    }

                                                    return (
                                                        <TableRow key={`${activity.id}-${index}`}>
                                                            <TableCell className="font-medium">{item.name}</TableCell>
                                                            <TableCell>{quantity}</TableCell>
                                                            <TableCell>LKR {unitPrice.toFixed(2)}</TableCell>
                                                            <TableCell className="text-right">LKR {total.toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    )
                                                })}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <p className="text-muted-foreground">{activity.details}</p>
                                    )}
                                </AccordionContent>
                            </AccordionItem>
                        )) : (
                           <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                                No records found for the selected filters.
                            </div>
                        )}
                    </Accordion>
                </ScrollArea>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
