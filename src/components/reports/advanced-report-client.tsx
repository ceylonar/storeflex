
'use client';

import React, { useState, useTransition } from 'react';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
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
import { Loader2, Download, Calendar as CalendarIcon, Filter, X, ChevronsUpDown, Check, ChevronDown } from 'lucide-react';
import type { ProductSelect, RecentActivity, Customer, Supplier, DetailedRecord, SaleItem, PurchaseItem, Product } from '@/lib/types';
import { fetchFinancialActivities } from '@/lib/queries';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { FormattedDate } from '../ui/formatted-date';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';


interface AdvancedReportClientProps {
  initialRecords: DetailedRecord[];
  products: ProductSelect[];
  customers: Customer[];
  suppliers: Supplier[];
}

const getRecordTitle = (record: DetailedRecord) => {
    const transaction = record.transaction as any;
    switch (record.type) {
      case 'sale': return `Sale to ${transaction?.customer_name || 'N/A'}`;
      case 'purchase': return `Purchase from ${transaction?.supplier_name || 'N/A'}`;
      case 'sale_return': return `Return from ${transaction?.customer_name || 'N/A'}`;
      case 'purchase_return': return `Return to ${transaction?.supplier_name || 'N/A'}`;
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
    const transaction = record.transaction as any;
    if (typeof transaction?.total_amount === 'number') {
        return `LKR ${transaction.total_amount.toFixed(2)}`;
    }
    if (typeof transaction?.total_refund_amount === 'number') {
        return `LKR ${transaction.total_refund_amount.toFixed(2)}`;
    }
    if (typeof transaction?.total_credit_amount === 'number') {
        return `LKR ${transaction.total_credit_amount.toFixed(2)}`;
    }
    if(typeof transaction?.amount === 'number') {
        return `LKR ${transaction.amount.toFixed(2)}`;
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
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const { toast } = useToast();
  
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [partySearchOpen, setPartySearchOpen] = useState(false);

  const handleGenerateReport = () => {
    startTransition(async () => {
      const result = await fetchFinancialActivities({ date, type, productId, partyId, full: true });
      setRecords(result as DetailedRecord[]);
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
      const result = await fetchFinancialActivities({ full: true });
      setRecords(result as DetailedRecord[]);
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
        const detailedRecords = records as DetailedRecord[];
        const headers = [
          'Transaction ID', 'Date', 'Type', 'Party', 'Product Name', 'SKU', 'Quantity', 'Unit Price (LKR)', 'Item Total (LKR)', 'Payment Method', 'Amount Paid (LKR)', 'Balance Change (LKR)', 'Details'
        ];
        
        const csvRows = detailedRecords.flatMap((rec: DetailedRecord) => {
            const commonData = [
                rec.id, 
                format(new Date(rec.timestamp), 'yyyy-MM-dd HH:mm:ss'),
                `"${rec.type.replace(/_/g, ' ')}"`,
                `"${rec.partyName || 'N/A'}"`,
            ];

            const trans = rec.transaction as any;
             if (trans && trans.items && trans.items.length > 0) {
                return trans.items.map((item: any) => {
                    const paymentMethod = trans?.paymentMethod || (rec.type.includes('return') ? (trans?.refund_method || 'credit_balance') : 'N/A');
                    const amountPaid = trans?.amountPaid?.toFixed(2) || '0.00';
                    const balanceChange = trans?.creditAmount?.toFixed(2) || '0.00';
                    const itemTotal = (item as any).total_amount || (item as any).total_cost || 0;

                    const quantity = (item as any).quantity || (item as any).return_quantity || 0;
                    const unitPrice = (item as SaleItem).price_per_unit || (item as PurchaseItem).cost_price || 0;

                    return [
                        ...commonData,
                        `"${item.name || 'N/A'}"`, `"${item.sku || 'N/A'}"`, quantity, unitPrice.toFixed(2), itemTotal.toFixed(2),
                        paymentMethod, amountPaid, balanceChange, `"${rec.details || ''}"`
                    ].join(',');
                });
            }

            const details = trans?.details || rec.details || '';
            const amountPaid = trans?.amountPaid?.toFixed(2) || (trans?.total_amount ? trans.total_amount.toFixed(2) : 'N/A');
            const balanceChange = trans?.creditAmount?.toFixed(2) || '0.00';
            const paymentMethod = trans?.paymentMethod || 'N/A';
            const productName = rec.product_name || 'N/A';

            return [[
                ...commonData,
                `"${productName}"`, 'N/A', 'N/A', 'N/A', 'N/A', paymentMethod, amountPaid, balanceChange, `"${details}"`
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
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Report Results</CardTitle>
                <CardDescription>{`Displaying ${records.length} matching transactions.`}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                    <Filter className="mr-2 h-4 w-4"/> Filter Report
                </Button>
                <Button variant="default" size="sm" onClick={handleDownload} disabled={records.length === 0 || isDownloading}>
                    {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4"/>} Download CSV
                </Button>
            </div>
        </CardHeader>

        <Collapsible open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <CollapsibleContent>
                <Separator />
                <div className="p-6">
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
                            <SelectItem value="credit_settled">Credit Settle</SelectItem>
                            <SelectItem value="check_cleared">Check Cleared</SelectItem>
                            <SelectItem value="check_rejected">Check Rejected</SelectItem>
                        </SelectContent>
                        </Select>
                        
                        <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={productSearchOpen} className="w-full justify-between">
                                    <span className="truncate">
                                        {productId ? products.find(p => p.id === productId)?.name : "Filter by Product"}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search product..." />
                                    <CommandList>
                                        <CommandEmpty>No product found.</CommandEmpty>
                                        <CommandGroup>
                                            {products.map(p => (
                                                <CommandItem
                                                    key={p.id}
                                                    value={p.id}
                                                    onSelect={(currentValue) => {
                                                        setProductId(currentValue === productId ? '' : currentValue);
                                                        setProductSearchOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", productId === p.id ? "opacity-100" : "opacity-0")} />
                                                    {p.name}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <Popover open={partySearchOpen} onOpenChange={setPartySearchOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" aria-expanded={partySearchOpen} className="w-full justify-between">
                                    <span className="truncate">
                                        {partyId ? allParties.find(p => p.value === partyId)?.label : "Filter by Customer/Supplier"}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Search party..." />
                                    <CommandList>
                                        <CommandEmpty>No party found.</CommandEmpty>
                                        <CommandGroup>
                                            {allParties.map(p => (
                                                <CommandItem
                                                    key={p.value}
                                                    value={p.value}
                                                    onSelect={(currentValue) => {
                                                        setPartyId(currentValue === partyId ? '' : currentValue);
                                                        setPartySearchOpen(false);
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", partyId === p.value ? "opacity-100" : "opacity-0")} />
                                                    {p.label}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <div className="flex gap-2">
                        <Button onClick={handleGenerateReport} disabled={isPending} className="w-full">
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />} Apply
                        </Button>
                        <Button onClick={clearFilters} variant="ghost" disabled={isPending} className="w-full">
                            <X className="mr-2 h-4 w-4" /> Clear
                        </Button>
                        </div>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
        
        <CardContent className="p-0">
            <ScrollArea className="h-[60vh] border-t">
                <Table>
                    <TableHeader className="sticky top-0 bg-card z-10">
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Transaction</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Party</TableHead>
                            <TableHead>Details</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isPending ? (
                            Array.from({ length: 10 }).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell colSpan={6}>
                                        <Skeleton className="h-10 w-full" />
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : records.length > 0 ? (
                            records.map(record => {
                                const hasItems = record.transaction && (record.transaction as any).items && (record.transaction as any).items.length > 0;
                                return (
                                    <Collapsible asChild key={`${record.type}-${record.id}`}>
                                        <React.Fragment>
                                            <CollapsibleTrigger asChild>
                                                <TableRow className="cursor-pointer hover:bg-muted/50 data-[state=open]:bg-muted/50 border-b">
                                                    <TableCell>
                                                        {hasItems && (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <ChevronDown className="h-4 w-4 transition-transform data-[state=open]:-rotate-180" />
                                                            </Button>
                                                        )}
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
                                            </CollapsibleTrigger>
                                            <CollapsibleContent asChild>
                                                 <tr className="bg-muted/20 hover:bg-muted/20">
                                                     <TableCell colSpan={6} className="p-0">
                                                     <div className="p-4">
                                                         <h4 className="font-semibold mb-2 ml-4">Items</h4>
                                                         <Table>
                                                             <TableHeader>
                                                                 <TableRow>
                                                                     <TableHead className="w-[60px] sm:table-cell">Image</TableHead>
                                                                     <TableHead>Product</TableHead>
                                                                     <TableHead>Quantity</TableHead>
                                                                     <TableHead>Unit Price/Cost</TableHead>
                                                                     <TableHead className="text-right">Total</TableHead>
                                                                 </TableRow>
                                                             </TableHeader>
                                                             <TableBody>
                                                                 {(hasItems ? (record.transaction as any).items as (SaleItem | PurchaseItem)[] : []).map((item, idx) => (
                                                                     <TableRow key={idx}>
                                                                         <TableCell className="hidden sm:table-cell">
                                                                             <Avatar className="h-9 w-9">
                                                                                 <AvatarImage src={item.image || 'https://placehold.co/40x40.png'} alt={item.name} data-ai-hint="product image" />
                                                                                 <AvatarFallback>{item.name?.charAt(0).toUpperCase() || 'P'}</AvatarFallback>
                                                                             </Avatar>
                                                                         </TableCell>
                                                                         <TableCell>{item.name}</TableCell>
                                                                         <TableCell>{(item as any).return_quantity || (item as any).quantity}</TableCell>
                                                                         <TableCell>LKR {((item as SaleItem).price_per_unit || (item as PurchaseItem).cost_price || 0).toFixed(2)}</TableCell>
                                                                         <TableCell className="text-right">LKR {((item as SaleItem).total_amount || (item as PurchaseItem).total_cost || 0).toFixed(2)}</TableCell>
                                                                     </TableRow>
                                                                 ))}
                                                             </TableBody>
                                                         </Table>
                                                     </div>
                                                     </TableCell>
                                                 </tr>
                                            </CollapsibleContent>
                                        </React.Fragment>
                                    </Collapsible>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                    No records found for the selected filters.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
        </CardContent>
    </Card>
  );
}
