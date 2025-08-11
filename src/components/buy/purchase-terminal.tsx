

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
import { createPurchase, fetchSuppliers, fetchPurchaseById, createPurchaseReturn, createProduct } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { ProductSelect, PurchaseItem, Supplier, Purchase, PurchaseReturn, PurchaseReturnItem, Product } from '@/lib/types';
import { Search, PlusCircle, MinusCircle, Trash2, Truck, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { SupplierSelection } from './supplier-selection';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { PurchaseReceipt } from './purchase-receipt';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from '../ui/checkbox';
import { FormattedDate } from '../ui/formatted-date';


const initialProductState: Partial<Product> = {
  name: '',
  sku: '',
  barcode: '',
  category: '',
  sub_category: '',
  brand: '',
  stock: 0,
  cost_price: 0,
  selling_price: 0,
  image: '',
  low_stock_threshold: 5,
};

function NewPurchaseTerminal({ products, initialSuppliers, onPurchaseComplete, onProductCreated }: { products: ProductSelect[]; initialSuppliers: Supplier[], onPurchaseComplete: () => void, onProductCreated: (product: ProductSelect) => void }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [cart, setCart] = React.useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(initialSuppliers);
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [taxPercentage, setTaxPercentage] = React.useState(0);
  const [discountAmount, setDiscountAmount] = React.useState(0);
  const [serviceCharge, setServiceCharge] = React.useState(0);
  const [lastCompletedPurchase, setLastCompletedPurchase] = React.useState<Purchase | null>(null);
  const [isAddProductOpen, setIsAddProductOpen] = React.useState(false);
  const [lastAddedItemId, setLastAddedItemId] = React.useState<string | null>(null);
  const addProductFormRef = React.useRef<HTMLFormElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);


  const [paymentMethod, setPaymentMethod] = React.useState<'cash' | 'credit' | 'check'>('cash');
  const [amountPaid, setAmountPaid] = React.useState(0);
  const [checkNumber, setCheckNumber] = React.useState('');

  const { toast } = useToast();

  React.useEffect(() => {
    if (lastAddedItemId) {
      const input = document.getElementById(`quantity-${lastAddedItemId}`);
      if (input) {
        (input as HTMLInputElement).focus();
        (input as HTMLInputElement).select();
      }
      setLastAddedItemId(null); 
    }
  }, [lastAddedItemId]);

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
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      updateCartItem(product.id, 'quantity', existingItem.quantity + 1);
    } else {
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
        setLastAddedItemId(product.id);
    }
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const updateCartItem = (productId: string, field: 'quantity' | 'cost_price', value: number) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === productId) {
          const updatedItem = { ...item, [field]: value };
          if (field === 'quantity' && value < 1) {
            return null; // Mark for removal
          }
          updatedItem.total_cost = updatedItem.quantity * updatedItem.cost_price;
          return updatedItem;
        }
        return item;
      }).filter(Boolean) as PurchaseItem[] // Remove null items
    );
  };
  
  const removeFromCart = (productId: string) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };
  
  const subtotal = cart.reduce((acc, item) => acc + item.total_cost, 0);
  const taxAmount = subtotal * (taxPercentage / 100);
  const totalCost = Math.max(0, subtotal + taxAmount + serviceCharge - discountAmount);
  
  const previousBalanceDue = Math.abs(selectedSupplier?.credit_balance || 0);
  const totalPayable = previousBalanceDue + totalCost;
  const newBalanceDue = Math.max(0, totalPayable - amountPaid);
  
  React.useEffect(() => {
    if (paymentMethod === 'cash' || paymentMethod === 'check') {
      setAmountPaid(totalPayable);
    } else if (paymentMethod === 'credit') {
        setAmountPaid(amount => amount > totalPayable ? totalPayable : amount);
    }
  }, [totalPayable, paymentMethod]);


  const handleAddProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      const newProduct = await createProduct(formData);
      if (newProduct) {
        toast({ title: 'Success', description: 'Product added.' });
        onProductCreated({
          id: newProduct.id,
          name: newProduct.name,
          selling_price: newProduct.selling_price,
          cost_price: newProduct.cost_price,
          stock: newProduct.stock,
          image: newProduct.image,
          category: newProduct.category,
          brand: newProduct.brand,
          sub_category: newProduct.sub_category,
          barcode: newProduct.barcode,
        });
        setIsAddProductOpen(false);
      }
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message,
      });
    }
  };


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
    onPurchaseComplete();
  }

  const handleQuantityKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

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
      
      <Dialog open={isAddProductOpen} onOpenChange={setIsAddProductOpen}>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription>
                Fill in the details for the new product. It will be added to the current purchase automatically.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                <form ref={addProductFormRef} onSubmit={handleAddProduct} className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" defaultValue={initialProductState.name} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sku">SKU (optional)</Label>
                            <Input id="sku" name="sku" defaultValue={initialProductState.sku} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="barcode">Barcode</Label>
                            <Input id="barcode" name="barcode" defaultValue={initialProductState.barcode} />
                        </div>
                    </div>
                      <div className="space-y-2">
                        <Label htmlFor="brand">Brand</Label>
                        <Input id="brand" name="brand" defaultValue={initialProductState.brand} />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" name="category" defaultValue={initialProductState.category} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sub_category">Sub Category</Label>
                            <Input id="sub_category" name="sub_category" defaultValue={initialProductState.sub_category} />
                        </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="stock">Initial Stock</Label>
                        <Input id="stock" name="stock" type="number" defaultValue={initialProductState.stock} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="low_stock_threshold">Low Stock Level</Label>
                        <Input id="low_stock_threshold" name="low_stock_threshold" type="number" defaultValue={initialProductState.low_stock_threshold} />
                        </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="cost_price">Cost Price (LKR)</Label>
                        <Input id="cost_price" name="cost_price" type="number" step="0.01" defaultValue={initialProductState.cost_price} />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="selling_price">Selling Price (LKR)</Label>
                        <Input id="selling_price" name="selling_price" type="number" step="0.01" defaultValue={initialProductState.selling_price} />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="image">Image URL</Label>
                        <Input id="image" name="image" defaultValue={initialProductState.image} />
                    </div>
                </form>
            </ScrollArea>
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={() => addProductFormRef.current?.requestSubmit()}>Save Product</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-8">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Products</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search for products..."
                  className="w-full pl-8 sm:w-80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsAddProductOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
              </Button>
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
                                  onChange={(e) => updateCartItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={handleQuantityKeyDown}
                                  className="h-8"
                                  min="1"
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
                       <div className="grid grid-cols-2 gap-2"><Label htmlFor="service_charge" className="text-muted-foreground flex-1">Service Charge (LKR)</Label><Input id="service_charge" type="number" value={serviceCharge} onChange={(e) => setServiceCharge(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-full text-right" placeholder="0.00" /></div>
                      <div className="grid grid-cols-2 gap-2"><Label htmlFor="tax" className="text-muted-foreground flex-1">Tax (%)</Label><Input id="tax" type="number" value={taxPercentage} onChange={(e) => setTaxPercentage(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-full text-right" placeholder="0" /></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Calculated Tax</span><span>LKR {taxAmount.toFixed(2)}</span></div>
                       <div className="grid grid-cols-2 gap-2"><Label htmlFor="discount" className="text-muted-foreground flex-1">Discount (LKR)</Label><Input id="discount" type="number" value={discountAmount} onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)) || 0)} className="h-8 w-full text-right" placeholder="0.00" /></div>
                      <Separator />
                      <div className="flex justify-between font-semibold"><span className="text-muted-foreground">Current Purchase Total</span><span>LKR {totalCost.toFixed(2)}</span></div>
                      {previousBalanceDue > 0 && (
                        <div className="flex justify-between font-semibold">
                            <span className="text-muted-foreground">Previous Balance Due</span>
                            <span className="text-destructive">LKR {previousBalanceDue.toFixed(2)}</span>
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
              <Button className="w-full" onClick={handleCheckout} disabled={isSubmitting || cart.length === 0 || !selectedSupplier}>
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


function ReturnsToSupplierTerminal() {
    const [purchaseId, setPurchaseId] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [foundPurchase, setFoundPurchase] = React.useState<Purchase | null>(null);
    const [returnItems, setReturnItems] = React.useState<Map<string, PurchaseReturnItem>>(new Map());
    const { toast } = useToast();

    const handleSearch = async () => {
        if (!purchaseId) {
            toast({ variant: 'destructive', title: 'Purchase ID required' });
            return;
        }
        setIsLoading(true);
        setFoundPurchase(null);
        setReturnItems(new Map());
        try {
            const purchase = await fetchPurchaseById(purchaseId);
            if (purchase) {
                setFoundPurchase(purchase);
                toast({ title: 'Purchase Found', description: `Details for purchase ${purchaseId} loaded.` });
            } else {
                toast({ variant: 'destructive', title: 'Purchase Not Found' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemSelection = (itemId: string, checked: boolean) => {
        const newReturnItems = new Map(returnItems);
        const purchaseItem = foundPurchase?.items.find(i => i.id === itemId);
        if (!purchaseItem) return;

        if (checked) {
            newReturnItems.set(itemId, {
                ...purchaseItem,
                return_quantity: purchaseItem.quantity,
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
        const originalItem = foundPurchase?.items.find(i => i.id === itemId);
        if (item && originalItem) {
            item.return_quantity = Math.max(0, Math.min(quantity, originalItem.quantity));
            newReturnItems.set(itemId, item);
            setReturnItems(newReturnItems);
        }
    };

    const totalCreditAmount = Array.from(returnItems.values()).reduce((acc, item) => {
        return acc + (item.cost_price * item.return_quantity);
    }, 0);

    const handleProcessReturn = async () => {
        if (returnItems.size === 0 || !foundPurchase) {
            toast({ variant: 'destructive', title: 'No items selected for return.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const returnData: PurchaseReturn = {
                original_purchase_id: foundPurchase.id,
                supplier_id: foundPurchase.supplier_id,
                supplier_name: foundPurchase.supplier_name,
                items: Array.from(returnItems.values()),
                total_credit_amount: totalCreditAmount,
            };
            await createPurchaseReturn(returnData);
            toast({ title: 'Return Processed', description: `Credit of LKR ${totalCreditAmount.toFixed(2)} has been processed with the supplier.` });
            setPurchaseId('');
            setFoundPurchase(null);
            setReturnItems(new Map());
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Process a Return to Supplier</CardTitle>
                <CardDescription>Look up a purchase by its ID to process a return.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex gap-2">
                    <Input placeholder="Enter Purchase ID (e.g., pur000001)" value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)} />
                    <Button onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                        Find Purchase
                    </Button>
                </div>
                {isLoading && (
                     <div className="text-center text-muted-foreground py-10">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                        <p>Searching for purchase...</p>
                    </div>
                )}
                {!isLoading && !foundPurchase && (
                    <div className="text-center text-muted-foreground py-10">
                        <p>Enter a valid Purchase ID to begin the return process.</p>
                    </div>
                )}
                {foundPurchase && (
                    <div className="space-y-4">
                        <div className="p-4 border rounded-lg">
                            <h3 className="font-semibold">Purchase Details</h3>
                            <div className="text-sm text-muted-foreground grid grid-cols-2 gap-x-4">
                                <p><strong>Supplier:</strong> {foundPurchase.supplier_name}</p>
                                <p><strong>Date:</strong> <FormattedDate timestamp={foundPurchase.purchase_date} /></p>
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
                                        <TableHead className="text-right">Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {foundPurchase.items.map(item => (
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
                                            <TableCell className="text-right">LKR {item.cost_price.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Separator />
                        <div className="text-right space-y-2">
                            <p className="font-bold text-lg">Total Credit Amount: LKR {totalCreditAmount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Credit will be deducted from the supplier's balance.</p>
                        </div>
                         <Button onClick={handleProcessReturn} disabled={isSubmitting || returnItems.size === 0} className="w-full">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Process Return to Supplier
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}



export function PurchaseTerminal({ products: initialProducts, initialSuppliers }: { products: ProductSelect[]; initialSuppliers: Supplier[] }) {
  const [isMounted, setIsMounted] = React.useState(false);
  const [products, setProducts] = React.useState(initialProducts);

  const handlePurchaseComplete = async () => {
    // This is a placeholder for a more robust state management solution
    // For now, we'll just log that a re-fetch would happen here.
    console.log("A purchase was completed. Data would be re-fetched here.");
  };

  const handleProductCreated = (newProduct: ProductSelect) => {
    setProducts(prev => [newProduct, ...prev]);
  }

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
    <Tabs defaultValue="purchase" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="purchase">New Purchase</TabsTrigger>
            <TabsTrigger value="return">Returns to Supplier</TabsTrigger>
        </TabsList>
        <TabsContent value="purchase">
            <NewPurchaseTerminal 
                products={products} 
                initialSuppliers={initialSuppliers} 
                onPurchaseComplete={handlePurchaseComplete}
                onProductCreated={handleProductCreated}
            />
        </TabsContent>
        <TabsContent value="return">
            <ReturnsToSupplierTerminal />
        </TabsContent>
    </Tabs>
  );
}


    

      

    

    

