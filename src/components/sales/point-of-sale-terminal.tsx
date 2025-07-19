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
import type { ProductSelect, SaleItem } from '@/lib/types';
import { Search, PlusCircle, MinusCircle, Trash2, User, FileText, Loader2 } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';

export function PointOfSaleTerminal({ products }: { products: ProductSelect[] }) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [cart, setCart] = React.useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = React.useState('');
  const [customerId, setCustomerId] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

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
        price_per_unit: product.selling_price,
        total_amount: product.selling_price,
      },
    ]);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
        removeFromCart(productId);
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
  const tax = subtotal * 0.05; // Example 5% tax
  const total = subtotal + tax;

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Empty Cart',
        description: 'Please add items to the bill before checking out.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
        const saleData = {
            items: cart,
            customer_name: customerName || 'Walk-in Customer',
            customer_id: customerId,
            subtotal,
            tax,
            total,
        };
      await createSale(saleData);
      toast({
        title: 'Sale Complete!',
        description: 'The transaction has been recorded.',
      });
      // Reset state
      setCart([]);
      setCustomerName('');
      setCustomerId('');
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

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
      {/* Left Column: Product Search */}
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for products..."
              className="pl-8"
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
                  <TableHead>Price</TableHead>
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
                    <TableCell>LKR {product.selling_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => addToCart(product)}>Add</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
             {filteredProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
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
            {/* Customer Details */}
            <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Customer Details</h3>
                <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Customer Name" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    <Input placeholder="Customer ID (Optional)" value={customerId} onChange={e => setCustomerId(e.target.value)} />
                </div>
            </div>

            {/* Cart Items */}
            <ScrollArea className="h-[35vh] border-t border-b py-2">
                {cart.length > 0 ? (
                    cart.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-2">
                      <Avatar className="h-10 w-10 rounded-md">
                         <AvatarImage src={item.image || 'https://placehold.co/40x40.png'} alt={item.name} data-ai-hint="product image" />
                        <AvatarFallback>{item.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          LKR {item.price_per_unit.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                        <span className="w-6 text-center">{item.quantity}</span>
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
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <FileText className="h-10 w-10" />
                        <p className="mt-2 text-sm">Your bill is empty.</p>
                        <p className="text-xs">Add products from the left.</p>
                    </div>
                )}
            </ScrollArea>
            
            {/* Bill Summary */}
            {cart.length > 0 && (
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>LKR {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tax (5%)</span>
                        <span>LKR {tax.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                        <span>Total</span>
                        <span>LKR {total.toFixed(2)}</span>
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
  );
}
