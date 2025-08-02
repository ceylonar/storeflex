
'use client'

import { useActionState } from 'react'
import { login } from '@/lib/auth'
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { Logo } from '@/components/icons/logo';
import { useFormStatus } from 'react-dom';
import React, { useEffect, useState } from 'react';


function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full" type="submit" aria-disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      Login
    </Button>
  );
}

function LoginForm() {
  const [state, formAction] = useActionState(login, null)

  return (
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            name="username"
            type="text"
            placeholder="superadmin"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input 
            id="password" 
            name="password"
            type="password" 
            required 
          />
        </div>
        
        {state?.error && (
           <Alert variant="destructive">
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Login Failed</AlertTitle>
             <AlertDescription>{state.error}</AlertDescription>
           </Alert>
        )}

        <LoginButton />
      </form>
  )
}


export default function LoginPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
                <Logo className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl">StoreFlex Lite</CardTitle>
            <CardDescription>Enter your credentials to access the dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          {isClient ? <LoginForm /> : <div className="h-[250px] animate-pulse" />}
        </CardContent>
      </Card>
    </main>
  );
}
