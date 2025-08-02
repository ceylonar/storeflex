
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ClientHeader } from '@/components/layout/client-header';
import { getCurrentUser } from '@/lib/queries';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Authentication is removed, so we get a default mock user.
  const user = await getCurrentUser();

  return (
      <div className="flex min-h-screen w-full bg-secondary/50">
        <Sidebar userProfile={user} />
        <div className="flex flex-1 flex-col">
          <ClientHeader userProfile={user} />
          <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
        </div>
      </div>
  );
}
