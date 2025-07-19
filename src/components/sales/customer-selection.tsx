
'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createCustomer } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/types';
import { UserPlus, Users, X } from 'lucide-react';

interface CustomerSelectionProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
  onCustomerCreated: (customer: Customer) => void;
}

export function CustomerSelection({
  customers,
  selectedCustomer,
  onSelectCustomer,
  onCustomerCreated,
}: CustomerSelectionProps) {
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const addCustomerFormRef = React.useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const handleCreateCustomer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const newCustomer = await createCustomer(formData);
      if (newCustomer) {
        onCustomerCreated(newCustomer);
        toast({ title: 'Success', description: 'New customer added and selected.' });
      }
      setIsCreateOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Failed to add new customer.',
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label>Customer</Label>
      <div className="flex items-center gap-2 rounded-md border border-input p-2">
        <div className="flex-1">
          <p className="text-sm font-medium">
            {selectedCustomer ? selectedCustomer.name : 'Walk-in Customer'}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedCustomer ? selectedCustomer.phone : 'No customer selected'}
          </p>
        </div>
        {selectedCustomer && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onSelectCustomer(null)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear customer</span>
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Dialog open={isSelectOpen} onOpenChange={setIsSelectOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" /> Select Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select an Existing Customer</DialogTitle>
            </DialogHeader>
            <Command>
              <CommandInput placeholder="Search by name or phone..." />
              <CommandList>
                <ScrollArea className="h-[300px]">
                  <CommandEmpty>No customer found.</CommandEmpty>
                  <CommandGroup>
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={`${customer.name} ${customer.phone}`}
                        onSelect={() => {
                          onSelectCustomer(customer);
                          setIsSelectOpen(false);
                        }}
                      >
                        <div>
                          <p>{customer.name}</p>
                          <p className="text-xs text-muted-foreground">{customer.phone}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>
          </DialogContent>
        </Dialog>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              <UserPlus className="mr-2 h-4 w-4" /> Add New
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
              <DialogDescription>
                The new customer will be automatically selected for this sale.
              </DialogDescription>
            </DialogHeader>
            <form ref={addCustomerFormRef} onSubmit={handleCreateCustomer} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name</Label>
                <Input id="name" name="name" placeholder="John Doe" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" name="phone" placeholder="0771234567" />
              </div>
            </form>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" onClick={() => addCustomerFormRef.current?.requestSubmit()}>
                Create & Select
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
