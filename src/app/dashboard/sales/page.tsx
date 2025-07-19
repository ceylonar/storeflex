import { fetchProductsForSelect, fetchCustomers } from "@/lib/queries";
import { PointOfSaleTerminal } from "@/components/sales/point-of-sale-terminal";

export default async function SalesPage() {
  const products = await fetchProductsForSelect();
  const customers = await fetchCustomers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Point of Sale</h1>
        <p className="text-muted-foreground">
          Create new sales transactions for customers.
        </p>
      </div>
      <PointOfSaleTerminal products={products} initialCustomers={customers} />
    </div>
  );
}
