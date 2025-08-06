
import { AdvancedReportClient } from '@/components/reports/advanced-report-client';
import { fetchInventoryRecords, fetchProductsForSelect, fetchCustomers, fetchSuppliers } from '@/lib/queries';

export default async function ReportsPage() {
  const initialRecords = await fetchInventoryRecords({});
  const products = await fetchProductsForSelect();
  const customers = await fetchCustomers();
  const suppliers = await fetchSuppliers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Advanced Reports</h1>
        <p className="text-muted-foreground">
          Generate, filter, and export detailed inventory and sales reports.
        </p>
      </div>
      <AdvancedReportClient 
        initialRecords={initialRecords} 
        products={products}
        customers={customers}
        suppliers={suppliers}
      />
    </div>
  );
}
