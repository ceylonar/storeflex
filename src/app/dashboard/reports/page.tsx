
import { AdvancedReportClient } from '@/components/reports/advanced-report-client';
import { fetchInventoryRecords, fetchProductsForSelect, fetchUserProfile } from '@/lib/queries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

const PermissionDenied = () => (
    <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
                <CardTitle>Permission Denied</CardTitle>
                <CardDescription>You do not have permission to access this page.</CardDescription>
            </div>
        </CardHeader>
        <CardContent>
            <p>Please contact your administrator if you believe this is an error.</p>
        </CardContent>
    </Card>
);

export default async function ReportsPage() {
  const userProfile = await fetchUserProfile();

  if (userProfile?.role !== 'admin') {
      return (
          <div className="space-y-4">
              <div>
                  <h1 className="text-2xl font-bold tracking-tight">Advanced Reports</h1>
                  <p className="text-muted-foreground">
                      Generate, filter, and export detailed inventory and sales reports.
                  </p>
              </div>
              <PermissionDenied />
          </div>
      );
  }

  const initialRecords = await fetchInventoryRecords({});
  const products = await fetchProductsForSelect();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advanced Reports</h1>
        <p className="text-muted-foreground">
          Generate, filter, and export detailed inventory and sales reports.
        </p>
      </div>
      <AdvancedReportClient initialRecords={initialRecords} products={products} />
    </div>
  );
}
