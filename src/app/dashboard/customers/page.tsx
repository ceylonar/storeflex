
import { fetchCustomers } from "@/lib/queries";
import { CustomersClient } from "@/components/customers/customers-client";

export default async function CustomersPage() {
  const customers = await fetchCustomers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Manage your customer database and view their sales history.
        </p>
      </div>
      <CustomersClient initialCustomers={customers} />
    </div>
  );
}
