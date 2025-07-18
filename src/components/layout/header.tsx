
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
import { Boxes, LayoutDashboard, Lightbulb, Menu, Store, ShoppingCart as SalesIcon, FileText } from 'lucide-react';
import type { Store as StoreType, UserProfile } from '@/lib/types';
import { useEffect, useState } from 'react';
import { fetchStores, fetchUserProfile } from '@/lib/queries';
import { ModeToggle } from '../mode-toggle';
import { signOut } from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';
import { useAuth } from '../auth-provider';


const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Boxes },
  { name: 'Sales', href: '/dashboard/sales', icon: SalesIcon },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
  { name: 'Price Optimizer', href: '/dashboard/price-optimizer', icon: Lightbulb },
];

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [stores, setStores] = useState<StoreType[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);


  const handleLogout = async () => {
    try {
        const { auth } = getFirebaseServices();
        await signOut(auth);
        router.push('/login');
    } catch(e) {
        console.error("Logout failed:", e);
    }
  };

  useEffect(() => {
    if (!user) return;
    async function getData() {
        try {
            const [fetchedStores, fetchedProfile] = await Promise.all([
              fetchStores(),
              fetchUserProfile()
            ]);
            setStores(fetchedStores);
            setUserProfile(fetchedProfile);
        } catch(e) {
            console.error("Failed to fetch data:", e)
        }
    }
    getData();
  }, [user]);

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
              className="mb-4 flex items-center gap-2 text-lg font-semibold text-primary"
            >
              <Store className="h-6 w-6" />
              <span className="text-foreground">StoreFlex Lite</span>
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
      <div className="flex flex-1 justify-end items-center gap-4">
        <ModeToggle />
        <div className="w-[200px]">
          {stores.length > 0 && (
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
                <AvatarImage src={user?.photoURL || "https://placehold.co/40x40.png"} alt="User avatar" data-ai-hint="user avatar" />
                <AvatarFallback>{userProfile?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{userProfile?.name || user?.email || 'My Account'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
