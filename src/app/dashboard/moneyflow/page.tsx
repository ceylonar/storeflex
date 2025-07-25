
import { MoneyflowClient } from "@/components/moneyflow/moneyflow-client";
import { fetchMoneyflowData } from "@/lib/queries";

export default async function MoneyflowPage() {
  const initialData = await fetchMoneyflowData();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Moneyflow</h1>
        <p className="text-muted-foreground">
          Track your assets, manage credit, and clear pending payments.
        </p>
      </div>
      <MoneyflowClient initialData={initialData} />
    </div>
  );
}
