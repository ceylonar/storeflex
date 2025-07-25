
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, LayoutDashboard, Lightbulb, ShoppingCart as SalesIcon, FileText, Users, Truck, History, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '../icons/logo';
import { useEffect, useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { fetchUserProfile } from '@/lib/queries';
import Image from 'next/image';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes },
  { name: 'Inventory Records', href: '/dashboard/inventory/records', icon: History },
  { name: 'Sales', href: '/dashboard/sales', icon: SalesIcon },
  { name: 'Buy', href: '/dashboard/buy', icon: Truck },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Users },
  { name: 'Moneyflow', href: '/dashboard/moneyflow', icon: Landmark },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Price Optimizer', href: '/dashboard/price-optimizer', icon: Lightbulb },
];

export function Sidebar() {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchUserProfile().then(setUserProfile);
  }, []);

  const renderLogo = () => {
    if (userProfile?.logoUrl) {
      return <Image src={userProfile.logoUrl} alt="Store Logo" width={24} height={24} className="h-6 w-6" />;
    }
    return <Logo className="h-6 w-6" />;
  };

  return (
    <aside className="hidden w-64 flex-col border-r bg-card sm:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-primary">
          {renderLogo()}
          <span className="text-lg text-foreground">StoreFlex Lite</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard')
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      'group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6'
                    )}
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
