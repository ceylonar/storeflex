import { RecordsClient } from "@/components/inventory/records-client";
import { fetchInventoryRecords, fetchProductsForSelect } from "@/lib/queries";

export default async function InventoryRecordsPage() {
  // Fetch initial data without filters
  const initialRecords = await fetchInventoryRecords({});
  const products = await fetchProductsForSelect();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory Records</h1>
        <p className="text-muted-foreground">
          View, filter, and export all inventory activity.
        </p>
      </div>
      <RecordsClient initialRecords={initialRecords} products={products} />
    </div>
  );
}
