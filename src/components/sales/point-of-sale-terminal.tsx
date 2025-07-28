

'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createSale } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { ProductSelect, SaleItem, Customer, Sale } from '@/lib/types';
import { Search, PlusCircle, MinusCircle, Trash2, FileText, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { CustomerSelection } from './customer-selection';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SaleReceipt } from './sale-receipt';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

type GroupedProducts = {
  [category: string]: {
    [brand: string]: ProductSelect[];
  };
};

export function PointOfSaleTerminal({ products, initialCustomers }: { products: ProductSelect[]; initialCustomers: Customer[] }) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [cart, setCart] = React.useState<SaleItem[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [taxPercentage, setTaxPercentage] = React.useState(0);
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [serviceCharge, setServiceCharge] = React.useState(0);
  const [lastCompletedSale, setLastCompletedSale] = React.useState<Sale | null>(null);
  const [lastAddedItemId, setLastAddedItemId] = React.useState<string | null>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'credit' | 'check'>('cash');
  const [amountPaid, setAmountPaid] = React.useState(0);
  const [checkNumber, setCheckNumber] = React.useState('');

  const { toast } = useToast();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (lastAddedItemId) {
      const input = document.getElementById(`quantity-${lastAddedItemId}`);
      if (input) {
        (input as HTMLInputElement).focus();
        (input as HTMLInputElement).select();
      }
      setLastAddedItemId(null); // Reset after focusing
    }
  }, [lastAddedItemId, cart]);


  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);
    setSelectedCustomer(newCustomer);
  };

  const filteredAndGroupedProducts = React.useMemo(() => {
    const lowercasedTerm = searchTerm.toLowerCase();
    const filtered = products.filter((product) => {
        const inCart = cart.some((item) => item.id === product.id);
        if (inCart) return false;

        if (searchTerm === '') return true;

        return (
            product.name.toLowerCase().includes(lowercasedTerm) ||
            (product.brand && product.brand.toLowerCase().includes(lowercasedTerm)) ||
            (product.category && product.category.toLowerCase().includes(lowercasedTerm)) ||
            (product.sub_category && product.sub_category.toLowerCase().includes(lowercasedTerm))
        );
    });

    return filtered.reduce((acc, product) => {
        const category = product.category || 'Uncategorized';
        const brand = product.brand || 'No Brand';

        if (!acc[category]) {
            acc[category] = {};
        }
        if (!acc[category][brand]) {
            acc[category][brand] = [];
        }
        acc[category][brand].push(product);
        return acc;
    }, {} as GroupedProducts);

  }, [products, searchTerm, cart]);

  const addToCart = (product: ProductSelect) => {
    if (product.stock <= 0) {
      toast({
        variant: 'destructive',
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock.`,
      });
      return;
    }
    setCart((prevCart) => [
      ...prevCart,
      {
        id: product.id,
        name: product.name,
        image: product.image,
        quantity: 1,
        price_per_unit: product.selling_price,
        total_amount: product.selling_price,
        stock: product.stock,
      },
    ]);
    setLastAddedItemId(product.id);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const itemInCart = cart.find(item => item.id === productId);
    if (!itemInCart) return;

    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }

    if (newQuantity > itemInCart.stock) {
        toast({
            variant: 'destructive',
            title: 'Stock Limit Exceeded',
            description: `Only ${itemInCart.stock} units of ${itemInCart.name} available.`,
        });
        // Revert to max stock available
        setCart((prevCart) =>
            prevCart.map((item) =>
                item.id === productId
                ? {
                    ...item,
                    quantity: item.stock,
                    total_amount: item.stock * item.price_per_unit,
                    }
                : item
            )
        );
        return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: newQuantity,
              total_amount: newQuantity * item.price_per_unit,
            }
          : item
      )
    );
  };
  
  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };


  const subtotal = cart.reduce((acc, item) => acc + item.total_amount, 0);
  const tax = subtotal * (taxPercentage / 100);
  const total = Math.max(0, subtotal + tax + serviceCharge - discountAmount);
  
  // Update amountPaid when total changes
  React.useEffect(() => {
    if (paymentMethod === 'cash' || paymentMethod === 'check') {
      setAmountPaid(total);
    }
  }, [total, paymentMethod]);


  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Empty Cart', description: 'Please add items to the bill.' });
      return;
    }
    if (paymentMethod === 'credit' && !selectedCustomer) {
        toast({ variant: 'destructive', title: 'Customer Required', description: 'Please select a customer for credit sales.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const saleData = {
            items: cart,
            customer_name: selectedCustomer?.name || 'Walk-in Customer',
            customer_id: selectedCustomer?.id || null,
            subtotal,
            tax_percentage: taxPercentage,
            tax_amount: tax,
            discount_amount: discountAmount,
            service_charge: serviceCharge,
            total_amount: total,
            paymentMethod,
            amountPaid,
            checkNumber,
        };
      const completedSale = await createSale(saleData);

      if (completedSale) {
        setLastCompletedSale(completedSale);
        toast({
          title: 'Sale Complete!',
          description: `Sale ID: ${completedSale.id} has been recorded.`,
        });
      }

    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Failed to complete the sale.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleStartNewSale = () => {
    setLastCompletedSale(null);
    setCart([]);
    setSelectedCustomer(null);
    setTaxPercentage(0);
    setDiscountAmount(0);
    setServiceCharge(0);
    setPaymentMethod('cash');
    setAmountPaid(0);
    setCheckNumber('');
  }

  if (!isMounted) {
    return (
        <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <>
      <Dialog open={!!lastCompletedSale} onOpenChange={(isOpen) => !isOpen && handleStartNewSale()}>
        <DialogContent className="max-w-sm p-0">
           <DialogHeader className="p-0">
             <DialogTitle className="sr-only">Sale Receipt</DialogTitle>
           </DialogHeader>
          {lastCompletedSale && (
            <SaleReceipt sale={lastCompletedSale} onNewSale={handleStartNewSale} />
          )}
        </DialogContent>
      </Dialog>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-8">
        {/* Left Column: Product Search */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, brand, category..."
                className="w-full pl-8 sm:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
             <ScrollArea className="h-[60vh]">
              {Object.keys(filteredAndGroupedProducts).length > 0 ? (
                <Accordion type="multiple" defaultValue={Object.keys(filteredAndGroupedProducts)} className="w-full">
                  {Object.entries(filteredAndGroupedProducts).map(([category, brands]) => (
                    <AccordionItem value={category} key={category}>
                      <AccordionTrigger className="text-base font-semibold">{category}</AccordionTrigger>
                      <AccordionContent>
                        <Accordion type="multiple" defaultValue={Object.keys(brands)} className="w-full space-y-2 pl-4">
                            {Object.entries(brands).map(([brand, items]) => (
                                <AccordionItem value={brand} key={brand}>
                                    <AccordionTrigger className="text-sm py-2">{brand}</AccordionTrigger>
                                    <AccordionContent className="p-0">
                                        <Table>
                                          <TableHeader>
                                            <TableRow>
                                              <TableHead className="w-[80px]">Image</TableHead>
                                              <TableHead>Name</TableHead>
                                              <TableHead>Price</TableHead>
                                              <TableHead>Stock</TableHead>
                                              <TableHead className="w-[100px] text-right">Action</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {items.map((product) => (
                                              <TableRow key={product.id}>
                                                <TableCell>
                                                  <Avatar className="h-12 w-12 rounded-md">
                                                    <AvatarImage src={product.image || 'https://placehold.co/64x64.png'} alt={product.name} data-ai-hint="product image" />
                                                    <AvatarFallback>{product.name.charAt(0)}</AvatarFallback>
                                                  </Avatar>
                                                </TableCell>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell>LKR {product.selling_price.toFixed(2)}</TableCell>
                                                <TableCell>
                                                  {product.stock > 0 ? (
                                                    <span>{product.stock}</span>
                                                  ) : (
                                                    <Badge variant="destructive">Out</Badge>
                                                  )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                  <Button size="sm" onClick={() => addToCart(product)} disabled={product.stock <= 0}>Add</Button>
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <p>No products match your search.</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Right Column: Bill */}
        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Current Bill</CardTitle>
              <CardDescription>Items to be checked out.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CustomerSelection 
                  customers={customers}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={setSelectedCustomer}
                  onCustomerCreated={handleCustomerCreated}
              />

              <ScrollArea className="h-[25vh] border-t border-b py-2">
                  {cart.length > 0 ? (
                      cart.map((item) => (
                      <div key={item.id} className="flex items-center gap-4 py-2">
                        <Avatar className="h-10 w-10 rounded-md">
                          <AvatarImage src={item.image || 'https://placehold.co/40x40.png'} alt={item.name} data-ai-hint="product image" />
                          <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-medium truncate text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            LKR {item.price_per_unit.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                            <MinusCircle className="h-4 w-4" />
                          </Button>
                          <Input
                              id={`quantity-${item.id}`}
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                              onFocus={(e) => e.target.select()}
                              className="h-8 w-14 text-center"
                              min="0"
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="w-20 text-right font-medium text-sm">
                          LKR {item.total_amount.toFixed(2)}
                        </p>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                      </div>
                    ))
                  ) : (
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                          <FileText className="h-10 w-10" />
                          <p className="mt-2 text-sm">Your bill is empty.</p>
                      </div>
                  )}
              </ScrollArea>
              
              {cart.length > 0 && (
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>LKR {subtotal.toFixed(2)}</span></div>
                      <div className="flex items-center justify-between gap-2"><Label htmlFor="service_charge" className="text-muted-foreground flex-1">Service Charge (LKR)</Label><Input id="service_charge" type="number" value={serviceCharge} onChange={(e) => setServiceCharge(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-24 text-right" placeholder="0.00" /></div>
                      <div className="flex items-center justify-between gap-2"><Label htmlFor="tax" className="text-muted-foreground flex-1">Tax (%)</Label><Input id="tax" type="number" value={taxPercentage} onChange={(e) => setTaxPercentage(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-24 text-right" placeholder="0" /></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Calculated Tax</span><span>LKR {tax.toFixed(2)}</span></div>
                      <div className="flex items-center justify-between gap-2"><Label htmlFor="discount" className="text-muted-foreground flex-1">Discount (LKR)</Label><Input id="discount" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-24 text-right" placeholder="0.00" /></div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base"><span className="text-primary">Total</span><span className="text-primary">LKR {total.toFixed(2)}</span></div>
                      <Separator />
                      
                      {/* Payment Method Section */}
                      <div className="space-y-4 pt-2">
                        <Label>Payment Method</Label>
                        <RadioGroup value={paymentMethod} onValueChange={(value: 'cash' | 'credit' | 'check') => setPaymentMethod(value)} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="credit" id="credit" disabled={!selectedCustomer} /><Label htmlFor="credit" className={!selectedCustomer ? 'text-muted-foreground cursor-not-allowed' : ''}>Credit</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="check" id="check" /><Label htmlFor="check">Check</Label></div>
                        </RadioGroup>

                        {paymentMethod === 'credit' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label htmlFor="amountPaid">Amount Paid</Label><Input id="amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} /></div>
                                <div><Label htmlFor="creditAmount">Credit Amount</Label><Input id="creditAmount" type="number" readOnly value={(total - amountPaid).toFixed(2)} /></div>
                            </div>
                        )}
                        {paymentMethod === 'check' && (
                            <div><Label htmlFor="checkNumber">Check Number</Label><Input id="checkNumber" type="text" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} /></div>
                        )}
                      </div>
                  </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleCheckout} disabled={isSubmitting || cart.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Sale
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
