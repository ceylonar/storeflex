
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
import { MoreHorizontal, PlusCircle, Trash2, Pencil, History, User } from 'lucide-react';
import type { Customer } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { createCustomer, updateCustomer, deleteCustomer } from '@/lib/queries';
import { cn } from '@/lib/utils';
import type { SelectableCustomer } from './customers-client';


type FormState = 'add' | 'edit';

const initialCustomerState: Partial<Customer> = {
  id: '',
  name: '',
  phone: '',
};

interface CustomersTableProps {
    customers: Customer[];
    onViewHistory: (customer: SelectableCustomer) => void;
    onCustomerCreated: (customer: Customer) => void;
    onCustomerUpdated: (customer: Customer) => void;
    onCustomerDeleted: (id: string) => void;
}

export function CustomersTable({ customers, onViewHistory, onCustomerCreated, onCustomerUpdated, onCustomerDeleted }: CustomersTableProps) {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [formState, setFormState] = React.useState<FormState>('add');
  const [selectedCustomer, setSelectedCustomer] = React.useState<Partial<Customer>>(initialCustomerState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const handleOpenDialog = (state: FormState, customer?: Customer) => {
    setFormState(state);
    setSelectedCustomer(customer || initialCustomerState);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id);
      onCustomerDeleted(id);
      toast({
        title: 'Success',
        description: 'Customer deleted successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete customer.',
      });
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      if (formState === 'add') {
        const newCustomer = await createCustomer(formData);
        if (newCustomer) {
            onCustomerCreated(newCustomer);
            toast({ title: 'Success', description: 'Customer added.' });
        }
      } else if (selectedCustomer.id) {
        const updatedCustomerData = await updateCustomer(selectedCustomer.id, formData);
        if (updatedCustomerData) {
            onCustomerUpdated(updatedCustomerData);
            toast({ title: 'Success', description: 'Customer updated.' });
        }
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
                <CardTitle>All Customers</CardTitle>
                <CardDescription>A list of all customers in your records.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 <Button size="sm" variant="outline" className="gap-1 w-full" onClick={() => onViewHistory({id: 'walk-in', name: 'Walk-in Customer'})}>
                    <User className="h-4 w-4" />
                    View Walk-in History
                </Button>
                <Button size="sm" className="gap-1 w-full" onClick={() => handleOpenDialog('add')}>
                    <PlusCircle className="h-4 w-4" />
                    Add Customer
                </Button>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead>Credit Balance</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-mono text-sm">{customer.id}</TableCell>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.phone}</TableCell>
                <TableCell className={cn(customer.credit_balance > 0 ? "text-destructive" : "text-muted-foreground")}>
                    LKR {(customer.credit_balance || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewHistory(customer)}>
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
                        <DropdownMenuItem onClick={() => handleOpenDialog('edit', customer)}>
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
                                  This action cannot be undone. This will permanently delete the customer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(customer.id)}>Continue</AlertDialogAction>
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
              <DialogTitle>{formState === 'add' ? 'Add New Customer' : 'Edit Customer'}</DialogTitle>
              <DialogDescription>
                Fill in the details for the customer.
              </DialogDescription>
            </DialogHeader>
            <form ref={formRef} onSubmit={handleSubmit} className="py-4 space-y-4">
                <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={selectedCustomer.name} />
                </div>
                <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" defaultValue={selectedCustomer.phone} />
                </div>
            </form>
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="secondary">Cancel</Button>
                </DialogClose>
                <Button type="submit" onClick={() => formRef.current?.requestSubmit()}>Save Customer</Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </Card>
  );
}
