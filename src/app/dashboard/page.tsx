
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { StatCard, LowStockCard } from '@/components/dashboard/dashboard-cards';
import { fetchDashboardData, fetchSalesData, fetchTopSellingProducts } from '@/lib/queries';
import DynamicSalesChart from '@/components/dashboard/dynamic-sales-chart';
import DynamicTopSellingProductsChart from '@/components/dashboard/dynamic-top-products-chart';
import { RecentActivityCard } from '@/components/dashboard/dynamic-recent-activity';
import { ProfitCard } from '@/components/dashboard/profit-card';
import { PendingOrdersCard } from '@/components/dashboard/pending-orders-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb } from 'lucide-react';

export default async function DashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  // Admin and other roles will see the full dashboard
  const dashboardData = await fetchDashboardData();
  const salesData = await fetchSalesData('monthly');
  const topProducts = await fetchTopSellingProducts();

  return (
    <div className="space-y-6 md:space-y-8">
       <Card className="bg-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Welcome to your Dashboard, {user.name}!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is your command center. You can get a quick overview of your business's performance, see what needs your attention, and access all of your key modules from the sidebar. Let's get started!
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <StatCard 
          title="Inventory Value" 
          value={`LKR ${dashboardData.inventoryValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          iconName="DollarSign" 
          description="Total cost of current stock"
          href="/dashboard/inventory"
        />
        <StatCard 
          title="Products & Services" 
          value={`${dashboardData.productCount} / ${dashboardData.serviceCount}`} 
          iconName="Package" 
          description="Physical products / Services" 
        />
        <StatCard 
          title="Sales (Today)" 
          value={`LKR ${dashboardData.salesToday.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          iconName="ShoppingCart" 
          description="Total sales for today" 
        />
        <ProfitCard 
          profitToday={dashboardData.profitToday}
          profitThisMonth={dashboardData.profitThisMonth}
          profitThisYear={dashboardData.profitThisYear}
        />
         <StatCard 
          title="Total Sales" 
          value={`LKR ${dashboardData.totalSales.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} 
          iconName="Briefcase" 
          description="All-time gross sales revenue" 
        />
        <StatCard 
          title="Total Expenses" 
          value={`LKR ${dashboardData.totalExpenses.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          iconName="Receipt"
          description="All-time recorded expenses"
        />
        <StatCard 
          title="Total Receivables" 
          value={`LKR ${dashboardData.totalReceivables.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          iconName="ArrowDownLeft"
          description="Money owed to you"
        />
        <StatCard 
          title="Total Payables" 
          value={`LKR ${dashboardData.totalPayables.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
          iconName="ArrowUpRight"
          description="Money you owe"
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
         <div className="xl:col-span-2 grid gap-6">
            <LowStockCard products={dashboardData.lowStockProducts} />
            <PendingOrdersCard 
              salesOrders={dashboardData.pendingSalesOrders} 
              purchaseOrders={dashboardData.pendingPurchaseOrders} 
            />
        </div>
        <div className="xl:col-span-1">
            <RecentActivityCard />
        </div>
      </div>
    </div>
  );
}
