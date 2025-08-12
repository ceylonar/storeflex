


'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from '@/components/icons/logo';
import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import AuthView from "@/components/login/auth-view";

export default function LoginPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
           <AuthView />
        </main>
    );
}
