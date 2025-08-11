

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from '@/components/icons/logo';
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

const AuthView = dynamic(() => import('@/components/login/auth-view'), {
  ssr: false,
  loading: () => (
     <Card className="mx-auto w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
            <Logo className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl">StoreFlex Lite</CardTitle>
        <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  )
});

export default function LoginPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
           <AuthView />
        </main>
    );
}
