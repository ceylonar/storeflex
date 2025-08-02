
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, LayoutDashboard, Lightbulb, ShoppingCart as SalesIcon, FileText, Users, Truck, Landmark, HelpCircle, User as AccountIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '../icons/logo';
import type { User } from '@/lib/auth';

const navigationLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes, roles: ['admin'] },
  { name: 'Sales', href: '/dashboard/sales', icon: SalesIcon, roles: ['admin', 'sales'] },
  { name: 'Buy', href: '/dashboard/buy', icon: Truck, roles: ['admin'] },
  { name: 'Customers', href: '/dashboard/customers', icon: Users, roles: ['admin', 'sales'] },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Users, roles: ['admin'] },
  { name: 'Moneyflow', href: '/dashboard/moneyflow', icon: Landmark, roles: ['admin'] },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText, roles: ['admin'] },
  { name: 'Price Optimizer', href: '/dashboard/price-optimizer', icon: Lightbulb, roles: ['admin'] },
  { name: 'About', href: '/dashboard/about', icon: HelpCircle, roles: ['admin', 'sales'] },
  { name: 'Account', href: '/dashboard/account', icon: AccountIcon, roles: ['admin'] },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  
  const navigation = navigationLinks.filter(link => link.roles.includes(user.role));

  return (
    <aside className="hidden w-64 flex-col border-r bg-card sm:flex">
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Logo className="h-6 w-6" />
          <div>
            <span className="text-lg text-foreground">StoreFlex Lite</span>
            <span className="block text-xs font-normal text-muted-foreground">by CEYLONAR</span>
          </div>
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
                      pathname === item.href
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
