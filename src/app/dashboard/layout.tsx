
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ClientHeader } from '@/components/layout/client-header';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return (
      <div className="flex min-h-screen w-full bg-secondary/50">
        <Sidebar user={user} />
        <div className="flex flex-1 flex-col">
          <ClientHeader user={user} />
          <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
        </div>
      </div>
  );
}
