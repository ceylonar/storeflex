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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { Button } from '@/components/ui/button';
import { MoreHorizontal, PlusCircle, Trash2, Pencil, CalendarIcon } from 'lucide-react';
import type { Sale, ProductSelect } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { createSale, updateSale, deleteSale } from '@/lib/queries';
import { format } from 'date-fns';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

type FormState = 'add' | 'edit';
type LastEditedField = 'unit_price' | 'total_amount' | null;

const initialSaleState: Partial<Sale> = {
  id: '',
  product_id: '',
  quantity: 1,
  price_per_unit: 0,
  total_amount: 0,
  sale_date: new Date().toISOString(),
};

export function SalesTable({ initialSales, products }: { initialSales: Sale[], products: ProductSelect[] }) {
  const [sales, setSales] = React.useState<Sale[]>(initialSales);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState>('add');
  const [selectedSale, setSelectedSale] = React.useState<Partial<Sale>>(initialSaleState);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [lastEdited, setLastEdited] = React.useState<LastEditedField>(null);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleOpenDialog = (state: FormState, sale?: Sale) => {
    setFormState(state);
    if (sale) {
        setSelectedSale(sale);
        setSelectedDate(new Date(sale.sale_date));
    } else {
        setSelectedSale(initialSaleState);
        setSelectedDate(new Date());
    }
    setLastEdited(null);
    setIsDialogOpen(true);
  };

  const handleValueChange = (field: keyof Sale, value: string | number) => {
      setSelectedSale(prev => ({ ...prev, [field]: value }));
  }

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
        const quantity = Number(selectedSale.quantity) || 1;
        const pricePerUnit = product.selling_price;
        setSelectedSale(prev => ({
            ...prev,
            product_id: productId,
            price_per_unit: pricePerUnit,
            total_amount: quantity * pricePerUnit,
        }));
    }
  }


  React.useEffect(() => {
    if (!isDialogOpen) return;

    const quantity = Number(selectedSale.quantity) || 0;
    const unitPrice = Number(selectedSale.price_per_unit) || 0;
    const totalAmount = Number(selectedSale.total_amount) || 0;

    if (lastEdited === 'unit_price') {
        const newTotal = quantity * unitPrice;
        if (newTotal !== totalAmount) {
            handleValueChange('total_amount', newTotal.toFixed(2));
        }
    } else if (lastEdited === 'total_amount') {
        const newUnitPrice = quantity > 0 ? totalAmount / quantity : 0;
        if (newUnitPrice !== unitPrice) {
            handleValueChange('price_per_unit', newUnitPrice.toFixed(2));
        }
    }
  }, [selectedSale.quantity, selectedSale.price_per_unit, selectedSale.total_amount, lastEdited, isDialogOpen]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSale(id);
      setSales(sales.filter(s => s.id !== id));
      toast({
        title: 'Success',
        description: 'Sale record deleted successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete sale record.',
      });
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set('sale_date', selectedDate ? format(selectedDate, 'yyyy-MM-dd') : '');
    formData.set('total_amount', String(selectedSale.total_amount || '0'));

    try {
      if (formState === 'add') {
        await createSale(formData);
        toast({ title: 'Success', description: 'Sale record added.' });
      } else if (selectedSale.id) {
        await updateSale(selectedSale.id, formData);
        toast({ title: 'Success', description: 'Sale record updated.' });
      }
      window.location.reload();
      setIsDialogOpen(false);
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
            <div>
                <CardTitle>Sales Records</CardTitle>
                <CardDescription>A list of all recorded sales.</CardDescription>
            </div>
            <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={() => handleOpenDialog('add')}>
              <PlusCircle className="h-4 w-4" />
              Add Sale
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[80px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                 <TableCell className="hidden sm:table-cell">
                  <Avatar className="h-12 w-12 rounded-md">
                    <AvatarImage src={sale.product_image || 'https://placehold.co/64x64.png'} alt={sale.product_name} data-ai-hint="product image" className="aspect-square object-cover" />
                    <AvatarFallback>{sale.product_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  <div>{sale.product_name}</div>
                  <div className="text-muted-foreground text-sm md:hidden">{format(new Date(sale.sale_date), 'PPP')}</div>
                </TableCell>
                <TableCell className="hidden md:table-cell">{format(new Date(sale.sale_date), 'PPP')}</TableCell>
                <TableCell className="text-right">{sale.quantity}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">LKR {Number(sale.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleOpenDialog('edit', sale)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                       <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the sale record and restore product stock.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(sale.id)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>{formState === 'add' ? 'Add New Sale' : 'Edit Sale'}</DialogTitle>
                <DialogDescription>
                    Fill in the details for the sale. Click save when you're done.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                <form ref={formRef} onSubmit={handleSubmit} className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="product_id">Product</Label>
                        <Select 
                            name="product_id" 
                            value={selectedSale.product_id}
                            onValueChange={handleProductChange}
                            required
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="sale_date">Sale Date</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                "w-full justify-start text-left font-normal",
                                !selectedDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={setSelectedDate}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input 
                            id="quantity" 
                            name="quantity" 
                            type="number" 
                            value={selectedSale.quantity}
                            onChange={(e) => {
                            handleValueChange('quantity', e.target.value);
                            if (!lastEdited) setLastEdited('unit_price');
                            }}
                            required 
                        />
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="price_per_unit">Unit Price (LKR)</Label>
                            <Input 
                                id="price_per_unit" 
                                name="price_per_unit" 
                                type="number" 
                                step="0.01" 
                                value={selectedSale.price_per_unit}
                                onFocus={() => setLastEdited('unit_price')}
                                onChange={(e) => handleValueChange('price_per_unit', e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="total_amount">Total (LKR)</Label>
                            <Input 
                                id="total_amount" 
                                name="total_amount" 
                                type="number" 
                                step="0.01" 
                                value={selectedSale.total_amount}
                                onFocus={() => setLastEdited('total_amount')}
                                onChange={(e) => handleValueChange('total_amount', e.target.value)} 
                                required 
                            />
                        </div>
                    </div>
                </form>
            </ScrollArea>
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={() => formRef.current?.requestSubmit()}>Save Sale</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
