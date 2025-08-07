
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';
import { updateUserCredentials } from '@/lib/queries';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Info } from 'lucide-react';

const PasswordSchema = z.object({
  adminPassword: z.string().optional(),
  salesPassword: z.string().optional(),
}).refine(data => data.adminPassword || data.salesPassword, {
  message: "At least one password must be provided.",
  path: ["adminPassword"], // Attach error to a field for display
});

type PasswordFormValues = z.infer<typeof PasswordSchema>;

interface PasswordManagementProps {
    users: UserProfile[];
}

export function PasswordManagement({ users }: PasswordManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const adminUser = users.find(u => u.role === 'admin');
  const salesUser = users.find(u => u.role === 'sales');

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      adminPassword: '',
      salesPassword: '',
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    setIsSubmitting(true);
    try {
        if(data.adminPassword && adminUser) {
            await updateUserCredentials(adminUser.id, data.adminPassword);
        }
        if(data.salesPassword && salesUser) {
            await updateUserCredentials(salesUser.id, data.salesPassword);
        }
        toast({ title: 'Success', description: 'Passwords updated successfully.' });
        form.reset();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: (error as Error).message || "Failed to update passwords."
        })
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password Management</CardTitle>
        <CardDescription>
          Update the passwords for the system user accounts. Leave a field blank to keep the current password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Default Usernames</AlertTitle>
            <AlertDescription>
                <ul className="list-disc pl-5">
                    <li>Admin Username: <strong>superadmin</strong></li>
                    <li>Sales Username: <strong>sales</strong></li>
                </ul>
            </AlertDescription>
        </Alert>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="adminPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Admin Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter new password for 'superadmin'" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="salesPassword"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Sales Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter new password for 'sales'" {...field} />
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Passwords
                    </Button>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
