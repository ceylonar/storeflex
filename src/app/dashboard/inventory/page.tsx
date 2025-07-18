import { InventoryTable } from "@/components/inventory/inventory-table";
import { ActivityTable } from "@/components/inventory/activity-table";
import { fetchProducts, fetchAllActivities } from "@/lib/queries";

export default async function InventoryPage() {
  const products = await fetchProducts();
  const activities = await fetchAllActivities();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Manage your products and view their history.
        </p>
      </div>
      <InventoryTable initialProducts={products} />
      <ActivityTable activities={activities} />
    </div>
  );
}
