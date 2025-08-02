

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { fetchStores, fetchUserProfile, logoutUser } from '@/lib/queries';
import { ModeToggle } from '../mode-toggle';
import { Logo } from '../icons/logo';
import Image from 'next/image';


const allNavLinks = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes, roles: ['admin', 'manager'] },
  { name: 'Sales', href: '/dashboard/sales', icon: SalesIcon, roles: ['admin', 'manager', 'sales'] },
  { name: 'Buy', href: '/dashboard/buy', icon: Truck, roles: ['admin', 'manager'] },
  { name: 'Customers', href: '/dashboard/customers', icon: Users, roles: ['admin', 'manager', 'sales'] },
  { name: 'Suppliers', href: '/dashboard/suppliers', icon: Users, roles: ['admin', 'manager'] },
  { name: 'Moneyflow', href: '/dashboard/moneyflow', icon: Landmark, roles: ['admin', 'manager', 'sales'] },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText, roles: ['admin'] },
  { name: 'Price Optimizer', href: '/dashboard/price-optimizer', icon: Lightbulb, roles: ['admin'] },
  { name: 'About', href: '/dashboard/about', icon: HelpCircle, roles: ['admin', 'manager', 'sales'] },
  { name: 'Account', href: '/dashboard/account', icon: User, roles: ['admin'], isUserMenu: true },
];

export function Header() {
  const pathname = usePathname();
  const [stores, setStores] = useState<StoreType[] | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [greeting, setGreeting] = useState('');
  
  useEffect(() => {
    async function getData() {
        try {
            const fetchedProfile = await fetchUserProfile();
            const fetchedStores = await fetchStores();
            setStores(fetchedStores);
            setUserProfile(fetchedProfile);
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

  const navigation = allNavLinks.filter(link => !link.isUserMenu && userProfile?.role && link.roles.includes(userProfile.role));
  const userNavigation = allNavLinks.filter(link => link.isUserMenu && userProfile?.role && link.roles.includes(userProfile.role));


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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className='h-8 w-8'>
                <AvatarImage src={userProfile?.logoUrl || "https://placehold.co/40x40.png"} alt="User avatar" data-ai-hint="user avatar" />
                <AvatarFallback>{userProfile?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userProfile?.name || 'My Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {userNavigation.map(item => (
                <Link href={item.href} key={item.name}>
                <DropdownMenuItem>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                </DropdownMenuItem>
                </Link>
            ))}
            <DropdownMenuSeparator />
             <form action={logoutUser}>
                <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </button>
                </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
