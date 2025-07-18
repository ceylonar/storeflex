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
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { products as initialProducts } from '@/lib/data';
import type { Product } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';

export function InventoryTable() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [products, setProducts] = React.useState<Product[]>(initialProducts);
  const [newProduct, setNewProduct] = React.useState({
    name: 'ProBook Laptop',
    sku: 'LAP-001',
    category: 'Electronics',
    stock: 15,
    costPrice: 800,
    sellingPrice: 1200,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewProduct(prev => ({
        ...prev,
        [id]: id === 'stock' || id === 'costPrice' || id === 'sellingPrice' ? Number(value) : value,
    }));
  };

  const handleAddProduct = () => {
    const productToAdd: Product = {
      id: (products.length + 1).toString(),
      image: 'https://placehold.co/40x40.png',
      ...newProduct,
    };
    setProducts(prev => [...prev, productToAdd]);
    setIsDialogOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Products</CardTitle>
                <CardDescription>A list of all products in your inventory.</CardDescription>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Product</DialogTitle>
                  <DialogDescription>
                    Fill in the details for the new product.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">Name</Label>
                    <Input id="name" value={newProduct.name} onChange={handleInputChange} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sku" className="text-right">SKU</Label>
                    <Input id="sku" value={newProduct.sku} onChange={handleInputChange} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">Category</Label>
                    <Input id="category" value={newProduct.category} onChange={handleInputChange} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="stock" className="text-right">Stock</Label>
                    <Input id="stock" type="number" value={newProduct.stock} onChange={handleInputChange} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="costPrice" className="text-right">Cost Price</Label>
                    <Input id="costPrice" type="number" value={newProduct.costPrice} onChange={handleInputChange} className="col-span-3" />
                  </div>
                   <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sellingPrice" className="text-right">Selling Price</Label>
                    <Input id="sellingPrice" type="number" value={newProduct.sellingPrice} onChange={handleInputChange} className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" onClick={handleAddProduct}>Save Product</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
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
                    alt="Product image"
                    className="aspect-square rounded-md object-cover"
                    height="64"
                    src={product.image}
                    width="64"
                    data-ai-hint="product image"
                  />
                </TableCell>
                <TableCell className="font-medium">{product.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{product.category}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">{product.stock}</TableCell>
                <TableCell className="hidden md:table-cell">${product.costPrice.toFixed(2)}</TableCell>
                <TableCell>${product.sellingPrice.toFixed(2)}</TableCell>
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
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
