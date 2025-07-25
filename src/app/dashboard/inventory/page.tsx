import { fetchProducts } from "@/lib/queries";
import { InventoryClient } from "@/components/inventory/inventory-client";

export default async function InventoryPage() {
  const products = await fetchProducts();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Manage your products and view their transaction history.
        </p>
      </div>
      <InventoryClient initialProducts={products} />
    </div>
  );
}
