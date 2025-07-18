import type { ReactNode } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ClientHeader } from '@/components/layout/client-header';
import { AuthProvider } from '@/components/auth-provider';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen w-full bg-secondary/50">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <ClientHeader />
          <main className="flex-1 p-4 sm:p-6 md:p-8">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
