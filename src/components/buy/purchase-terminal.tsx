

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
import { createPurchase } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { ProductSelect, PurchaseItem, Supplier, Purchase } from '@/lib/types';
import { Search, PlusCircle, MinusCircle, Trash2, Truck, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { SupplierSelection } from './supplier-selection';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PurchaseReceipt } from './purchase-receipt';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';

export function PurchaseTerminal({ products, initialSuppliers }: { products: ProductSelect[]; initialSuppliers: Supplier[] }) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [cart, setCart] = React.useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(initialSuppliers);
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [taxPercentage, setTaxPercentage] = React.useState(0);
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [serviceCharge, setServiceCharge] = React.useState(0);
  const [lastCompletedPurchase, setLastCompletedPurchase] = React.useState<Purchase | null>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'credit' | 'check'>('cash');
  const [amountPaid, setAmountPaid] = React.useState(0);
  const [checkNumber, setCheckNumber] = React.useState('');

  const { toast } = useToast();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSupplierCreated = (newSupplier: Supplier) => {
    setSuppliers(prev => [newSupplier, ...prev]);
    setSelectedSupplier(newSupplier);
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !cart.some((item) => item.id === product.id)
  );

  const addToCart = (product: ProductSelect) => {
    setCart((prevCart) => [
      ...prevCart,
      {
        id: product.id,
        name: product.name,
        image: product.image,
        quantity: 1,
        cost_price: product.cost_price || 0,
        total_cost: product.cost_price || 0,
      },
    ]);
  };

  const updateCartItem = (productId: string, field: 'quantity' | 'cost_price', value: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          const updatedItem = { ...item, [field]: value };
          updatedItem.total_cost = updatedItem.quantity * updatedItem.cost_price;
          return updatedItem;
        }
        return item;
      })
    );
  };
  
  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };
  
  const subtotal = cart.reduce((acc, item) => acc + item.total_cost, 0);
  const taxAmount = subtotal * (taxPercentage / 100);
  const totalCost = Math.max(0, subtotal + taxAmount + serviceCharge - discountAmount);
  
  const previousBalance = selectedSupplier?.credit_balance || 0;
  const totalPayable = previousBalance + totalCost;
  const newBalanceDue = Math.max(0, totalPayable - amountPaid);
  
  React.useEffect(() => {
    if (paymentMethod === 'cash' || paymentMethod === 'check') {
      setAmountPaid(totalPayable);
    } else if (paymentMethod === 'credit') {
        setAmountPaid(amount => amount > totalPayable ? totalPayable : amount);
    }
  }, [totalPayable, paymentMethod]);


  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({ variant: 'destructive', title: 'Empty Cart', description: 'Please add items to the purchase order.' });
      return;
    }
    if (!selectedSupplier) {
      toast({ variant: 'destructive', title: 'No Supplier', description: 'Please select a supplier.' });
      return;
    }
     if (paymentMethod === 'credit' && amountPaid > totalPayable) {
        toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Paid amount cannot exceed total payable for credit purchases.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const creditAmount = paymentMethod === 'credit' ? totalPayable - amountPaid : 0;
        const purchaseData = {
            items: cart,
            supplier_id: selectedSupplier.id,
            supplier_name: selectedSupplier.name,
            subtotal,
            tax_percentage: taxPercentage,
            tax_amount: taxAmount,
            discount_amount: discountAmount,
            service_charge: serviceCharge,
            total_amount: totalCost,
            paymentMethod,
            amountPaid,
            checkNumber: paymentMethod === 'check' ? checkNumber : '',
            creditAmount: creditAmount,
            previousBalance
        };
      const completedPurchase = await createPurchase(purchaseData);

      if (completedPurchase) {
          setLastCompletedPurchase(completedPurchase);
          toast({
            title: 'Purchase Complete!',
            description: 'The transaction has been recorded and stock updated.',
          });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Failed to complete the purchase.',
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleStartNewPurchase = () => {
    setLastCompletedPurchase(null);
    setCart([]);
    setSelectedSupplier(null);
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
      <Dialog open={!!lastCompletedPurchase} onOpenChange={(isOpen) => !isOpen && handleStartNewPurchase()}>
        <DialogContent className="max-w-sm p-0">
           <DialogHeader className="p-0">
             <DialogTitle className="sr-only">Purchase Receipt</DialogTitle>
           </DialogHeader>
          {lastCompletedPurchase && (
            <PurchaseReceipt purchase={lastCompletedPurchase} onNewPurchase={handleStartNewPurchase} />
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
                placeholder="Search for products..."
                className="w-full pl-8 sm:w-80"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Image</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead className="w-[100px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Avatar className="h-12 w-12 rounded-md">
                          <AvatarImage src={product.image || 'https://placehold.co/64x64.png'} alt={product.name} data-ai-hint="product image" />
                          <AvatarFallback>{product.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>{product.stock}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => addToCart(product)}>Add</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredProducts.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">
                      <p>No products match your search.</p>
                  </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Purchase Order</CardTitle>
              <CardDescription>Items to be purchased.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <SupplierSelection 
                  suppliers={suppliers}
                  selectedSupplier={selectedSupplier}
                  onSelectSupplier={setSelectedSupplier}
                  onSupplierCreated={handleSupplierCreated}
              />

              <ScrollArea className="h-[30vh] border-t border-b py-2">
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
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeFromCart(item.id)}>
                              <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pl-14">
                          <div className="space-y-1">
                              <Label htmlFor={`quantity-${item.id}`} className="text-xs">Quantity</Label>
                              <Input 
                                  id={`quantity-${item.id}`}
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateCartItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                  className="h-8"
                              />
                          </div>
                          <div className="space-y-1">
                              <Label htmlFor={`cost-${item.id}`} className="text-xs">Cost Price (LKR)</Label>
                              <Input
                                  id={`cost-${item.id}`}
                                  type="number"
                                  step="0.01"
                                  value={item.cost_price}
                                  onChange={(e) => updateCartItem(item.id, 'cost_price', parseFloat(e.target.value) || 0)}
                                  className="h-8"
                              />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                      <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                          <Truck className="h-10 w-10" />
                          <p className="mt-2 text-sm">Your purchase order is empty.</p>
                      </div>
                  )}
              </ScrollArea>
              
              {cart.length > 0 && (
                  <div className="space-y-2 text-sm">
                       <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>LKR {subtotal.toFixed(2)}</span></div>
                       <div className="flex items-center justify-between gap-2"><Label htmlFor="service_charge" className="text-muted-foreground flex-1">Service Charge (LKR)</Label><Input id="service_charge" type="number" value={serviceCharge} onChange={(e) => setServiceCharge(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-24 text-right" placeholder="0.00" /></div>
                      <div className="flex items-center justify-between gap-2"><Label htmlFor="tax" className="text-muted-foreground flex-1">Tax (%)</Label><Input id="tax" type="number" value={taxPercentage} onChange={(e) => setTaxPercentage(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-24 text-right" placeholder="0" /></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Calculated Tax</span><span>LKR {taxAmount.toFixed(2)}</span></div>
                       <div className="flex items-center justify-between gap-2"><Label htmlFor="discount" className="text-muted-foreground flex-1">Discount (LKR)</Label><Input id="discount" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-24 text-right" placeholder="0.00" /></div>
                      <Separator />
                      <div className="flex justify-between font-semibold"><span className="text-muted-foreground">Current Purchase Total</span><span>LKR {totalCost.toFixed(2)}</span></div>
                      {previousBalance > 0 && (
                        <div className="flex justify-between font-semibold">
                            <span className="text-muted-foreground">Previous Balance Due</span>
                            <span className="text-destructive">LKR {previousBalance.toFixed(2)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-base"><span className="text-primary">Total Payable</span><span className="text-primary">LKR {totalPayable.toFixed(2)}</span></div>
                      <Separator />
                      
                      <div className="space-y-4 pt-2">
                        <Label>Payment Method</Label>
                        <RadioGroup value={paymentMethod} onValueChange={(value: 'cash' | 'credit' | 'check') => setPaymentMethod(value)} className="flex gap-4">
                            <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="pur-cash" /><Label htmlFor="pur-cash">Cash</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="credit" id="pur-credit" disabled={!selectedSupplier} /><Label htmlFor="pur-credit" className={!selectedSupplier ? 'text-muted-foreground cursor-not-allowed' : ''}>Credit</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="check" id="pur-check" /><Label htmlFor="pur-check">Check</Label></div>
                        </RadioGroup>

                        {paymentMethod === 'credit' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label htmlFor="pur-amountPaid">Amount Paid</Label><Input id="pur-amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} /></div>
                                <div><Label htmlFor="pur-creditAmount">New Balance Due</Label><Input id="pur-creditAmount" type="number" readOnly value={newBalanceDue.toFixed(2)} className={cn(newBalanceDue > 0 && "text-destructive font-bold")} /></div>
                            </div>
                        ) : paymentMethod === 'cash' ? (
                           <div className="grid grid-cols-2 gap-4">
                                <div><Label htmlFor="pur-amountPaid">Amount Paid</Label><Input id="pur-amountPaid" type="number" value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} /></div>
                                <div><Label htmlFor="pur-change">Change</Label><Input id="pur-change" type="number" readOnly value={Math.max(0, amountPaid - totalPayable).toFixed(2)} /></div>
                            </div>
                        ) : (
                            <div><Label htmlFor="pur-checkNumber">Check Number</Label><Input id="pur-checkNumber" type="text" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} /></div>
                        )}
                      </div>
                  </div>
              )}
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleCheckout} disabled={isSubmitting || cart.length === 0}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Purchase
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
