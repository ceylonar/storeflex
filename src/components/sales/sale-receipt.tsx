
'use client';

import type { Sale, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Printer, X } from 'lucide-react';
import React from 'react';
import { fetchUserProfile } from '@/lib/queries';
import { Logo } from '../icons/logo';

interface SaleReceiptProps {
  sale: Sale;
  onNewSale: () => void;
}

export function SaleReceipt({ sale, onNewSale }: SaleReceiptProps) {
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const receiptRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetchUserProfile().then(setUserProfile);
  }, []);
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-background text-foreground">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none;
          }
        }
      `}</style>
      <div id="printable-receipt" ref={receiptRef} className="p-6 text-sm">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold">{userProfile?.businessName || 'StoreFlex Lite'}</h1>
          </div>
          <p>{userProfile?.address || '123 Demo Street, Colombo'}</p>
          <p>{userProfile?.contactNumber || '011-123-4567'}</p>
        </div>

        <Separator className="my-2" />

        {/* Sale Info */}
        <div className="flex justify-between mb-2">
          <span>Sale ID:</span>
          <span>{sale.id}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span>Date:</span>
          <span>{format(new Date(sale.sale_date), 'PPP p')}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span>Customer:</span>
          <span>{sale.customer_name}</span>
        </div>

        <Separator className="my-2" />
        
        {/* Items Table */}
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left font-semibold">Item</th>
              <th className="text-center font-semibold">Qty</th>
              <th className="text-right font-semibold">Price</th>
              <th className="text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map(item => (
              <tr key={item.id}>
                <td>{item.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">{item.price_per_unit.toFixed(2)}</td>
                <td className="text-right">{item.total_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Separator className="my-2" />

        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{sale.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Charge</span>
            <span>{sale.service_charge.toFixed(2)}</span>
          </div>
           <div className="flex justify-between">
            <span>Tax ({sale.tax_percentage}%)</span>
            <span>{sale.tax_amount.toFixed(2)}</span>
          </div>
           <div className="flex justify-between">
            <span>Discount</span>
            <span>- {sale.discount_amount.toFixed(2)}</span>
          </div>
           <div className="flex justify-between font-bold text-base border-t pt-1">
            <span>Total</span>
            <span>LKR {sale.total_amount.toFixed(2)}</span>
          </div>
        </div>
        
        <Separator className="my-2" />

        {/* Footer */}
        <div className="text-center mt-4">
            <p className="text-xs">Thank you for your purchase!</p>
            <p className="text-xs">Come again soon.</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 p-4 border-t bg-muted/50 no-print">
        <Button variant="outline" className="w-full" onClick={onNewSale}>
          <X className="mr-2 h-4 w-4" /> New Sale
        </Button>
        <Button className="w-full" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Print Bill
        </Button>
      </div>
    </div>
  );
}
