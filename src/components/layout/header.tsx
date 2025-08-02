
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Boxes, LayoutDashboard, Lightbulb, Menu, ShoppingCart as SalesIcon, FileText, Users, Truck, History, User, Landmark, HelpCircle, ShieldAlert, LogOut } from 'lucide-react';
import type { Store as StoreType, UserProfile } from '@/lib/types';
import { useEffect, useState } from 'react';
import { fetchStores } from '@/lib/queries';
import { ModeToggle } from '../mode-toggle';
import { Logo } from '../icons/logo';
import Image from 'next/image';


const allNavLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes },
  { name: 'Sales', href: '/dashboard/sales', icon: SalesIcon },
  { name: 'Buy', href: '/dashboard/buy', icon: Truck },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Users },
  { name: 'Moneyflow', href: '/dashboard/moneyflow', icon: Landmark },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Price Optimizer', href: '/dashboard/price-optimizer', icon: Lightbulb },
  { name: 'About', href: '/dashboard/about', icon: HelpCircle },
  { name: 'Account', href: '/dashboard/account', icon: User, isUserMenu: true },
];

export function Header({ userProfile }: { userProfile: UserProfile | null }) {
  const pathname = usePathname();
  const [stores, setStores] = useState<StoreType[] | null>(null);
  const [greeting, setGreeting] = useState('');
  
  useEffect(() => {
    async function getData() {
        try {
            const fetchedStores = await fetchStores();
            setStores(fetchedStores);
        } catch(e) {
            console.error("Failed to fetch data:", e)
        }
    }
    getData();
    setGreeting("Let's Grow");
  }, []);

  const renderLogo = () => {
    if (userProfile?.logoUrl) {
      return <Image src={userProfile.logoUrl} alt="Store Logo" width={24} height={24} className="h-6 w-6" />;
    }
    return <Logo className="h-6 w-6" />;
  };

  const navigation = allNavLinks.filter(link => !link.isUserMenu);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b bg-card px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-4 text-lg font-medium">
            <Link
              href="/dashboard"
              className="mb-4 flex items-center gap-2 text-lg font-semibold"
            >
              <div className="flex items-center gap-2 font-semibold">
                {renderLogo()}
                <div>
                  <span className="text-lg text-foreground">StoreFlex Lite</span>
                  <span className="block text-xs font-normal text-muted-foreground">by CEYLONAR</span>
                </div>
              </div>
            </Link>
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-4 px-2.5 ${
                  pathname === item.href
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
       <div className="flex-1">
        {greeting && <div className="animate-fade-in-up font-semibold text-muted-foreground">{greeting}</div>}
      </div>
      <div className="flex justify-end items-center gap-4">
        <ModeToggle />
        <div className="w-[200px] hidden sm:block">
          {stores && stores.length > 0 && (
            <Select defaultValue={stores[0].id}>
                <SelectTrigger id="store-switcher" aria-label="Select Store">
                <SelectValue placeholder={userProfile?.businessName || "Select a store"} />
                </SelectTrigger>
                <SelectContent>
                {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                    {store.name}
                    </SelectItem>
                ))}
                </SelectContent>
            </Select>
          )}
        </div>
         <Link href="/dashboard/account">
            <Button variant="ghost" size="icon" className="rounded-full">
                <User className="h-5 w-5" />
            </Button>
        </Link>
      </div>
    </header>
  );
}
