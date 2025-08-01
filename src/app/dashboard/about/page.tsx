
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, LayoutDashboard, Boxes, ShoppingCart, Truck, Landmark, Users, Lightbulb, FileText } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <HelpCircle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">About StoreFlex Lite</h1>
          <p className="text-muted-foreground">
            A complete guide to your inventory management system.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome to StoreFlex Lite!</CardTitle>
          <CardDescription>
            This guide will walk you through the core features of the system and how to use them effectively to manage your business.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Dashboard</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground">
                The Dashboard is your command center. It gives you a real-time snapshot of your business health with key metrics like Inventory Value, Total Products, Today's Sales, and Total Sales. You can also see sales trends over time, view your top-selling products, identify low-stock items that need reordering, and see a feed of your most recent activities.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Boxes className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Inventory Management</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground space-y-2">
                <p>The Inventory page is where you manage all your products. You can add, edit, and delete products. When adding a product, you can use the "Scan to Add" feature, which uses your camera or a hardware scanner to read a barcode. Our AI will then attempt to automatically fill in the product's name, brand, and category for you.</p>
                <p>Viewing a product's history will show you every sale and purchase transaction for that item, giving you a complete audit trail of its stock movement.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Point of Sale (Sales)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground space-y-2">
                <p>This is where you make sales to customers. You can search for products, add them to the bill, and adjust quantities and even unit prices on the fly for negotiation. You can select an existing customer or create a new one directly from this screen.</p>
                <p>The system supports multiple payment methods:
                  <ul className="list-disc pl-6 mt-2">
                    <li><b>Cash:</b> Calculates change to be returned.</li>
                    <li><b>Credit:</b> If a customer has an outstanding balance, it's added to the total due. If they don't pay the full amount, the remainder is added to their credit balance. This option is only available for registered customers.</li>
                    <li><b>Check:</b> Records a check number for the transaction.</li>
                  </ul>
                </p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-4">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Purchasing (Buy)</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground space-y-2">
                <p>The Buy page is for recording purchases from your suppliers. When you purchase items, their stock count automatically increases in your inventory. The system also calculates a new weighted-average cost price for each product, ensuring your inventory valuation remains accurate.</p>
                <p>If you have an outstanding balance with a supplier, it will be shown as "Previous Balance Due." When you make a payment, you can pay more than the current bill to settle your old debts. Any extra amount paid will be recorded as a settlement and reflected in the Moneyflow.</p>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-5">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Landmark className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Moneyflow</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground">
                This page provides a clear overview of your financials. It shows your total receivables (money owed to you), payables (money you owe), and the value of pending checks. From here, you can settle outstanding credit balances and clear or reject check payments. The transaction history gives you a complete log of every sale, purchase, and settlement.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-6">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Customers & Suppliers</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground">
                These pages allow you to manage your contacts. You can add, edit, or delete customers and suppliers. By selecting one from the list, you can view their complete transaction history (all sales for a customer or all purchases for a supplier) and see their current credit balance.
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-7">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <span className="font-semibold">AI Price Optimizer</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground">
                Leverage the power of AI to get intelligent pricing suggestions. Input a product's details, its cost price, and what your competitors are charging. You can also provide historical sales data. The AI will analyze this information and suggest an optimal selling price to help you maximize profitability, along with its reasoning.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-8">
              <AccordionTrigger>
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span className="font-semibold">Advanced Reports</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-8 text-muted-foreground">
                The Reports page allows you to generate detailed financial ledgers. You can filter your transaction history by date range, transaction type (sale, purchase, etc.), or a specific product. The results are displayed in an expandable list, showing full details for each transaction, including items, quantities, and prices. You can also download the filtered report as a CSV file for use in other applications like Excel or Google Sheets.
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
