
'use client';

import { useState, useTransition } from 'react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

import { Button } from '@/components/ui/button';
import { Loader2, Download, Calendar as CalendarIcon, Filter, X, ChevronDown, ChevronRight, User, ShoppingCart, Truck, Repeat, Scroll } from 'lucide-react';
import type { ProductSelect, DetailedRecord, Customer, Supplier } from '@/lib/types';
import { fetchInventoryRecords } from '@/lib/queries';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { FormattedDate } from '../ui/formatted-date';


interface AdvancedReportClientProps {
  initialRecords: DetailedRecord[];
  products: ProductSelect[];
  customers: Customer[];
  suppliers: Supplier[];
}

const getRecordIcon = (type: DetailedRecord['type']) => {
    switch (type) {
        case 'sale': return ShoppingCart;
        case 'purchase': return Truck;
        case 'sale_return': return Repeat;
        case 'purchase_return': return Repeat;
        default: return Scroll;
    }
}

const getRecordTitle = (record: DetailedRecord) => {
    switch (record.type) {
      case 'sale': return `Sale to ${record.partyName}`;
      case 'purchase': return `Purchase from ${record.partyName}`;
      case 'sale_return': return `Return from ${record.partyName}`;
      case 'purchase_return': return `Return to ${record.partyName}`;
      case 'credit_settled': return `Credit Settlement`;
      case 'check_cleared': return `Check Cleared`;
      case 'check_rejected': return `Check Rejected`;
      case 'new': return `Product Created`;
      case 'update': return `Product Updated`;
      case 'delete': return `Product Deleted`;
      default: return record.details || 'System Activity';
    }
};

const getRecordAmount = (record: DetailedRecord) => {
    if (record.transaction?.total_amount) {
        return `LKR ${record.transaction.total_amount.toFixed(2)}`;
    }
    if (record.type === 'sale_return' && record.transaction?.total_refund_amount) {
        return `LKR ${record.transaction.total_refund_amount.toFixed(2)}`;
    }
     if (record.type === 'purchase_return' && record.transaction?.total_credit_amount) {
        return `LKR ${record.transaction.total_credit_amount.toFixed(2)}`;
    }
    return 'N/A';
};


export function AdvancedReportClient({ initialRecords, products, customers, suppliers }: AdvancedReportClientProps) {
  const [date, setDate] = useState<DateRange | undefined>();
  const [type, setType] = useState<string>('');
  const [productId, setProductId] = useState<string>('');
  const [partyId, setPartyId] = useState<string>('');
  const [records, setRecords] = useState<DetailedRecord[]>(initialRecords);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = () => {
    startTransition(async () => {
      const result = await fetchInventoryRecords({ date, type, productId, partyId });
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
    setPartyId('');
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
        toast({ variant: 'destructive', title: 'No Data', description: 'There is no data to download.' });
        return;
    }
    setIsDownloading(true);
    toast({ title: 'Preparing Download', description: 'Generating detailed report for export...' });

    try {
        const detailedRecords = await fetchInventoryRecords({ date, type, productId, partyId });
        const headers = [
          'Transaction ID', 'Date', 'Type', 'Party', 'Product Name', 'SKU', 'Quantity', 'Unit Price (LKR)', 'Total Amount (LKR)', 'Payment Method', 'Amount Paid (LKR)', 'Balance Change (LKR)', 'Details'
        ];
        
        const csvRows = detailedRecords.flatMap((rec: DetailedRecord) => {
            const commonData = [
                rec.id,
                format(new Date(rec.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                rec.type.replace(/_/g, ' '),
                `"${rec.partyName || 'N/A'}"`,
            ];

            if (rec.items && rec.items.length > 0) {
                return rec.items.map(item => {
                    const trans = rec.transaction;
                    const paymentMethod = trans?.paymentMethod || (rec.type.includes('return') ? (rec.transaction as any).refund_method || 'credit_balance' : 'N/A');
                    const amountPaid = trans?.amountPaid?.toFixed(2) || '0.00';
                    const balanceChange = trans?.creditAmount?.toFixed(2) || '0.00';
                    const totalAmount = trans?.total_amount?.toFixed(2) || '0.00';

                    const itemDetails = {
                        name: item.name || 'N/A',
                        sku: item.sku || 'N/A',
                        quantity: '0',
                        unitPrice: '0.00',
                        itemTotal: '0.00'
                    };

                    if ('quantity' in item) itemDetails.quantity = `${item.quantity}`;
                    if ('return_quantity' in item) itemDetails.quantity = `${item.return_quantity}`;
                    
                    if ('price_per_unit' in item) itemDetails.unitPrice = item.price_per_unit.toFixed(2);
                    if ('cost_price' in item) itemDetails.unitPrice = item.cost_price.toFixed(2);

                    if ('total_amount' in item) itemDetails.itemTotal = item.total_amount.toFixed(2);
                    if ('total_cost' in item) itemDetails.itemTotal = item.total_cost.toFixed(2);
                    
                    if (rec.type.includes('return')) {
                        const quantity = 'return_quantity' in item ? item.return_quantity : 0;
                        const price = 'price_per_unit' in item ? item.price_per_unit : ('cost_price' in item ? item.cost_price : 0);
                        itemDetails.itemTotal = (quantity * price).toFixed(2);
                    }

                    return [
                        ...commonData,
                        `"${itemDetails.name}"`, `"${itemDetails.sku}"`, itemDetails.quantity, itemDetails.unitPrice, itemDetails.itemTotal,
                        paymentMethod, amountPaid, balanceChange, `"${rec.details || ''}"`
                    ].join(',');
                });
            }

            // Handle non-item activities
            return [[
                ...commonData,
                `"${rec.product_name || 'N/A'}"`, 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', `"${rec.details || ''}"`
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
        toast({ variant: 'destructive', title: 'Download Failed', description: (error as Error).message || 'Could not generate the report.' });
    } finally {
        setIsDownloading(false);
    }
  }


  const allParties = [
    ...customers.map(c => ({ value: `customer_${c.id}`, label: `Customer: ${c.name}` })),
    ...suppliers.map(s => ({ value: `supplier_${s.id}`, label: `Supplier: ${s.name}` }))
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filter Report</CardTitle>
          <CardDescription>Select filters and generate a targeted report of inventory activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button id="date" variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (date.to ? (<>{format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}</>) : (format(date.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2}/>
              </PopoverContent>
            </Popover>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue placeholder="Filter by Type" /></SelectTrigger>
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
              <SelectTrigger><SelectValue placeholder="Filter by Product" /></SelectTrigger>
              <SelectContent>{products.map(p => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
            </Select>
            <Select value={partyId} onValueChange={setPartyId}>
              <SelectTrigger><SelectValue placeholder="Filter by Customer/Supplier" /></SelectTrigger>
              <SelectContent>{allParties.map(p => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}</SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={handleGenerateReport} disabled={isPending} className="w-full">
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />} Apply
              </Button>
              <Button onClick={clearFilters} variant="ghost" disabled={isPending} className="w-full">
                <X className="mr-2 h-4 w-4" /> Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Report Results</CardTitle>
                <CardDescription>{`Displaying ${records.length} matching transactions.`}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownload} disabled={records.length === 0 || isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4"/>} Download CSV
            </Button>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh] border-t">
                 {isPending ? (
                    <div className="space-y-4 p-4">
                        {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}
                    </div>
                ) : records.length > 0 ? (
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Transaction</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Party</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {records.map(record => (
                                <Collapsible asChild key={record.id}>
                                    <>
                                        <TableRow>
                                            <TableCell>
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={!record.items || record.items.length === 0}>
                                                        <ChevronRight className="h-4 w-4 transition-transform [&[data-state=open]]:rotate-90" />
                                                    </Button>
                                                </CollapsibleTrigger>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{getRecordTitle(record)}</div>
                                                <div className="text-sm text-muted-foreground font-mono">{record.id}</div>
                                            </TableCell>
                                            <TableCell><FormattedDate timestamp={record.timestamp} /></TableCell>
                                            <TableCell>{record.partyName || 'N/A'}</TableCell>
                                            <TableCell className="max-w-xs truncate">{record.details}</TableCell>
                                            <TableCell className="text-right font-medium">{getRecordAmount(record)}</TableCell>
                                        </TableRow>
                                        <CollapsibleContent asChild>
                                            <TableRow>
                                                <TableCell colSpan={6} className="p-0">
                                                    <div className="p-4 bg-muted/50">
                                                        <h4 className="font-semibold mb-2 ml-4">Items in Transaction</h4>
                                                         <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    <TableHead>Product</TableHead>
                                                                    <TableHead>SKU</TableHead>
                                                                    <TableHead>Quantity</TableHead>
                                                                    <TableHead>Unit Price</TableHead>
                                                                    <TableHead className="text-right">Total</TableHead>
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {record.items?.map((item, index) => {
                                                                    const quantity = 'quantity' in item ? item.quantity : ('return_quantity' in item ? item.return_quantity : 0);
                                                                    const price = 'price_per_unit' in item ? item.price_per_unit : ('cost_price' in item ? item.cost_price : 0);
                                                                    const total = 'total_amount' in item ? item.total_amount : ('total_cost' in item ? item.total_cost : quantity * price);
                                                                    
                                                                    return(
                                                                        <TableRow key={`${record.id}-${index}`}>
                                                                            <TableCell>{item.name}</TableCell>
                                                                            <TableCell>{item.sku || 'N/A'}</TableCell>
                                                                            <TableCell>{quantity}</TableCell>
                                                                            <TableCell>LKR {price.toFixed(2)}</TableCell>
                                                                            <TableCell className="text-right">LKR {total.toFixed(2)}</TableCell>
                                                                        </TableRow>
                                                                    )
                                                                })}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        </CollapsibleContent>
                                    </>
                                </Collapsible>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="h-24 text-center flex items-center justify-center text-muted-foreground">
                        No records found for the selected filters.
                    </div>
                )}
            </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
