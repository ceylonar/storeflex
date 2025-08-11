

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
} from "@/components/ui/select"

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Trash2, Pencil, History, Loader2, Wand2, Barcode, Printer } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { createProduct, updateProduct, deleteProduct } from '@/lib/queries';
import { getProductDetailsFromBarcode } from '@/lib/actions';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import ReactBarcode from 'react-barcode';

type FormState = 'add' | 'edit';

const initialProductState: Partial<Product> = {
  id: '',
  type: 'product',
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
    productType: 'product' | 'service';
    onProductCreated: () => void;
    onProductUpdated: () => void;
    onProductDeleted: (id: string) => void;
    onViewHistory: (product: Product) => void;
}

export function InventoryTable({ products, productType, onProductCreated, onProductUpdated, onProductDeleted, onViewHistory }: InventoryTableProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isFetchingBarcode, setIsFetchingBarcode] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState>('add');
  const [selectedProduct, setSelectedProduct] = React.useState<Partial<Product>>(initialProductState);
  const [aiSuggestions, setAiSuggestions] = React.useState<{name: string, brand?: string, category: string} | null>(null);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  
  // For hardware scanner input
  const barcodeChars = React.useRef<string[]>([]);
  const lastKeystrokeTime = React.useRef<number>(0);

  const handleOpenDialog = (state: FormState, product?: Product) => {
    setFormState(state);
    const initialDialogState = product ? product : { ...initialProductState, type: productType };
    setSelectedProduct(initialDialogState);
    setAiSuggestions(null); // Clear previous suggestions
    setIsDialogOpen(true);
  };

  const handleGenerateBarcode = () => {
    const timestamp = Date.now().toString();
    const uniqueBarcode = timestamp.substring(timestamp.length - 12);
    // Update the form state directly if you are using a controlled component approach
    // For this form, we'll update the selectedProduct state, which will be used as defaultValue
    setSelectedProduct(prev => ({...prev, barcode: uniqueBarcode}));
    toast({ title: "Barcode Generated", description: "A new unique barcode has been generated." });
  };
  
  const handlePrintBarcode = () => {
    if (!selectedProduct.barcode || !selectedProduct.name) {
        toast({variant: 'destructive', title: "Missing Details", description: "Product name and barcode are required to print."});
        return;
    }
    const printableContent = `
        <html>
            <head>
                <title>Print Barcode</title>
                <style>
                    @media print {
                        @page { 
                            size: 3in 2in;
                            margin: 0;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100%;
                            font-family: sans-serif;
                            text-align: center;
                        }
                    }
                    body {
                       font-family: sans-serif;
                       text-align: center;
                       padding: 20px;
                       display: flex;
                       flex-direction: column;
                       justify-content: center;
                       align-items: center;
                       height: 100vh;
                    }
                    h1 { font-size: 14px; margin: 0 0 5px 0; max-width: 90%; word-wrap: break-word; }
                </style>
            </head>
            <body>
                <div>
                    <h1>${selectedProduct.name}</h1>
                    <div id="barcode-container"></div>
                </div>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"><\/script>
                <script>
                    window.onload = function() {
                        const container = document.getElementById('barcode-container');
                        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        container.appendChild(svg);
                        JsBarcode(svg, "${selectedProduct.barcode}", {
                            format: "CODE128",
                            displayValue: true,
                            fontSize: 14,
                            margin: 5,
                            width: 2,
                            height: 50,
                        });
                        window.print();
                        window.close();
                    }
                <\/script>
            </body>
        </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow?.document.write(printableContent);
    printWindow?.document.close();
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
    setIsDialogOpen(true);
    setFormState('add');
    setIsFetchingBarcode(true);
    setAiSuggestions(null);
    
    setSelectedProduct({ ...initialProductState, type: 'product', barcode: decodedText });

    toast({
        title: 'Scan Successful',
        description: `Barcode: ${decodedText}. Fetching product details...`
    });

    const result = await getProductDetailsFromBarcode(decodedText);
    if (result.success && result.data) {
        const suggestions = {
            name: result.data.name,
            brand: result.data.brand || '',
            category: result.data.category
        };
        setSelectedProduct(prev => ({ ...prev, ...suggestions }));
        setAiSuggestions(suggestions);
        toast({ title: 'Success', description: 'Product details populated by AI.' });
    } else {
        toast({ variant: 'destructive', title: 'AI Lookup Failed', description: result.message });
    }
    setIsFetchingBarcode(false);
  }, [toast]);

  // Effect for hardware barcode scanner
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA' || isDialogOpen)) {
        return;
      }

      const currentTime = new Date().getTime();
      
      if (currentTime - lastKeystrokeTime.current > 100) {
        barcodeChars.current = [];
      }
      
      if (e.key === 'Enter') {
        if (barcodeChars.current.length > 5) {
          handleScanSuccess(barcodeChars.current.join(''));
        }
        barcodeChars.current = [];
      } else {
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
        await createProduct(formData);
        onProductCreated();
        toast({ title: 'Success', description: 'Item added.' });
      } else if (selectedProduct.id) {
        await updateProduct(selectedProduct.id, formData);
        onProductUpdated();
        toast({ title: 'Success', description: 'Item updated.' });
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
                <CardTitle>Inventory Items</CardTitle>
                <CardDescription>A list of all {productType}s in your inventory.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button size="sm" className="gap-1 w-full" onClick={() => handleOpenDialog('add')}>
                  <PlusCircle className="h-4 w-4" />
                  Add {productType === 'product' ? 'Product' : 'Service'}
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
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              {productType === 'product' && <TableHead>Stock</TableHead>}
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
                <TableCell className="font-mono text-xs">{product.id}</TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                {productType === 'product' && <TableCell>{product.stock}</TableCell>}
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
                                  This action cannot be undone. This will permanently delete this item.
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
              <DialogTitle>{formState === 'add' ? 'Add New Item' : 'Edit Item'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the inventory item.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] -mx-6 px-6">
                 {isFetchingBarcode ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Looking up barcode...</p>
                    </div>
                  ) : (
                    <form key={selectedProduct.id || 'new'} ref={formRef} onSubmit={handleSubmit} className="py-4 space-y-4">
                        {aiSuggestions && (
                            <Alert>
                                <Wand2 className="h-4 w-4" />
                                <AlertTitle>AI Suggestions</AlertTitle>
                                <AlertDescription>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm">
                                        <span className="font-semibold">Name:</span><span>{aiSuggestions.name}</span>
                                        <span className="font-semibold">Brand:</span><span>{aiSuggestions.brand}</span>
                                        <span className="font-semibold">Category:</span><span>{aiSuggestions.category}</span>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="type">Item Type</Label>
                            <Select name="type" defaultValue={selectedProduct.type} onValueChange={(value: 'product' | 'service') => setSelectedProduct(prev => ({...prev, type: value}))}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an item type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="product">Product</SelectItem>
                                    <SelectItem value="service">Service</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" name="name" defaultValue={selectedProduct.name} onChange={(e) => setSelectedProduct(prev => ({...prev, name: e.target.value}))}/>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                             <Input id="category" name="category" defaultValue={selectedProduct.category} />
                        </div>
                        
                        <div className="space-y-2">
                            <Label htmlFor="selling_price">Selling Price (LKR)</Label>
                            <Input id="selling_price" name="selling_price" type="number" step="0.01" defaultValue={selectedProduct.selling_price} />
                        </div>
                        
                        {selectedProduct.type === 'product' && (
                             <>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sku">SKU (optional)</Label>
                                        <Input id="sku" name="sku" defaultValue={selectedProduct.sku} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="barcode">Barcode</Label>
                                        <div className="flex gap-2">
                                          <Input id="barcode" name="barcode" value={selectedProduct.barcode || ''} onChange={(e) => setSelectedProduct(prev => ({...prev, barcode: e.target.value}))}/>
                                          <Button type="button" variant="outline" size="icon" onClick={handleGenerateBarcode}><Barcode className="h-4 w-4"/></Button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brand">Brand</Label>
                                    <Input id="brand" name="brand" defaultValue={selectedProduct.brand} />
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="sub_category">Sub Category</Label>
                                        <Input id="sub_category" name="sub_category" defaultValue={selectedProduct.sub_category} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cost_price">Cost Price (LKR)</Label>
                                        <Input id="cost_price" name="cost_price" type="number" step="0.01" defaultValue={selectedProduct.cost_price} />
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
                                <div className="space-y-2">
                                    <Label htmlFor="image">Image URL</Label>
                                    <Input id="image" name="image" defaultValue={selectedProduct.image} />
                                </div>
                                {selectedProduct.barcode && (
                                    <div className='pt-4'>
                                        <ReactBarcode value={selectedProduct.barcode} width={1} height={50} fontSize={12} />
                                    </div>
                                )}
                             </>
                        )}
                    </form>
                )}
            </ScrollArea>
            <DialogFooter className="pt-4 justify-between">
                {selectedProduct.type === 'product' ? (
                     <Button type="button" variant="outline" onClick={handlePrintBarcode} disabled={!selectedProduct.barcode}>
                        <Printer className="mr-2 h-4 w-4"/>
                        Print Barcode
                    </Button>
                ) : <div />}
                <div className="flex gap-2">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" onClick={() => formRef.current?.requestSubmit()} disabled={isFetchingBarcode}>Save Item</Button>
                </div>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
