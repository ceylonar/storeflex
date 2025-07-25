
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

import { Button } from '@/components/ui/button';
import { Loader2, Download, Calendar as CalendarIcon, Filter, X } from 'lucide-react';
import type { RecentActivity, ProductSelect, DetailedRecord, SaleItem, PurchaseItem } from '@/lib/types';
import { fetchInventoryRecords } from '@/lib/queries';
import { fetchDetailedRecordsForExport } from '@/lib/actions';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';

interface RecordsClientProps {
  initialRecords: RecentActivity[];
  products: ProductSelect[];
}

export function RecordsClient({ initialRecords, products }: RecordsClientProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>();
  const [type, setType] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [records, setRecords] = useState<RecentActivity[]>([]);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    fetchInventoryRecords({}).then(data => {
        setRecords(data);
        setIsLoading(false);
    }).catch(() => {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load records.' });
        setIsLoading(false);
    });
  }, [toast]);

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
    toast({ title: 'Preparing Download', description: 'Fetching detailed records for export...' });

    try {
        const detailedRecords = await fetchDetailedRecordsForExport({ date, type, productId });
        
        const headers = [
          'Transaction ID', 'Date', 'Type', 'Product Name', 'SKU', 'Quantity', 'Unit Price (LKR)', 'Total Amount (LKR)', 'Details'
        ];
        
        const csvRows = detailedRecords.flatMap((rec: DetailedRecord) => {
            if ((rec.type === 'sale' || rec.type === 'purchase') && rec.items && rec.items.length > 0) {
                return rec.items.map(item => {
                    const isSale = rec.type === 'sale';
                    const saleItem = item as SaleItem;
                    const purchaseItem = item as PurchaseItem;
                    const quantity = isSale ? -saleItem.quantity : `+${purchaseItem.quantity}`;
                    const unitPrice = isSale ? saleItem.price_per_unit : purchaseItem.cost_price;
                    const totalAmount = isSale ? (saleItem.price_per_unit * saleItem.quantity) : purchaseItem.total_cost;
                    const details = isSale ? `Sale to ${rec.details}` : `Purchase from ${rec.details}`;

                    return [
                        rec.id,
                        format(new Date(rec.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                        rec.type,
                        `"${item.name}"`,
                        `"${item.sku || ''}"`,
                        quantity,
                        unitPrice.toFixed(2),
                        totalAmount.toFixed(2),
                        `"${details}"`
                    ].join(',');
                });
            }
            // For other types or if items are missing
            return [[
                rec.id,
                format(new Date(rec.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                rec.type,
                `"${rec.product_name}"`,
                `"${rec.product_sku || ''}"`,
                '', // Quantity
                '', // Unit Price
                '', // Total
                `"${rec.details}"`,
            ].join(',')];
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `inventory_records_${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: 'Download Started', description: 'Your inventory report is being downloaded.' });

    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Download Failed',
            description: (error as Error).message || 'Could not generate the detailed report.',
        });
    } finally {
        setIsDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter Records</CardTitle>
          <CardDescription>Select filters and generate a targeted report.</CardDescription>
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
                <CardTitle>Activity Log</CardTitle>
                <CardDescription>
                    {`Displaying ${records.length} of all inventory transactions.`}
                </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={records.length === 0 || isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4"/>}
                Download CSV
            </Button>
        </CardHeader>
        <CardContent>
            {isLoading || isPending ? (
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
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="hidden w-[80px] sm:table-cell">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Date</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {records.length > 0 ? records.map((activity) => (
                            <TableRow key={activity.id}>
                                <TableCell className="hidden sm:table-cell">
                                <Avatar className="h-12 w-12 rounded-md">
                                    <AvatarImage src={activity.product_image || 'https://placehold.co/64x64.png'} alt={activity.product_name} data-ai-hint="product image" className="aspect-square object-cover" />
                                    <AvatarFallback>{activity.product_name?.charAt(0) || 'P'}</AvatarFallback>
                                </Avatar>
                                </TableCell>
                                <TableCell className="font-medium">{activity.product_name}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'font-semibold capitalize',
                                      activity.type === 'sale' && 'border-accent text-accent-foreground',
                                      activity.type === 'update' && 'border-blue-500 text-blue-500',
                                      activity.type === 'new' && 'border-purple-500 text-purple-500',
                                      activity.type === 'delete' && 'border-destructive text-destructive',
                                      activity.type === 'purchase' && 'border-green-500 text-green-600 dark:text-green-500'
                                    )}
                                  >
                                    {activity.type}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{activity.details}</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">{format(new Date(activity.timestamp), 'PPP p')}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No records found for the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    
