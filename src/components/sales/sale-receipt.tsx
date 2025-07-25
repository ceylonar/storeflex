
'use client';

import type { Sale, UserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Printer, X } from 'lucide-react';
import React from 'react';
import { fetchUserProfile } from '@/lib/queries';
import { Logo } from '../icons/logo';
import Image from 'next/image';

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

  const renderLogo = () => {
    if (userProfile?.logoUrl) {
      return <Image src={userProfile.logoUrl} alt="Store Logo" width={32} height={32} className="h-8 w-8" />;
    }
    return <Logo className="h-8 w-8 text-primary" />;
  };
  
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
            margin: 0;
            padding: 1rem;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <div id="printable-receipt" ref={receiptRef} className="p-6 text-sm font-mono">
        {/* Header */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            {renderLogo()}
            <h1 className="text-xl font-bold tracking-wider">{userProfile?.businessName || 'StoreFlex Lite'}</h1>
          </div>
          <p className="text-xs">{userProfile?.address || '123 Demo Street, Colombo'}</p>
          <p className="text-xs">{userProfile?.contactNumber || '011-123-4567'}</p>
        </div>

        <Separator className="my-3 border-dashed" />

        {/* Sale Info */}
        <div className="mb-4 text-xs">
          <div className="flex justify-between"><span>Sale ID:</span> <span>{sale.id}</span></div>
          <div className="flex justify-between"><span>Date:</span> <span>{format(new Date(sale.sale_date), 'yyyy-MM-dd HH:mm')}</span></div>
          <div className="flex justify-between"><span>Customer:</span> <span>{sale.customer_name}</span></div>
        </div>
        
        {/* Items Table */}
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-dashed">
              <th className="text-left font-semibold pb-1">ITEM</th>
              <th className="text-center font-semibold pb-1">QTY</th>
              <th className="text-right font-semibold pb-1">PRICE</th>
              <th className="text-right font-semibold pb-1">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map(item => (
              <tr key={item.id} className="border-b border-dotted">
                <td className="py-1 pr-1">{item.name}</td>
                <td className="text-center py-1">{item.quantity}</td>
                <td className="text-right py-1">{item.price_per_unit.toFixed(2)}</td>
                <td className="text-right py-1">{item.total_amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="mt-4 ml-auto max-w-[150px] text-xs space-y-1">
          <div className="flex justify-between"><span>Subtotal</span> <span>{sale.subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Service</span> <span>{sale.service_charge.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax ({sale.tax_percentage}%)</span> <span>{sale.tax_amount.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Discount</span> <span>- {sale.discount_amount.toFixed(2)}</span></div>
        </div>

         <Separator className="my-2 border-dashed" />

        <div className="flex justify-between font-bold text-base">
          <span>TOTAL</span>
          <span>LKR {sale.total_amount.toFixed(2)}</span>
        </div>
        
        <Separator className="my-2 border-dashed" />

        {/* Footer */}
        <div className="text-center mt-4">
            <p className="text-xs font-semibold">Thank you for your purchase!</p>
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
