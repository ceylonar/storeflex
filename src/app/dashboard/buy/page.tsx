
import { fetchProductsForSelect, fetchSuppliers } from "@/lib/queries";
import { PurchaseTerminal } from "@/components/buy/purchase-terminal";

export default async function BuyPage() {
  const products = await fetchProductsForSelect();
  const suppliers = await fetchSuppliers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Purchase Terminal</h1>
        <p className="text-muted-foreground">
          Record new purchases from suppliers to update your inventory.
        </p>
      </div>
      <PurchaseTerminal products={products} initialSuppliers={suppliers} />
    </div>
  );
}
