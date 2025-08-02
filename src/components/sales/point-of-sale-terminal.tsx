
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
import { createSale, fetchCustomers, fetchProductsForSelect, fetchSaleById, createSaleReturn } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { ProductSelect, SaleItem, Customer, Sale, SaleReturnItem, SaleReturn } from '@/lib/types';
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
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from '../ui/checkbox';
import { FormattedDate } from '../ui/formatted-date';


type GroupedProducts = {
  [category: string]: {
    [brand: string]: ProductSelect[];
  };
};

function SaleTerminal({ initialProducts, initialCustomers, onSaleComplete }: { initialProducts: ProductSelect[], initialCustomers: Customer[], onSaleComplete: () => void }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [cart, setCart] = React.useState<SaleItem[]>([]);
  const [customers, setCustomers] = React.useState<Customer[]>(initialCustomers);
  const [products, setProducts] = React.useState<ProductSelect[]>(initialProducts);
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
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  const barcodeChars = React.useRef<string[]>([]);
  const lastKeystrokeTime = React.useRef<number>(0);

   React.useEffect(() => {
    if (lastAddedItemId) {
      const input = document.getElementById(`quantity-${lastAddedItemId}`);
      if (input) {
        (input as HTMLInputElement).focus();
        (input as HTMLInputElement).select();
      }
      setLastAddedItemId(null); 
    }
  }, [lastAddedItemId, cart]);


  const handleCustomerCreated = (newCustomer: Customer) => {
    setCustomers(prev => [newCustomer, ...prev]);
    setSelectedCustomer(newCustomer);
  };
  
  const updateCartItem = (productId: string, field: 'quantity' | 'price_per_unit', value: number) => {
    setCart(prevCart =>
      prevCart.map(item => {
        if (item.id === productId) {
           const itemInCart = cart.find(item => item.id === productId);
           if (!itemInCart) return item;

           if (field === 'quantity' && value > itemInCart.stock) {
             setTimeout(() => toast({
               variant: 'destructive',
               title: 'Stock Limit Exceeded',
               description: `Only ${itemInCart.stock} units of ${itemInCart.name} available.`,
             }), 0);
             return item; 
           }

          const updatedItem = { ...item, [field]: value };
          
          if (field === 'quantity') {
            if (value < 1) {
              updatedItem.quantity = 0;
            }
          }
          
          updatedItem.total_amount = updatedItem.quantity * updatedItem.price_per_unit;
          return updatedItem;
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };


  const addToCart = React.useCallback((product: ProductSelect) => {
    if (product.stock <= 0) {
      toast({
        variant: 'destructive',
        title: 'Out of Stock',
        description: `${product.name} is currently out of stock.`,
      });
      return;
    }
    
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
        const newQuantity = existingItem.quantity + 1;
        if(newQuantity > existingItem.stock) {
            toast({
                variant: 'destructive',
                title: 'Stock Limit Exceeded',
                description: `Only ${existingItem.stock} units of ${existingItem.name} available.`,
            });
            return;
        }
        updateCartItem(product.id, 'quantity', newQuantity);
    } else {
        setCart((prevCart) => [
          ...prevCart,
          {
            id: product.id,
            name: product.name,
            image: product.image,
            sub_category: product.sub_category,
            quantity: 1,
            price_per_unit: product.selling_price,
            total_amount: product.selling_price,
            stock: product.stock,
          },
        ]);
        setLastAddedItemId(product.id);
    }
    
    setSearchTerm('');
    
  }, [cart, toast]);

    const handleBarcodeScan = React.useCallback((barcode: string) => {
        const product = products.find(p => p.barcode?.toLowerCase() === barcode.toLowerCase());
        if (product) {
            addToCart(product);
            toast({
                title: 'Product Added',
                description: `${product.name} has been added to the bill.`,
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Product Not Found',
                description: `No product found with barcode: ${barcode}`,
            });
        }
    }, [products, addToCart, toast]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
              return;
            }
      
            const currentTime = new Date().getTime();
            
            if (currentTime - lastKeystrokeTime.current > 100) {
              barcodeChars.current = [];
            }
            
            if (e.key === 'Enter') {
              if (barcodeChars.current.length > 3) { // Reduced minimum length for more flexibility
                handleBarcodeScan(barcodeChars.current.join(''));
              }
              barcodeChars.current = [];
            } else {
              // Allow any single printable character
              if(e.key.length === 1 && e.key.match(/\S/)) {
                barcodeChars.current.push(e.key);
              }
            }
            
            lastKeystrokeTime.current = currentTime;
          };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleBarcodeScan]);


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
            (product.sub_category && product.sub_category.toLowerCase().includes(lowercasedTerm)) ||
            (product.barcode && product.barcode.toLowerCase().includes(lowercasedTerm))
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

  
  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };


  const subtotal = cart.reduce((acc, item) => acc + item.total_amount, 0);
  const tax = subtotal * (taxPercentage / 100);
  const total = Math.max(0, subtotal + tax + serviceCharge - discountAmount);
  
  const previousBalance = selectedCustomer?.credit_balance || 0;
  const totalDue = previousBalance + total;

  React.useEffect(() => {
    if (paymentMethod === 'cash' || paymentMethod === 'check') {
      setAmountPaid(totalDue);
    }
  }, [totalDue, paymentMethod]);


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
        const finalCreditAmount = totalDue - amountPaid;
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
            creditAmount: finalCreditAmount,
            checkNumber,
            previousBalance,
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
    onSaleComplete();
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
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search or scan product barcode..."
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
                                              <TableHead className="w-auto sm:w-[80px]">Image</TableHead>
                                              <TableHead>Name</TableHead>
                                              <TableHead>Price</TableHead>
                                              <TableHead>Stock</TableHead>
                                              <TableHead className="w-auto sm:w-[100px] text-right">Action</TableHead>
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

        <div 
          className="lg:col-span-2"
          tabIndex={-1}
        >
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
                        <div key={item.id} className="flex flex-col gap-2 py-2 border-b last:border-b-0">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-10 w-10 rounded-md">
                                <AvatarImage src={item.image || 'https://placehold.co/40x40.png'} alt={item.name} data-ai-hint="product image" />
                                <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                <p className="font-medium truncate text-sm">{item.name}</p>
                                {item.sub_category && (
                                    <p className="text-xs text-muted-foreground">{item.sub_category}</p>
                                )}
                                </div>
                                 <p className="w-20 text-right font-medium text-sm">
                                    LKR {item.total_amount.toFixed(2)}
                                </p>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pl-14">
                                <div className="space-y-1">
                                    <Label htmlFor={`quantity-${item.id}`} className="text-xs">Quantity</Label>
                                    <div className="flex items-center gap-1">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCartItem(item.id, 'quantity', item.quantity - 1)}>
                                            <MinusCircle className="h-4 w-4" />
                                        </Button>
                                        <Input
                                            id={`quantity-${item.id}`}
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateCartItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                            onFocus={(e) => e.target.select()}
                                            className="h-8 w-14 text-center"
                                            min="0"
                                        />
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateCartItem(item.id, 'quantity', item.quantity + 1)}>
                                            <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor={`price-${item.id}`} className="text-xs">Unit Price (LKR)</Label>
                                    <Input
                                        id={`price-${item.id}`}
                                        type="number"
                                        step="0.01"
                                        value={item.price_per_unit}
                                        onChange={(e) => updateCartItem(item.id, 'price_per_unit', parseFloat(e.target.value) || 0)}
                                        className="h-8"
                                    />
                                </div>
                            </div>
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
                      <div className="grid grid-cols-2 gap-2"><Label htmlFor="service_charge" className="text-muted-foreground my-auto">Service Charge (LKR)</Label><Input id="service_charge" type="number" value={serviceCharge} onChange={(e) => setServiceCharge(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-full text-right" placeholder="0.00" /></div>
                      <div className="grid grid-cols-2 gap-2"><Label htmlFor="tax" className="text-muted-foreground my-auto">Tax (%)</Label><Input id="tax" type="number" value={taxPercentage} onChange={(e) => setTaxPercentage(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-full text-right" placeholder="0" /></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Calculated Tax</span><span>LKR {tax.toFixed(2)}</span></div>
                      <div className="grid grid-cols-2 gap-2"><Label htmlFor="discount" className="text-muted-foreground my-auto">Discount (LKR)</Label><Input id="discount" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-full text-right" placeholder="0.00" /></div>
                      <Separator />
                      <div className="flex justify-between font-semibold"><span className="text-muted-foreground">Current Bill Total</span><span>LKR {total.toFixed(2)}</span></div>
                      {previousBalance > 0 && (
                        <div className="flex justify-between font-semibold">
                            <span className="text-muted-foreground">Previous Balance</span>
                            <span className="text-destructive">LKR {previousBalance.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-base"><span className="text-primary">Total Due</span><span className="text-primary">LKR {totalDue.toFixed(2)}</span></div>
                      <Separator />
                      
                      <div className="space-y-4 pt-2">
                        <Label>Payment Method</Label>
                        <RadioGroup value={paymentMethod} onValueChange={(value: 'cash' | 'credit' | 'check') => setPaymentMethod(value)} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="credit" id="credit" disabled={!selectedCustomer} /><Label htmlFor="credit" className={!selectedCustomer ? 'text-muted-foreground cursor-not-allowed' : ''}>Credit</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="check" id="check" /><Label htmlFor="check">Check</Label></div>
                        </RadioGroup>

                        {paymentMethod === 'credit' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label htmlFor="amountPaid">Amount Paid</Label><Input id="amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} /></div>
                                <div><Label htmlFor="creditAmount">New Credit Amount</Label><Input id="creditAmount" type="number" readOnly value={Math.max(0, totalDue - amountPaid).toFixed(2)} className={cn((totalDue - amountPaid) > 0 && "text-destructive font-bold")} /></div>
                            </div>
                        ) : paymentMethod === 'cash' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label htmlFor="amountPaid">Amount Paid</Label><Input id="amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} /></div>
                                <div><Label htmlFor="change">Change</Label><Input id="change" type="number" readOnly value={Math.max(0, amountPaid - totalDue).toFixed(2)} /></div>
                            </div>
                        ) : (
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

function ReturnsTerminal() {
    const [saleId, setSaleId] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [foundSale, setFoundSale] = React.useState<Sale | null>(null);
    const [returnItems, setReturnItems] = React.useState<Map<string, SaleReturnItem>>(new Map());
    const { toast } = useToast();

    const handleSearch = async () => {
        if (!saleId) {
            toast({ variant: 'destructive', title: 'Sale ID required' });
            return;
        }
        setIsLoading(true);
        setFoundSale(null);
        setReturnItems(new Map());
        try {
            const sale = await fetchSaleById(saleId);
            if (sale) {
                setFoundSale(sale);
                toast({ title: 'Sale Found', description: `Details for sale ${saleId} loaded.` });
            } else {
                toast({ variant: 'destructive', title: 'Sale Not Found' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemSelection = (itemId: string, checked: boolean) => {
        const newReturnItems = new Map(returnItems);
        const saleItem = foundSale?.items.find(i => i.id === itemId);
        if (!saleItem) return;

        if (checked) {
            newReturnItems.set(itemId, {
                ...saleItem,
                return_quantity: saleItem.quantity,
                return_reason: '',
            });
        } else {
            newReturnItems.delete(itemId);
        }
        setReturnItems(newReturnItems);
    };

    const handleQuantityChange = (itemId: string, quantity: number) => {
        const newReturnItems = new Map(returnItems);
        const item = newReturnItems.get(itemId);
        const originalItem = foundSale?.items.find(i => i.id === itemId);
        if (item && originalItem) {
            item.return_quantity = Math.max(0, Math.min(quantity, originalItem.quantity));
            newReturnItems.set(itemId, item);
            setReturnItems(newReturnItems);
        }
    };
    
    const totalRefundAmount = Array.from(returnItems.values()).reduce((acc, item) => {
        return acc + (item.price_per_unit * item.return_quantity);
    }, 0);

    const handleProcessReturn = async () => {
        if (returnItems.size === 0 || !foundSale) {
            toast({ variant: 'destructive', title: 'No items selected for return.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const returnData: SaleReturn = {
                original_sale_id: foundSale.id,
                customer_id: foundSale.customer_id,
                customer_name: foundSale.customer_name,
                items: Array.from(returnItems.values()),
                total_refund_amount: totalRefundAmount,
                refund_method: 'credit_balance', // or logic to choose
            };
            await createSaleReturn(returnData);
            toast({ title: 'Return Processed', description: `Refund of LKR ${totalRefundAmount.toFixed(2)} has been processed.` });
            // Reset state
            setSaleId('');
            setFoundSale(null);
            setReturnItems(new Map());
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Process a Return</CardTitle>
                <CardDescription>Look up a sale by its ID to process a customer return.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input placeholder="Enter Sale ID (e.g., sale000001)" value={saleId} onChange={(e) => setSaleId(e.target.value)} />
                    <Button onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                         Find Sale
                    </Button>
                </div>

                {isLoading && (
                     <div className="text-center text-muted-foreground py-10">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p>Searching for sale...</p>
                    </div>
                )}
                
                {!isLoading && !foundSale && (
                     <div className="text-center text-muted-foreground py-10">
                        <p>Enter a valid Sale ID to begin the return process.</p>
                    </div>
                )}

                {foundSale && (
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold">Sale Details</h3>
                            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4">
                                <p><strong>Customer:</strong> {foundSale.customer_name}</p>
                                <p><strong>Date:</strong> <FormattedDate timestamp={foundSale.sale_date} /></p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <Label>Select items to return:</Label>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Original Qty</TableHead>
                                        <TableHead>Return Qty</TableHead>
                                        <TableHead className="text-right">Price</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {foundSale.items.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={returnItems.has(item.id)}
                                                    onCheckedChange={(checked) => handleItemSelection(item.id, !!checked)}
                                                />
                                            </TableCell>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell>{item.quantity}</TableCell>
                                            <TableCell>
                                                <Input 
                                                    type="number" 
                                                    className="h-8 w-20"
                                                    value={returnItems.get(item.id)?.return_quantity || ''}
                                                    onChange={(e) => handleQuantityChange(item.id, Number(e.target.value))}
                                                    disabled={!returnItems.has(item.id)}
                                                    max={item.quantity}
                                                    min={0}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">LKR {item.price_per_unit.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                       
                        <Separator />
                         <div className="text-right space-y-2">
                            <p className="font-bold text-lg">Total Refund Amount: LKR {totalRefundAmount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Refund will be added to the customer's credit balance.</p>
                        </div>
                         <Button onClick={handleProcessReturn} disabled={isSubmitting || returnItems.size === 0} className="w-full">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Process Return
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}


export function PointOfSaleTerminal({ products: initialProducts, initialCustomers }: { products: ProductSelect[]; initialCustomers: Customer[] }) {
  const [isMounted, setIsMounted] = React.useState(false);
  
  // This function will be called to refresh all data after a sale is complete.
  const handleSaleComplete = async () => {
    // This is a placeholder for a more robust state management solution
    // For now, we'll just log that a re-fetch would happen here.
    console.log("A sale was completed. Data would be re-fetched here.");
  };

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
        <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <Tabs defaultValue="sale" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sale">New Sale</TabsTrigger>
            <TabsTrigger value="return">Returns</TabsTrigger>
        </TabsList>
        <TabsContent value="sale">
            <SaleTerminal 
                initialProducts={initialProducts} 
                initialCustomers={initialCustomers} 
                onSaleComplete={handleSaleComplete}
            />
        </TabsContent>
        <TabsContent value="return">
            <ReturnsTerminal />
        </TabsContent>
    </Tabs>
  );
}

    
