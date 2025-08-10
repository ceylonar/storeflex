
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
  password: z.string().min(6, 'Password must be at least 6 characters long.'),
});

type PasswordFormValues = z.infer<typeof PasswordSchema>;

interface PasswordManagementProps {
    users: UserProfile[];
}

export function PasswordManagement({ users }: PasswordManagementProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const currentUser = users[0];

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(PasswordSchema),
    defaultValues: {
      password: '',
    },
  });

  const onSubmit = async (data: PasswordFormValues) => {
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'No user found.' });
        return;
    }
    setIsSubmitting(true);
    try {
        await updateUserCredentials(currentUser.id, data.password);
        toast({ title: 'Success', description: 'Password updated successfully.' });
        form.reset();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: (error as Error).message || "Failed to update password."
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
          Update the password for your account. You might be asked to log in again after this change.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Current User</AlertTitle>
            <AlertDescription>
                <p>You are updating the password for: <strong>{currentUser?.email}</strong></p>
            </AlertDescription>
        </Alert>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="Enter new password" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Update Password
                    </Button>
                </div>
            </form>
        </Form>
      </CardContent>
    </Card>
  );
}
