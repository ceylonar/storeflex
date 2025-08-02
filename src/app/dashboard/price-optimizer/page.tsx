
import { PriceOptimizerForm } from '@/components/price-optimizer/price-optimizer-form';
import { Lightbulb } from 'lucide-react';

export default async function PriceOptimizerPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Lightbulb className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Price Optimizer</h1>
          <p className="text-muted-foreground">
            Get intelligent price suggestions based on your data.
          </p>
        </div>
      </div>
      <PriceOptimizerForm />
    </div>
  );
}
