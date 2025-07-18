
'use client';

import { useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/queries';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { Settings } from 'lucide-react';

const settingsFormSchema = z.object({
  googleSheetUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export function SettingsForm({ userProfile }: { userProfile: UserProfile | null }) {
  const [loading, setLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      googleSheetUrl: userProfile?.googleSheetUrl || '',
    },
  });

  const onSubmit = async (data: SettingsFormValues) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('googleSheetUrl', data.googleSheetUrl || '');
      // Pass other existing profile data to avoid overwriting it
      formData.append('name', userProfile?.name || '');
      formData.append('businessName', userProfile?.businessName || '');
      formData.append('address', userProfile?.address || '');
      formData.append('contactNumber', userProfile?.contactNumber || '');
      
      const result = await updateUserProfile(formData);

      if (result.success) {
        toast({
          title: 'Success',
          description: 'Your settings have been updated.',
        });
      } else {
        throw new Error('Failed to update settings.');
      }
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

  const handleManualSync = () => {
      setSyncLoading(true);
      // Placeholder for actual sync logic
      setTimeout(() => {
        toast({
            title: "Coming Soon!",
            description: "Google Sheets integration is under development."
        });
        setSyncLoading(false);
      }, 1500);
  }

  if (!userProfile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Could not load user profile information.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Google Sheets Integration</CardTitle>
            <CardDescription>
              Connect your Google Sheet to sync inventory records. All product data will be updated in the sheet.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="googleSheetUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Public Google Sheet URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://docs.google.com/spreadsheets/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="justify-between border-t px-6 py-4">
             <Button type="button" variant="outline" onClick={handleManualSync} disabled={syncLoading || !form.getValues('googleSheetUrl')}>
                 {syncLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Manual Sync
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
