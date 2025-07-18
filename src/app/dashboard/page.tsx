import { StatCard, SalesChartCard, LowStockCard, RecentActivityCard, TopSellingProductsCard } from '@/components/dashboard/dashboard-cards';
import { fetchDashboardData, fetchSalesData, fetchTopSellingProducts } from '@/lib/queries';

export default async function DashboardPage() {
  const dashboardData = await fetchDashboardData();
  const salesData = await fetchSalesData();
  const topProducts = await fetchTopSellingProducts();

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <StatCard 
          title="Inventory Value" 
          value={`LKR ${dashboardData.inventoryValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
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
          value={`LKR ${dashboardData.salesToday.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          iconName="ShoppingCart" 
          description="Total sales for today" 
        />
        <StatCard 
          title="Total Sales" 
          value={`LKR ${dashboardData.totalSales.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          iconName="CreditCard"
          description="All-time total sales"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <div className="xl:col-span-2">
            <SalesChartCard salesData={salesData} />
        </div>
        <div className="lg:col-span-1">
             <TopSellingProductsCard products={topProducts} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-8 lg:grid-cols-3">
         <div className="lg:col-span-2">
            <LowStockCard products={dashboardData.lowStockProducts} />
        </div>
        <div className="lg:col-span-1">
            <RecentActivityCard activities={dashboardData.recentActivities} />
        </div>
      </div>
    </div>
  );
}
