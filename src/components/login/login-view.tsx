

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from '@/components/icons/logo';
import LoginForm from './login-form';

export default function LoginView() {
    return (
        <Card className="mx-auto w-full max-w-sm">
            <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <Logo className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-2xl">StoreFlex Lite</CardTitle>
                <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <LoginForm />
            </CardContent>
        </Card>
    );
}
