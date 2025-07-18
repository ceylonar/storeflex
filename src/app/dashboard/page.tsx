import { StatCard, SalesChartCard, LowStockCard, RecentActivityCard } from '@/components/dashboard/dashboard-cards';
import { fetchDashboardData, fetchSalesData } from '@/lib/queries';

export default async function DashboardPage() {
  const dashboardData = await fetchDashboardData();
  const salesData = await fetchSalesData();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard 
          title="Inventory Value" 
          value={`$${dashboardData.inventoryValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          iconName="DollarSign" 
          description="Total cost of current stock" 
        />
        <StatCard 
          title="Total Products" 
          value={dashboardData.productCount.toString()} 
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
            <SalesChartCard salesData={salesData} />
        </div>
        <div className="lg:col-span-1">
            <RecentActivityCard activities={dashboardData.recentActivities} />
        </div>
      </div>

      <div className="grid grid-cols-1">
        <LowStockCard products={dashboardData.lowStockProducts} />
      </div>
    </div>
  );
}
