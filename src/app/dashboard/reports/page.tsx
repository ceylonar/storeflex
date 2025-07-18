
import { ReportGenerator } from '@/components/reports/report-generator';

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sales Reports</h1>
        <p className="text-muted-foreground">
          Generate and view sales reports for different periods.
        </p>
      </div>
      <ReportGenerator />
    </div>
  );
}
