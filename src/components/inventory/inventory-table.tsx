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
import { MoreHorizontal, PlusCircle, Trash2, Pencil } from 'lucide-react';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { createProduct, updateProduct, deleteProduct } from '@/lib/queries';

type FormState = 'add' | 'edit';

const initialProductState = {
  id: '',
  name: '',
  sku: '',
  category: '',
  stock: 0,
  cost_price: 0,
  selling_price: 0,
  image: '',
};

export function InventoryTable({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState>('add');
  const [selectedProduct, setSelectedProduct] = React.useState<Partial<Product>>(initialProductState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleOpenDialog = (state: FormState, product?: Product) => {
    setFormState(state);
    setSelectedProduct(product || initialProductState);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      if (formState === 'add') {
        await createProduct(formData);
        toast({ title: 'Success', description: 'Product added.' });
      } else if (selectedProduct.id) {
        await updateProduct(selectedProduct.id, formData);
        toast({ title: 'Success', description: 'Product updated.' });
      }
      // This is a simple way to refresh data, a more robust solution might involve re-fetching.
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
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Products</CardTitle>
                <CardDescription>A list of all products in your inventory.</CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={() => handleOpenDialog('add')}>
              <PlusCircle className="h-4 w-4" />
              Add Product
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden w-[100px] sm:table-cell">
                <span className="sr-only">Image</span>
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden md:table-cell">Stock</TableHead>
              <TableHead className="hidden md:table-cell">Cost Price</TableHead>
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
                  <Image
                    alt={product.name}
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={product.image || 'https://placehold.co/64x64.png'}
                    width="64"
                    data-ai-hint="product image"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>{product.sku}</TableCell>
                <TableCell>
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{product.stock}</TableCell>
                <TableCell className="hidden md:table-cell">${Number(product.cost_price).toFixed(2)}</TableCell>
                <TableCell>${Number(product.selling_price).toFixed(2)}</TableCell>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <form ref={formRef} onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{formState === 'add' ? 'Add New Product' : 'Edit Product'}</DialogTitle>
                <DialogDescription>
                  Fill in the details for the product.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" name="name" defaultValue={selectedProduct.name} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sku" className="text-right">SKU</Label>
                  <Input id="sku" name="sku" defaultValue={selectedProduct.sku} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="category" className="text-right">Category</Label>
                  <Input id="category" name="category" defaultValue={selectedProduct.category} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="stock" className="text-right">Stock</Label>
                  <Input id="stock" name="stock" type="number" defaultValue={selectedProduct.stock} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cost_price" className="text-right">Cost Price</Label>
                  <Input id="cost_price" name="cost_price" type="number" step="0.01" defaultValue={selectedProduct.cost_price} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="selling_price" className="text-right">Selling Price</Label>
                  <Input id="selling_price" name="selling_price" type="number" step="0.01" defaultValue={selectedProduct.selling_price} className="col-span-3" />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="image" className="text-right">Image URL</Label>
                  <Input id="image" name="image" defaultValue={selectedProduct.image} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button type="submit">Save Product</Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
