
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Loader2, ChevronsUpDown, Check } from 'lucide-react';
import { format } from 'date-fns';
import type { ProductSelect } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AddExpenseDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: FormData) => Promise<boolean>;
  products: ProductSelect[];
}

export function AddExpenseDialog({ isOpen, onOpenChange, onSubmit, products }: AddExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [selectedType, setSelectedType] = React.useState('');
  const [selectedProduct, setSelectedProduct] = React.useState<ProductSelect | null>(null);
  const [productSearchOpen, setProductSearchOpen] = React.useState(false);
  const [quantity, setQuantity] = React.useState(1);
  const formRef = React.useRef<HTMLFormElement>(null);

  const isLostProduct = selectedType === 'Lost / Damaged Product';
  const amount = isLostProduct ? (selectedProduct?.cost_price || 0) * quantity : undefined;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    if(isLostProduct && selectedProduct) {
        formData.append('productId', selectedProduct.id);
        formData.append('quantity', String(quantity));
        formData.set('amount', String(amount)); // Override amount with calculated value
        formData.set('description', `Loss of ${quantity} x ${selectedProduct.name}`);
    }

    const success = await onSubmit(formData);
    if (success) {
      formRef.current?.reset();
      setSelectedType('');
      setSelectedProduct(null);
      setQuantity(1);
    }
    setIsSubmitting(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            setSelectedType('');
            setSelectedProduct(null);
            setQuantity(1);
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a new business expense. This will not affect inventory levels unless it is a lost product.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Expense Type</Label>
            <Select name="type" required onValueChange={setSelectedType} value={selectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select an expense type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bill Payment">Bill Payment (e.g., electricity, water)</SelectItem>
                <SelectItem value="Supplies">Supplies (e.g., stationery, cleaning)</SelectItem>
                <SelectItem value="Lost / Damaged Product">Lost / Damaged Product</SelectItem>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Rent">Rent</SelectItem>
                <SelectItem value="Salaries">Salaries</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLostProduct ? (
            <div className="space-y-4 p-4 border rounded-md">
                 <div className="space-y-2">
                    <Label>Select Product</Label>
                    <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={productSearchOpen} className="w-full justify-between">
                                <span className="truncate">
                                    {selectedProduct ? selectedProduct.name : "Select a product..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Search product..." />
                                <CommandList>
                                    <CommandEmpty>No product found.</CommandEmpty>
                                    <CommandGroup>
                                        {products.filter(p => p.type === 'product').map(p => (
                                            <CommandItem
                                                key={p.id}
                                                value={p.id}
                                                onSelect={(currentValue) => {
                                                    const product = products.find(prod => prod.id === currentValue) || null;
                                                    setSelectedProduct(product);
                                                    setProductSearchOpen(false);
                                                }}
                                            >
                                                <Check className={cn("mr-2 h-4 w-4", selectedProduct?.id === p.id ? "opacity-100" : "opacity-0")} />
                                                {p.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity Lost</Label>
                    <Input id="quantity" name="quantity" type="number" value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} min="1" disabled={!selectedProduct} max={selectedProduct?.stock}/>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="amount">Calculated Loss (LKR)</Label>
                    <Input id="amount" name="amount" type="number" value={amount?.toFixed(2) || '0.00'} readOnly />
                </div>
            </div>
          ) : (
             <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" placeholder="e.g., Monthly electricity bill for May" required />
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            {!isLostProduct && (
                <div className="space-y-2">
                <Label htmlFor="amount">Amount (LKR)</Label>
                <Input id="amount" name="amount" type="number" step="0.01" placeholder="1000.00" required />
                </div>
            )}
            <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={format(new Date(), 'yyyy-MM-dd')} required />
            </div>
          </div>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button type="submit" onClick={() => formRef.current?.requestSubmit()} disabled={isSubmitting || (isLostProduct && !selectedProduct)}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Expense
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
