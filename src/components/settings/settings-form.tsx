
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserProfile } from '@/lib/types';
import { updateUserProfile } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';


const UserProfileSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    businessName: z.string().min(1, 'Business name is required'),
    address: z.string().optional(),
    contactNumber: z.string().optional(),
    googleSheetUrl: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
});

type UserProfileFormValues = z.infer<typeof UserProfileSchema>;

export function SettingsForm({ userProfile }: { userProfile: UserProfile | null }) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const form = useForm<UserProfileFormValues>({
        resolver: zodResolver(UserProfileSchema),
        defaultValues: {
            name: userProfile?.name || '',
            businessName: userProfile?.businessName || '',
            address: userProfile?.address || '',
            contactNumber: userProfile?.contactNumber || '',
            googleSheetUrl: userProfile?.googleSheetUrl || '',
        },
    });

    const onSubmit = async (data: UserProfileFormValues) => {
        setLoading(true);
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value) {
                formData.append(key, value);
            }
        });

        try {
            await updateUserProfile(formData);
            toast({
                title: 'Success!',
                description: 'Your profile has been updated successfully.',
            });
        } catch (error) {
             toast({
                variant: 'destructive',
                title: 'Error',
                description: (error as Error).message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Profile</CardTitle>
                        <CardDescription>This information will be displayed on your profile and in the application.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl><Input {...field} /></FormControl>
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
                                <FormControl><Input {...field} /></FormControl>
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
                                <FormControl><Input {...field} /></FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                             <FormField
                                control={form.control}
                                name="contactNumber"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Contact Number</FormLabel>
                                    <FormControl><Input type="tel" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="googleSheetUrl"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Google Sheet URL</FormLabel>
                                    <FormControl><Input type="url" {...field} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

