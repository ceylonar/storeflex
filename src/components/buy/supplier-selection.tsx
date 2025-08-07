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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createSupplier } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/lib/types';
import { UserPlus, ChevronsUpDown } from 'lucide-react';

interface SupplierSelectionProps {
  suppliers: Supplier[];
  selectedSupplier: Supplier | null;
  onSelectSupplier: (supplier: Supplier | null) => void;
  onSupplierCreated: (supplier: Supplier) => void;
}

export function SupplierSelection({
  suppliers,
  selectedSupplier,
  onSelectSupplier,
  onSupplierCreated,
}: SupplierSelectionProps) {
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const addSupplierFormRef = React.useRef<HTMLFormElement>(null);
  const { toast } = useToast();

  const handleCreateSupplier = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      const newSupplier = await createSupplier(formData);
      if (newSupplier) {
        onSupplierCreated(newSupplier);
        toast({ title: 'Success', description: 'New supplier added and selected.' });
      }
      setIsCreateOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'Failed to add new supplier.',
      });
    }
  };

  return (
    <div className="space-y-2">
      <Label>Supplier</Label>
        <div className="flex gap-2">
        <Popover open={isSelectOpen} onOpenChange={setIsSelectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isSelectOpen}
              className="w-full justify-between"
            >
              <span className="truncate">
                {selectedSupplier
                  ? selectedSupplier.name
                  : 'Select a supplier...'}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
             <Command>
              <CommandInput placeholder="Search by name or phone..." />
              <CommandList className="max-h-[300px]">
                   <CommandEmpty>No supplier found.</CommandEmpty>
                   <CommandGroup>
                    {suppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        value={`${supplier.name} ${supplier.phone}`}
                        onSelect={() => {
                          onSelectSupplier(supplier);
                          setIsSelectOpen(false);
                        }}
                      >
                        <div>
                          <p>{supplier.name}</p>
                          <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <UserPlus className="h-4 w-4" />
              <span className="sr-only">Add New Supplier</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                The new supplier will be automatically selected for this purchase.
              </DialogDescription>
            </DialogHeader>
            <form ref={addSupplierFormRef} onSubmit={handleCreateSupplier} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Supplier Name</Label>
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
              <Button type="submit" onClick={() => addSupplierFormRef.current?.requestSubmit()}>
                Create & Select
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
