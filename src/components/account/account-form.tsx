
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
// import { updateUserProfile } from '@/lib/queries'; // This function is removed
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';

const ProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  logoUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof ProfileSchema>;

interface AccountFormProps {
  userProfile: UserProfile | null;
}

export function AccountForm({ userProfile }: AccountFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      businessName: userProfile?.businessName || '',
      address: userProfile?.address || '',
      contactNumber: userProfile?.contactNumber || '',
      logoUrl: userProfile?.logoUrl || '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setIsSubmitting(true);
    toast({
        title: 'Note:',
        description: 'Updating store settings is disabled as authentication has been removed.',
    });
    // The updateUserProfile function is removed, so we just simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Store Details</CardTitle>
            <CardDescription>
              This information will appear on your receipts and invoices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="businessName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Business Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://example.com/logo.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="123 Main Street, Colombo, Sri Lanka"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="contactNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Number</FormLabel>
                  <FormControl>
                    <Input placeholder="011-123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Settings
            </Button>
        </div>
      </form>
    </Form>
  );
}
