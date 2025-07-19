
import { fetchSuppliers, fetchPurchasesBySupplier } from "@/lib/queries";
import { SuppliersTable } from "@/components/suppliers/suppliers-table";
import { PurchaseHistory } from "@/components/suppliers/purchase-history";

export default async function SuppliersPage() {
  const suppliers = await fetchSuppliers();
  // In a real app, you might fetch history for a selected supplier,
  // but for now, we'll fetch for the first one as an example or none.
  const purchases = suppliers.length > 0 ? await fetchPurchasesBySupplier(suppliers[0].id) : [];

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
        <p className="text-muted-foreground">
          Manage your suppliers and view their purchase history.
        </p>
      </div>
      <SuppliersTable initialSuppliers={suppliers} />
      {/* This is a placeholder for showing history. A better UX might be a separate details page */}
      {suppliers.length > 0 && <PurchaseHistory supplierName={suppliers[0].name} purchases={purchases} />}
    </div>
  );
}
