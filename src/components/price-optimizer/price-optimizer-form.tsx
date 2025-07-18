
'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPriceSuggestion } from '@/lib/actions';
import type { SuggestOptimalPriceOutput } from '@/ai/flows/suggest-optimal-price';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, Trash, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';

const PriceOptimizerFormSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
  productCategory: z.string().min(1, 'Category is required'),
  costPrice: z.coerce.number().min(0.01, 'Cost price must be greater than 0'),
  competitorPrices: z.string().min(1, 'Enter at least one price').transform((val) =>
    val.split(',').map(price => parseFloat(price.trim())).filter(p => !isNaN(p))
  ).refine(prices => prices.length > 0, { message: 'Enter valid, comma-separated numbers.' }),
  salesData: z.array(z.object({
    date: z.string().min(1, 'Date is required'),
    quantitySold: z.coerce.number().min(1, 'Quantity must be at least 1'),
    sellingPrice: z.coerce.number().min(0.01, 'Price must be greater than 0'),
  })).optional(),
});

type PriceOptimizerFormValues = z.infer<typeof PriceOptimizerFormSchema>;

function PriceOptimizerFormContent() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SuggestOptimalPriceOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<PriceOptimizerFormValues>({
    resolver: zodResolver(PriceOptimizerFormSchema),
    defaultValues: {
      productName: '',
      productCategory: '',
      costPrice: undefined,
      competitorPrices: '',
      salesData: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'salesData',
  });

  const onSubmit = async (data: PriceOptimizerFormValues) => {
    setLoading(true);
    setResult(null);

    const response = await getPriceSuggestion({
      ...data,
      salesData: data.salesData?.map(d => ({...d, date: new Date(d.date).toISOString().split('T')[0]}))
    });

    if (response.success && response.data) {
      setResult(response.data);
      toast({
        title: 'Success!',
        description: 'Optimal price suggestion received.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: response.message,
      });
    }

    setLoading(false);
  };
  
    return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
              <CardDescription>
                Provide details about the product to get a price suggestion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="productName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="productCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Category</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost Price (LKR)</FormLabel>
                      <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="competitorPrices"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Competitor Prices (comma-separated)</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Separator />
               <div>
                <h3 className="text-lg font-medium">Historical Sales Data (Optional)</h3>
                <div className="space-y-4 mt-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 gap-2 rounded-lg border p-4 md:grid-cols-4">
                      <FormField
                        control={form.control}
                        name={`salesData.${index}.date`}
                        render={({ field }) => (
                           <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`salesData.${index}.quantitySold`}
                        render={({ field }) => (
                           <FormItem><FormLabel>Quantity</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name={`salesData.${index}.sellingPrice`}
                        render={({ field }) => (
                           <FormItem><FormLabel>Price (LKR)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                        )}
                      />
                      <div className="flex items-end">
                         <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ date: '', quantitySold: 1, sellingPrice: 0 })}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Sales Entry
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Suggest Price
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <div className="lg:col-span-1">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Suggestion</CardTitle>
            <CardDescription>The AI's pricing recommendation will appear here.</CardDescription>
          </CardHeader>
          <CardContent className="min-h-[200px]">
            {loading && (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {result && !loading && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Suggested Price</h3>
                  <p className="text-4xl font-bold text-accent-foreground">LKR {result.suggestedPrice.toFixed(2)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Reasoning</h3>
                  <p className="text-sm text-foreground">{result.reasoning}</p>
                </div>
              </div>
            )}
            {!result && !loading && (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Fill out the form to get a suggestion.
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


export function PriceOptimizerForm() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return (
             <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-full max-w-sm" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                        </div>
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                            <div className="space-y-2"><Skeleton className="h-4 w-36" /><Skeleton className="h-10 w-full" /></div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Skeleton className="h-10 w-36" />
                    </CardFooter>
                </Card>
                 <div className="lg:col-span-1">
                    <Card className="sticky top-24">
                        <CardHeader>
                            <Skeleton className="h-8 w-36" />
                            <Skeleton className="h-4 w-full max-w-xs" />
                        </CardHeader>
                        <CardContent className="min-h-[200px] flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </CardContent>
                    </Card>
                 </div>
             </div>
        );
    }

    return <PriceOptimizerFormContent />;
}

