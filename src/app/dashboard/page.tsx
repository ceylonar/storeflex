import { StatCard, SalesChartCard, LowStockCard, RecentActivityCard } from '@/components/dashboard/dashboard-cards';
import { inventoryValue } from '@/lib/data';

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard 
          title="Inventory Value" 
          value={`$${inventoryValue.toLocaleString()}`} 
          iconName="DollarSign" 
          description="Total cost of current stock" 
        />
        <StatCard 
          title="Total Products" 
          value="256" 
          iconName="Package" 
          description="Across all categories" 
        />
        <StatCard 
          title="Sales (Today)" 
          value="12,897" 
          iconName="ShoppingCart" 
          description="+15% from yesterday" 
        />
        <StatCard 
          title="New Customers" 
          value="32" 
          iconName="Users" 
          description="+5 since last week" 
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <SalesChartCard />
        </div>
        <div className="lg:col-span-1">
            <RecentActivityCard />
        </div>
      </div>

      <div className="grid grid-cols-1">
        <LowStockCard />
      </div>
    </div>
  );
}
