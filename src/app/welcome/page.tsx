
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createInitialStoreForUser } from '@/lib/queries';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';

const profileFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().optional(),
  contactNumber: z.string().optional(),
  googleSheetUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function WelcomePage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
      businessName: '',
      address: '',
      contactNumber: '',
      googleSheetUrl: '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    setLoading(true);

    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Authentication Error',
            description: 'Could not find authenticated user. Please log in again.'
        });
        setLoading(false);
        router.push('/login');
        return;
    }

    try {
      const { uid, email } = user;
      const response = await createInitialStoreForUser({
        uid,
        email: email || '',
        profileData: data,
      });

      if(response.success) {
        toast({
            title: "Welcome!",
            description: "Your profile has been created successfully."
        });
        router.push('/dashboard');
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Setup Failed',
        description: (error as Error).message,
      });
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-8 left-8 flex items-center gap-2 text-lg font-semibold text-primary">
        <Store className="h-6 w-6" />
        <span className="text-foreground">StoreFlex Lite</span>
      </div>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome! Let's get you set up.</CardTitle>
          <CardDescription>
            Please provide some details about yourself and your business.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                 <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Name</FormLabel>
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl><Input placeholder="My Awesome Store" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
               <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl><Input placeholder="123 Main St, Anytown" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl><Input type="tel" placeholder="+94 123 456 789" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="googleSheetUrl"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Google Sheet URL (Optional)</FormLabel>
                        <FormControl><Input type="url" placeholder="https://docs.google.com/spreadsheets/..." {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Complete Setup & Go to Dashboard
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </main>
  );
}
