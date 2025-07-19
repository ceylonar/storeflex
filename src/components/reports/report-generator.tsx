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

import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Calendar as CalendarIcon } from 'lucide-react';
import type { Sale } from '@/lib/types';
import { fetchSalesReport } from '@/lib/actions';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface ReportData {
  sales: Sale[];
  totalSales: number;
  transactionCount: number;
}

export function ReportGenerator() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleGenerateReport = () => {
    if (!date) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a date range.',
      });
      return;
    }
    startTransition(async () => {
      const result = await fetchSalesReport(date);
      if (result.success) {
        setReportData(result.data!);
        toast({
            title: 'Report Generated',
            description: `Successfully generated the sales report.`,
        });
      } else {
        setReportData(null);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message,
        });
      }
    });
  };

  const handleDownload = () => {
    if (!reportData) return;
    
    const headers = [
      'Sale ID', 'Product Name', 'Sale Date', 'Quantity', 'Unit Price (LKR)', 'Total Amount (LKR)'
    ];
    
    const csvContent = [
      headers.join(','),
      ...reportData.sales.flatMap(sale => 
        sale.items.map(item => [
          sale.id,
          `"${item.name}"`,
          format(new Date(sale.sale_date), 'yyyy-MM-dd HH:mm:ss'),
          item.quantity,
          item.price_per_unit.toFixed(2),
          item.total_amount.toFixed(2)
        ].join(','))
      ).join('\n')
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
      URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.download = `sales_report_${format(date?.from || new Date(), 'yyyy-MM-dd')}_to_${format(date?.to || new Date(), 'yyyy-MM-dd')}.csv`;
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Options</CardTitle>
          <CardDescription>Select a date range and generate a sales report.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
           <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                className={cn(
                  "w-[300px] justify-start text-left font-normal",
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
                  <span>Pick a date</span>
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
          <Button onClick={handleGenerateReport} disabled={isPending}>
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {isPending && (
        <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {reportData && !isPending && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Report Summary</CardTitle>
                    <CardDescription>Overview of the sales for the selected period.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} disabled={reportData.sales.length === 0}>
                    <Download className="mr-2 h-4 w-4"/>
                    Download CSV
                </Button>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">LKR {reportData.totalSales.toFixed(2)}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Number of Transactions</p>
                <p className="text-2xl font-bold">{reportData.transactionCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Detailed Sales Report</CardTitle>
              <CardDescription>
                All sales transactions for the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden w-[100px] sm:table-cell">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.sales.length > 0 ? reportData.sales.flatMap((sale) => (
                    sale.items.map(item => (
                    <TableRow key={`${sale.id}-${item.id}`}>
                      <TableCell className="hidden sm:table-cell">
                        <Avatar className="h-16 w-16 rounded-md">
                          <AvatarImage src={item.image || sale.product_image || 'https://placehold.co/64x64.png'} alt={item.name} data-ai-hint="product image" className="aspect-square object-cover" />
                          <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{format(new Date(sale.sale_date), 'PPP p')}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">LKR {Number(item.price_per_unit).toFixed(2)}</TableCell>
                      <TableCell className="text-right">LKR {Number(item.total_amount).toFixed(2)}</TableCell>
                    </TableRow>
                    ))
                  )) : (
                     <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                            No sales found for the selected period.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
