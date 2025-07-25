import { fetchProducts } from "@/lib/queries";
import { InventoryClient } from "@/components/inventory/inventory-client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { History } from "lucide-react";

export default async function InventoryPage() {
  const products = await fetchProducts();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your products and view their transaction history.
          </p>
        </div>
      </div>
      <InventoryClient initialProducts={products} />
    </div>
  );
}
