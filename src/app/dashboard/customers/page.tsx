import { fetchCustomers } from "@/lib/queries";
import { CustomersTable } from "@/components/customers/customers-table";

export default async function CustomersPage() {
  const customers = await fetchCustomers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Manage your customer database.
        </p>
      </div>
      <CustomersTable initialCustomers={customers} />
    </div>
  );
}
