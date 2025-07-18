import { SalesTable } from "@/components/sales/sales-table";
import { fetchSales, fetchProductsForSelect } from "@/lib/queries";

export default async function SalesPage() {
  const sales = await fetchSales();
  const products = await fetchProductsForSelect();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
        <p className="text-muted-foreground">
          Track and manage your sales records.
        </p>
      </div>
      <SalesTable initialSales={sales} products={products} />
    </div>
  );
}
