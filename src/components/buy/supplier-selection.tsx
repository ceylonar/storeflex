
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
import { createSupplier } from '@/lib/queries';
import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/lib/types';
import { UserPlus, Users, X } from 'lucide-react';

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
      <div className="flex items-center gap-2 rounded-md border border-input p-2">
        <div className="flex-1">
          <p className="text-sm font-medium">
            {selectedSupplier ? selectedSupplier.name : 'No supplier selected'}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedSupplier ? selectedSupplier.phone : 'Please select or create a supplier'}
          </p>
        </div>
        {selectedSupplier && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onSelectSupplier(null)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Clear supplier</span>
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Dialog open={isSelectOpen} onOpenChange={setIsSelectOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Users className="mr-2 h-4 w-4" /> Select Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Select an Existing Supplier</DialogTitle>
            </DialogHeader>
            <Command>
              <CommandInput placeholder="Search by name or phone..." />
              <CommandList>
                <ScrollArea className="h-[300px]">
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
