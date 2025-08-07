
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClipboardList, PlusCircle, Trash2, Loader2, Package, ShoppingCart } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import type { ProductSelect, Customer, Supplier, SalesOrder, PurchaseOrder, OrderItem } from '@/lib/types';
import { FormattedDate } from '@/components/ui/formatted-date';
import { CustomerSelection } from '@/components/sales/customer-selection';
import { SupplierSelection } from '@/components/buy/supplier-selection';

import { createSalesOrder, createPurchaseOrder, processSalesOrder, processPurchaseOrder, fetchPendingOrders } from '@/lib/queries';

type CombinedOrder = (SalesOrder & { type: 'sale' }) | (PurchaseOrder & { type: 'purchase' });

// --- SALES ORDER CREATION COMPONENT ---
function CreateSalesOrder({ products, customers, onOrderCreated }: { products: ProductSelect[], customers: Customer[], onOrderCreated: (order: SalesOrder) => void }) {
    const [cart, setCart] = React.useState<OrderItem[]>([]);
    const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null);
    const [allCustomers, setAllCustomers] = React.useState(customers);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    const handleCustomerCreated = (newCustomer: Customer) => {
        setAllCustomers(prev => [newCustomer, ...prev]);
        setSelectedCustomer(newCustomer);
    };

    const addToCart = (product: ProductSelect) => {
        setCart(prev => [...prev, {
            id: product.id,
            name: product.name,
            type: product.type,
            quantity: 1,
            price_per_unit: product.selling_price,
            cost_price: 0, // not relevant for sales order
            total_amount: product.selling_price,
            image: product.image,
            sku: product.id
        }]);
    };
    
    const updateCartItem = (id: string, field: 'quantity' | 'price_per_unit', value: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if(field === 'quantity' && value <= 0) return null;
                updatedItem.total_amount = updatedItem.quantity * updatedItem.price_per_unit;
                return updatedItem;
            }
            return item;
        }).filter(Boolean) as OrderItem[]);
    };

    const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

    const subtotal = cart.reduce((acc, item) => acc + item.total_amount, 0);

    const handleCreateOrder = async () => {
        if (cart.length === 0) {
            toast({ variant: 'destructive', title: 'Empty Order', description: 'Please add items to the order.' });
            return;
        }
        if (!selectedCustomer) {
            toast({ variant: 'destructive', title: 'Customer Required', description: 'Please select a customer.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const orderData = {
                items: cart,
                customer_id: selectedCustomer.id,
                customer_name: selectedCustomer.name,
                subtotal: subtotal,
                total_amount: subtotal, // simplified for now
            };
            const newOrder = await createSalesOrder(orderData);
            if(newOrder) {
                toast({ title: 'Sales Order Created', description: `Order ${newOrder.id} has been saved.` });
                onOrderCreated(newOrder);
                setCart([]);
                setSelectedCustomer(null);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-8">
            <Card className="lg:col-span-3">
                <CardHeader><CardTitle>Available Products & Services</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh]">
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Price</TableHead><TableHead>Stock</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {products.map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.name}</TableCell>
                                        <TableCell>LKR {p.selling_price.toFixed(2)}</TableCell>
                                        <TableCell>{p.type === 'product' ? p.stock : 'N/A'}</TableCell>
                                        <TableCell className="text-right"><Button size="sm" onClick={() => addToCart(p)} disabled={cart.some(i => i.id === p.id)}>Add</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2 sticky top-24">
                <CardHeader><CardTitle>New Sales Order</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <CustomerSelection customers={allCustomers} selectedCustomer={selectedCustomer} onSelectCustomer={setSelectedCustomer} onCustomerCreated={handleCustomerCreated} />
                    <ScrollArea className="h-[40vh] border-y py-2">
                        {cart.length > 0 ? cart.map(item => (
                            <div key={item.id} className="flex items-center gap-2 py-2 border-b">
                                <Avatar><AvatarImage src={item.image} /><AvatarFallback>{item.name.charAt(0)}</AvatarFallback></Avatar>
                                <div className="flex-1"><p className="font-medium text-sm">{item.name}</p></div>
                                <Input type="number" value={item.quantity} onChange={e => updateCartItem(item.id, 'quantity', Number(e.target.value))} className="w-16 h-8"/>
                                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        )) : <p className="text-center text-muted-foreground py-4">No items added.</p>}
                    </ScrollArea>
                    <div className="flex justify-between font-bold"><span>Total</span><span>LKR {subtotal.toFixed(2)}</span></div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleCreateOrder} disabled={isSubmitting || !selectedCustomer || cart.length === 0}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null} Create Sales Order
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}


// --- PURCHASE ORDER CREATION COMPONENT ---
function CreatePurchaseOrder({ products, suppliers, onOrderCreated }: { products: ProductSelect[], suppliers: Supplier[], onOrderCreated: (order: PurchaseOrder) => void }) {
    const [cart, setCart] = React.useState<OrderItem[]>([]);
    const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null);
    const [allSuppliers, setAllSuppliers] = React.useState(suppliers);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();
    
    const handleSupplierCreated = (newSupplier: Supplier) => {
        setAllSuppliers(prev => [newSupplier, ...prev]);
        setSelectedSupplier(newSupplier);
    };

    const addToCart = (product: ProductSelect) => {
        setCart(prev => [...prev, {
            id: product.id,
            name: product.name,
            type: product.type,
            quantity: 1,
            price_per_unit: 0, // not relevant
            cost_price: product.cost_price,
            total_amount: product.cost_price,
            image: product.image,
            sku: product.id,
        }]);
    };

     const updateCartItem = (id: string, field: 'quantity' | 'cost_price', value: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if(field === 'quantity' && value <= 0) return null;
                updatedItem.total_amount = updatedItem.quantity * updatedItem.cost_price;
                return updatedItem;
            }
            return item;
        }).filter(Boolean) as OrderItem[]);
    };

    const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));
    
    const subtotal = cart.reduce((acc, item) => acc + item.total_amount, 0);

    const handleCreateOrder = async () => {
        if (cart.length === 0 || !selectedSupplier) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please select a supplier and add items.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const orderData = {
                items: cart,
                supplier_id: selectedSupplier.id,
                supplier_name: selectedSupplier.name,
                subtotal,
                total_amount: subtotal,
            };
            const newOrder = await createPurchaseOrder(orderData);
            if(newOrder) {
                toast({ title: 'Purchase Order Created', description: `Order ${newOrder.id} has been saved.` });
                onOrderCreated(newOrder);
                setCart([]);
                setSelectedSupplier(null);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    };

     return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:gap-8">
            <Card className="lg:col-span-3">
                <CardHeader><CardTitle>Available Products</CardTitle></CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh]">
                         <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Cost</TableHead><TableHead>Stock</TableHead><TableHead className="text-right"></TableHead></TableRow></TableHeader>
                            <TableBody>
                                {products.filter(p => p.type === 'product').map(p => (
                                    <TableRow key={p.id}>
                                        <TableCell>{p.name}</TableCell>
                                        <TableCell>LKR {p.cost_price.toFixed(2)}</TableCell>
                                        <TableCell>{p.stock}</TableCell>
                                        <TableCell className="text-right"><Button size="sm" onClick={() => addToCart(p)} disabled={cart.some(i => i.id === p.id)}>Add</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </CardContent>
            </Card>
            <Card className="lg:col-span-2 sticky top-24">
                <CardHeader><CardTitle>New Purchase Order</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <SupplierSelection suppliers={allSuppliers} selectedSupplier={selectedSupplier} onSelectSupplier={setSelectedSupplier} onSupplierCreated={handleSupplierCreated} />
                    <ScrollArea className="h-[40vh] border-y py-2">
                        {cart.length > 0 ? cart.map(item => (
                             <div key={item.id} className="flex items-center gap-2 py-2 border-b">
                                <Avatar><AvatarImage src={item.image} /><AvatarFallback>{item.name.charAt(0)}</AvatarFallback></Avatar>
                                <div className="flex-1"><p className="font-medium text-sm">{item.name}</p></div>
                                <Input type="number" value={item.quantity} onChange={e => updateCartItem(item.id, 'quantity', Number(e.target.value))} className="w-16 h-8"/>
                                <Button variant="ghost" size="icon" onClick={() => removeFromCart(item.id)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                        )) : <p className="text-center text-muted-foreground py-4">No items added.</p>}
                    </ScrollArea>
                    <div className="flex justify-between font-bold"><span>Total</span><span>LKR {subtotal.toFixed(2)}</span></div>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" onClick={handleCreateOrder} disabled={isSubmitting || !selectedSupplier || cart.length === 0}>
                         {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null} Create Purchase Order
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}

// --- PENDING ORDERS MANAGEMENT COMPONENT ---
function PendingOrders({ initialOrders, onOrderProcessed }: { initialOrders: CombinedOrder[], onOrderProcessed: (orderId: string) => void }) {
    const [processingId, setProcessingId] = React.useState<string | null>(null);
    const { toast } = useToast();

    const handleProcessOrder = async (order: CombinedOrder) => {
        setProcessingId(order.id);
        try {
            if(order.type === 'sale') {
                await processSalesOrder(order.id);
            } else {
                await processPurchaseOrder(order.id);
            }
            toast({ title: 'Order Processed', description: `Order ${order.id} has been completed and relevant records updated.` });
            onOrderProcessed(order.id);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Processing Failed', description: (error as Error).message });
        } finally {
            setProcessingId(null);
        }
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Pending Sales & Purchase Orders</CardTitle>
                <CardDescription>Review and process outstanding orders.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[70vh]">
                     {initialOrders.length === 0 && <p className="text-muted-foreground text-center py-8">No pending orders found.</p>}
                     <Accordion type="single" collapsible className="w-full">
                        {initialOrders.map((order) => (
                            <AccordionItem value={order.id} key={order.id}>
                                <AccordionTrigger>
                                    <div className="flex justify-between w-full items-center pr-4">
                                        <div className="flex items-center gap-4">
                                            {order.type === 'sale' ? <ShoppingCart className="h-5 w-5 text-accent-foreground"/> : <Package className="h-5 w-5 text-blue-500" />}
                                            <div>
                                                <p className="font-semibold text-left">{order.id.toUpperCase()}</p>
                                                <p className="text-sm text-muted-foreground text-left">{order.type === 'sale' ? `To: ${order.customer_name}` : `From: ${order.supplier_name}`}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">LKR {order.total_amount.toFixed(2)}</p>
                                            <p className="text-sm text-muted-foreground"><FormattedDate timestamp={order.order_date} /></p>
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-4 bg-muted/50">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Qty</TableHead><TableHead>Unit Price</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {order.items.map(item => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.name}</TableCell>
                                                    <TableCell>{item.quantity}</TableCell>
                                                    <TableCell>LKR {(order.type === 'sale' ? item.price_per_unit : item.cost_price).toFixed(2)}</TableCell>
                                                    <TableCell className="text-right">LKR {item.total_amount.toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="text-right mt-4">
                                        <Button onClick={() => handleProcessOrder(order)} disabled={processingId === order.id}>
                                            {processingId === order.id ? <Loader2 className="animate-spin mr-2" /> : null}
                                            Process {order.type === 'sale' ? 'Sale' : 'Purchase'}
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}


// --- MAIN CLIENT COMPONENT ---
export function OrderClient({ products, customers, suppliers, initialOrders }: { products: ProductSelect[], customers: Customer[], suppliers: Supplier[], initialOrders: CombinedOrder[] }) {
    const [orders, setOrders] = React.useState(initialOrders);

    const refreshOrders = async () => {
        const updatedOrders = await fetchPendingOrders();
        setOrders(updatedOrders);
    }
    
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <ClipboardList className="h-8 w-8 text-primary" />
                <div>
                <h1 className="text-2xl font-bold tracking-tight">Order Management</h1>
                <p className="text-muted-foreground">
                    Create sales/purchase orders and process them to update inventory.
                </p>
                </div>
            </div>
            <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pending">Pending Orders</TabsTrigger>
                    <TabsTrigger value="sales_order">New Sales Order</TabsTrigger>
                    <TabsTrigger value="purchase_order">New Purchase Order</TabsTrigger>
                </TabsList>
                <TabsContent value="pending">
                    <PendingOrders initialOrders={orders} onOrderProcessed={refreshOrders} />
                </TabsContent>
                <TabsContent value="sales_order">
                   <CreateSalesOrder products={products} customers={customers} onOrderCreated={refreshOrders} />
                </TabsContent>
                <TabsContent value="purchase_order">
                    <CreatePurchaseOrder products={products} suppliers={suppliers} onOrderCreated={refreshOrders} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
