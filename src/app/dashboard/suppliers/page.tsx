
import { fetchSuppliers } from "@/lib/queries";
import { SuppliersClient } from "@/components/suppliers/suppliers-client";


export default async function SuppliersPage() {
  const suppliers = await fetchSuppliers();

  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-2xl font-bold tracking-tight">Suppliers</h1>
        <p className="text-muted-foreground">
          Manage your suppliers and view their purchase history.
        </p>
      </div>
      <SuppliersClient initialSuppliers={suppliers} />
    </div>
  );
}
