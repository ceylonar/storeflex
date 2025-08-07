
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
import { Boxes, LayoutDashboard, Lightbulb, Menu, ShoppingCart as SalesIcon, FileText, Users, Truck, Landmark, HelpCircle, User, LogOut, Receipt } from 'lucide-react';
import type { Store as StoreType } from '@/lib/types';
import type { User as AuthUser } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { fetchStores } from '@/lib/queries';
import { ModeToggle } from '../mode-toggle';
import { Logo } from '../icons/logo';
import { logout } from '@/lib/auth';


const allNavLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes, roles: ['admin'] },
  { name: 'Sales', href: '/dashboard/sales', icon: SalesIcon, roles: ['admin', 'sales'] },
  { name: 'Buy', href: '/dashboard/buy', icon: Truck, roles: ['admin'] },
  { name: 'Customers', href: '/dashboard/customers', icon: Users, roles: ['admin', 'sales'] },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Users, roles: ['admin'] },
  { name: 'Moneyflow', href: '/dashboard/moneyflow', icon: Landmark, roles: ['admin'] },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt, roles: ['admin'] },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText, roles: ['admin'] },
  { name: 'Price Optimizer', href: '/dashboard/price-optimizer', icon: Lightbulb, roles: ['admin'] },
  { name: 'About', href: '/dashboard/about', icon: HelpCircle, roles: ['admin', 'sales'] },
  { name: 'Account', href: '/dashboard/account', icon: User, roles: ['admin'] },
];

export function Header({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const [stores, setStores] = useState<StoreType[] | null>(null);
  const [greeting, setGreeting] = useState('');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
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
    setGreeting(`Hello, ${user.name}`);
  }, [user.name]);


  const navigation = allNavLinks.filter(link => link.roles.includes(user.role));

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-x-4 border-b bg-card px-4 shadow-sm sm:px-6 lg:px-8">
      <div className="flex items-center gap-x-4">
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
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
                    onClick={() => setIsSheetOpen(false)}
                    className="mb-4 flex items-center gap-2 text-lg font-semibold"
                >
                    <div className="flex items-center gap-2 font-semibold">
                    <Logo className="h-6 w-6" />
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
                    onClick={() => setIsSheetOpen(false)}
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
                <form action={logout} className="mt-auto">
                    <Button variant="ghost" className="w-full justify-start gap-4 px-2.5 text-muted-foreground hover:text-foreground">
                        <LogOut className="h-5 w-5" />
                        Logout
                    </Button>
                </form>
                </nav>
            </SheetContent>
        </Sheet>
        <div className="hidden sm:block font-semibold text-muted-foreground">{greeting}</div>
      </div>
      
       <div className="sm:hidden flex-1">
        {greeting && <div className="animate-fade-in-up font-semibold text-muted-foreground text-center">{greeting}</div>}
      </div>

      <div className="flex justify-end items-center gap-4">
        <ModeToggle />
        <div className="w-[200px] hidden sm:block">
          {stores && stores.length > 0 && (
            <Select defaultValue={stores[0].id}>
                <SelectTrigger id="store-switcher" aria-label="Select Store">
                <SelectValue placeholder={"Select a store"} />
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
         <form action={logout}>
            <Button variant="ghost" size="icon" className="rounded-full hidden sm:inline-flex" title="Logout">
                <LogOut className="h-5 w-5" />
            </Button>
        </form>
      </div>
    </header>
  );
}
