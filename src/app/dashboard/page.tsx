
import { StatCard, LowStockCard, RecentActivityCard } from '@/components/dashboard/dashboard-cards';
import { fetchDashboardData, fetchSalesData, fetchTopSellingProducts, getCurrentUser } from '@/lib/queries';
import DynamicSalesChart from '@/components/dashboard/dynamic-sales-chart';
import DynamicTopSellingProductsChart from '@/components/dashboard/dynamic-top-products-chart';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';


export default async function DashboardPage() {
  const userProfile = await getCurrentUser();

  if (!userProfile) {
    return redirect('/login');
  }
  
  const dashboardData = await fetchDashboardData();
  const salesData = await fetchSalesData('monthly');
  const topProducts = await fetchTopSellingProducts();

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-3">
        <div className="xl:col-span-2">
            <DynamicSalesChart initialData={salesData} />
        </div>
        <div className="xl:col-span-1">
             <DynamicTopSellingProductsChart products={topProducts} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:gap-8 xl:grid-cols-3">
         <div className="xl:col-span-2">
            <LowStockCard products={dashboardData.lowStockProducts} />
        </div>
        <div className="xl:col-span-1">
            <RecentActivityCard activities={dashboardData.recentActivities} />
        </div>
      </div>
    </div>
  );
}
