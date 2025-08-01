

'use client';

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/icons/logo";
import dynamic from 'next/dynamic';
import { Skeleton } from "@/components/ui/skeleton";

const LoginForm = dynamic(() => import('@/components/login/login-form'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  ),
});


export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/50">
      <Card className="mx-auto max-w-sm">
        <CardHeader className="text-center">
          <Link href="/" className="inline-flex justify-center items-center gap-2 mb-4">
            <Logo className="h-8 w-8" />
          </Link>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
