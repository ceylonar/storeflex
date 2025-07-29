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

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Trash2, Pencil, History, ScanLine, Loader2 } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { createProduct, updateProduct, deleteProduct } from '@/lib/queries';
import { getProductDetailsFromBarcode } from '@/lib/actions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import dynamic from 'next/dynamic';
import { Skeleton } from '../ui/skeleton';

const BarcodeScanner = dynamic(() => import('./barcode-scanner'), { 
    ssr: false,
    loading: () => <Skeleton className="h-48 w-full" /> 
});


type FormState = 'add' | 'edit';

const initialProductState: Partial<Product> = {
  id: '',
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

interface InventoryTableProps {
    products: Product[];
    onProductCreated: (product: Product) => void;
    onProductUpdated: (product: Product) => void;
    onProductDeleted: (id: string) => void;
    onViewHistory: (product: Product) => void;
}

export function InventoryTable({ products, onProductCreated, onProductUpdated, onProductDeleted, onViewHistory }: InventoryTableProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [isFetchingBarcode, setIsFetchingBarcode] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState>('add');
  const [selectedProduct, setSelectedProduct] = React.useState<Partial<Product>>(initialProductState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  
  // For hardware scanner input
  const barcodeChars = React.useRef<string[]>([]);
  const lastKeystrokeTime = React.useRef<number>(0);

  const handleOpenDialog = (state: FormState, product?: Product) => {
    setFormState(state);
    setSelectedProduct(product || initialProductState);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      onProductDeleted(id);
      toast({
        title: 'Success',
        description: 'Product deleted successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete product.',
      });
    }
  }

  const handleScanSuccess = React.useCallback(async (decodedText: string) => {
    setIsScannerOpen(false);
    setIsDialogOpen(true);
    setFormState('add'); // Always treat a scan as adding a new product
    setIsFetchingBarcode(true);
    
    setSelectedProduct({ ...initialProductState, barcode: decodedText });

    toast({
        title: 'Scan Successful',
        description: `Barcode: ${decodedText}. Fetching product details...`
    });

    const result = await getProductDetailsFromBarcode(decodedText);
    if (result.success && result.data) {
        setSelectedProduct(prev => ({
            ...prev,
            name: result.data!.name,
            brand: result.data!.brand || '',
            category: result.data!.category,
        }));
        toast({ title: 'Success', description: 'Product details populated by AI.' });
    } else {
        toast({ variant: 'destructive', title: 'AI Lookup Failed', description: result.message });
    }
    setIsFetchingBarcode(false);
  }, [toast]);

  // Effect for hardware barcode scanner
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore keypresses if a dialog or input is focused
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || isDialogOpen)) {
        return;
      }

      const currentTime = new Date().getTime();
      
      // Reset if the time between keystrokes is too long (e.g., >100ms)
      if (currentTime - lastKeystrokeTime.current > 100) {
        barcodeChars.current = [];
      }
      
      if (e.key === 'Enter') {
        if (barcodeChars.current.length > 5) { // Minimum length for a barcode
          handleScanSuccess(barcodeChars.current.join(''));
        }
        barcodeChars.current = [];
      } else {
        // Add character to the buffer
        if(e.key.length === 1) barcodeChars.current.push(e.key);
      }
      
      lastKeystrokeTime.current = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleScanSuccess, isDialogOpen]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      if (formState === 'add') {
        const newProduct = await createProduct(formData);
        if (newProduct) onProductCreated(newProduct);
        toast({ title: 'Success', description: 'Product added.' });
      } else if (selectedProduct.id) {
        const updatedProduct = await updateProduct(selectedProduct.id, formData);
        if (updatedProduct) onProductUpdated(updatedProduct);
        toast({ title: 'Success', description: 'Product updated.' });
      }
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
                <CardTitle>Products</CardTitle>
                <CardDescription>A list of all products in your inventory.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button size="sm" className="gap-1 w-full" onClick={() => handleOpenDialog('add')}>
                  <PlusCircle className="h-4 w-4" />
                  Add Product
                </Button>
                <Button size="sm" variant="outline" className="gap-1 w-full" onClick={() => setIsScannerOpen(true)}>
                    <ScanLine className="h-4 w-4" />
                    Scan to Add
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[80px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden lg:table-cell">Brand</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="hidden sm:table-cell">
                  <Avatar className="h-12 w-12 rounded-md">
                    <AvatarImage src={product.image || 'https://placehold.co/64x64.png'} alt={product.name} data-ai-hint="product image" className="aspect-square object-cover" />
                    <AvatarFallback>{product.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="hidden lg:table-cell">{product.brand}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>LKR {Number(product.selling_price).toFixed(2)}</TableCell>
                <TableCell>
                 <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewHistory(product)}>
                        <History className="h-4 w-4 mr-2" />
                        View History
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button aria-haspopup="true" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleOpenDialog('edit', product)}>
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
                                  This action cannot be undone. This will permanently delete the product.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(product.id)}>Continue</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{formState === 'add' ? 'Add New Product' : 'Edit Product'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the product.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                 {isFetchingBarcode ? (
                    <div className="flex items-center justify-center h-48">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <form key={JSON.stringify(selectedProduct)} ref={formRef} onSubmit={handleSubmit} className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" defaultValue={selectedProduct.name} />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU</Label>
                                <Input id="sku" name="sku" defaultValue={selectedProduct.sku} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="barcode">Barcode</Label>
                                <div className="flex items-center gap-2">
                                    <Input id="barcode" name="barcode" defaultValue={selectedProduct.barcode} />
                                </div>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="brand">Brand</Label>
                            <Input id="brand" name="brand" defaultValue={selectedProduct.brand} />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input id="category" name="category" defaultValue={selectedProduct.category} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sub_category">Sub Category</Label>
                                <Input id="sub_category" name="sub_category" defaultValue={selectedProduct.sub_category} />
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label htmlFor="stock">Stock</Label>
                            <Input id="stock" name="stock" type="number" defaultValue={selectedProduct.stock} />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="low_stock_threshold">Low Stock Level</Label>
                            <Input id="low_stock_threshold" name="low_stock_threshold" type="number" defaultValue={selectedProduct.low_stock_threshold} />
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                            <Label htmlFor="cost_price">Cost Price (LKR)</Label>
                            <Input id="cost_price" name="cost_price" type="number" step="0.01" defaultValue={selectedProduct.cost_price} />
                            </div>
                            <div className="space-y-2">
                            <Label htmlFor="selling_price">Selling Price (LKR)</Label>
                            <Input id="selling_price" name="selling_price" type="number" step="0.01" defaultValue={selectedProduct.selling_price} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="image">Image URL</Label>
                            <Input id="image" name="image" defaultValue={selectedProduct.image} />
                        </div>
                    </form>
                )}
            </ScrollArea>
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={() => formRef.current?.requestSubmit()} disabled={isFetchingBarcode}>Save Product</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
      {isScannerOpen && (
          <BarcodeScanner 
            open={isScannerOpen} 
            onClose={() => setIsScannerOpen(false)}
            onScanSuccess={handleScanSuccess}
          />
      )}
    </Card>
  );
}
