
import { PriceOptimizerForm } from '@/components/price-optimizer/price-optimizer-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchUserProfile } from '@/lib/queries';
import { Lightbulb, ShieldAlert } from 'lucide-react';

const PermissionDenied = () => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
                <CardTitle>Permission Denied</CardTitle>
                <CardDescription>You do not have permission to access this page.</CardDescription>
            </div>
        </Header>
        <CardContent>
            <p>Please contact your administrator if you believe this is an error.</p>
        </CardContent>
    </Card>
);

export default async function PriceOptimizerPage() {
  const userProfile = await fetchUserProfile();

  if (userProfile?.role !== 'admin') {
      return (
          <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Lightbulb className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">AI Price Optimizer</h1>
                  <p className="text-muted-foreground">
                    Get intelligent price suggestions based on your data.
                  </p>
                </div>
              </div>
              <PermissionDenied />
          </div>
      );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Lightbulb className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Price Optimizer</h1>
          <p className="text-muted-foreground">
            Get intelligent price suggestions based on your data.
          </p>
        </div>
      </div>
      <PriceOptimizerForm />
    </div>
  );
}
