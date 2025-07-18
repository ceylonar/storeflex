import { InventoryTable } from "@/components/inventory/inventory-table";

export default function InventoryPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Manage your products and stock levels.
        </p>
      </div>
      <InventoryTable />
    </div>
  );
}
