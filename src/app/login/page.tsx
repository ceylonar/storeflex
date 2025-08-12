
'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from '@/components/icons/logo';
import { Skeleton } from "@/components/ui/skeleton";
import AuthView from "@/components/login/auth-view";

function AuthViewSkeleton() {
    return (
        <Card className="mx-auto w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Logo className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">StoreFlex Lite</CardTitle>
                <CardDescription>Your all-in-one inventory solution.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 py-4">
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
                 <div className="relative my-4">
                    <Skeleton className="h-px w-full" />
                    <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-background px-2 text-xs text-muted-foreground">OR</span>
                </div>
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
    )
}


export default function LoginPage() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4">
           {isClient ? <AuthView /> : <AuthViewSkeleton />}
        </main>
    );
}
