
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
import { MoreHorizontal, PlusCircle, Trash2, Pencil, History } from 'lucide-react';
import type { Supplier } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { createSupplier, updateSupplier, deleteSupplier } from '@/lib/queries';

type FormState = 'add' | 'edit';

const initialSupplierState: Partial<Supplier> = {
  id: '',
  name: '',
  phone: '',
};

interface SuppliersTableProps {
    initialSuppliers: Supplier[];
    onViewHistory: (supplier: Supplier) => void;
}

export function SuppliersTable({ initialSuppliers, onViewHistory }: SuppliersTableProps) {
  const [suppliers, setSuppliers] = React.useState<Supplier[]>(initialSuppliers);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState>('add');
  const [selectedSupplier, setSelectedSupplier] = React.useState<Partial<Supplier>>(initialSupplierState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleOpenDialog = (state: FormState, supplier?: Supplier) => {
    setFormState(state);
    setSelectedSupplier(supplier || initialSupplierState);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSupplier(id);
      setSuppliers(suppliers.filter(s => s.id !== id));
      toast({
        title: 'Success',
        description: 'Supplier deleted successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete supplier.',
      });
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      if (formState === 'add') {
        const newSupplier = await createSupplier(formData);
        if (newSupplier) {
            setSuppliers(prev => [newSupplier, ...prev]);
        }
        toast({ title: 'Success', description: 'Supplier added.' });
      } else if (selectedSupplier.id) {
        await updateSupplier(selectedSupplier.id, formData);
        const updatedSuppliers = suppliers.map(s => s.id === selectedSupplier.id ? {...s, ...Object.fromEntries(formData)} : s);
        setSuppliers(updatedSuppliers as Supplier[]);
        toast({ title: 'Success', description: 'Supplier updated.' });
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
                <CardTitle>All Suppliers</CardTitle>
                <CardDescription>A list of all suppliers in your records.</CardDescription>
            </div>
            <Button size="sm" className="gap-1 w-full sm:w-auto" onClick={() => handleOpenDialog('add')}>
              <PlusCircle className="h-4 w-4" />
              Add Supplier
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-mono text-sm">{supplier.id}</TableCell>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.phone}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewHistory(supplier)}>
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
                        <DropdownMenuItem onClick={() => handleOpenDialog('edit', supplier)}>
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
                                  This action cannot be undone. This will permanently delete the supplier.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(supplier.id)}>Continue</AlertDialogAction>
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
              <DialogTitle>{formState === 'add' ? 'Add New Supplier' : 'Edit Supplier'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the supplier.
              </DialogDescription>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleSubmit} className="py-4 space-y-4">
                <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={selectedSupplier.name} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" defaultValue={selectedSupplier.phone} />
                </div>
            </form>
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={() => formRef.current?.requestSubmit()}>Save Supplier</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
