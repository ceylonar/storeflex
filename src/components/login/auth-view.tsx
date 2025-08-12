
'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from '@/components/icons/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "../ui/button";
import { login, signup, createSessionForUser } from "@/lib/auth";
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';

export default function AuthView() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginError, setLoginError] = useState<string | null>(null);
    const [signupError, setSignupError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const { auth } = getFirebaseServices();
        const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
            if (user) {
                // User is signed in via Firebase on the client.
                // Now, create the server-side session.
                const result = await createSessionForUser({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                });
                
                if (result.success) {
                    router.push('/dashboard');
                } else {
                    // Handle server session creation failure if necessary
                    setLoginError("Failed to create a secure session. Please try again.");
                }
            }
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [router]);

    const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoginError(null);
        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        const result = await login(formData);

        if (result?.message) {
            setLoginError(result.message);
        } else {
            toast({ title: "Login Successful", description: "Redirecting..." });
            // onAuthStateChanged will handle the rest
        }
        setIsSubmitting(false);
    }
    
    const handleSignupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSignupError(null);
        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;
        const signupCode = formData.get('signupCode') as string;

        if (password !== confirmPassword) {
            setSignupError("Passwords do not match.");
            setIsSubmitting(false);
            return;
        }
        if (signupCode !== "CeylonarStoreFlex") {
            setSignupError("Invalid Sign-Up Code.");
            setIsSubmitting(false);
            return;
        }
        
        const result = await signup(formData);

        if (result?.message) {
            setSignupError(result.message);
        } else {
            toast({ title: "Account Created", description: "Logging you in..." });
            // onAuthStateChanged will handle the rest
        }
        setIsSubmitting(false);
    }

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
                <Tabs defaultValue="login" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="login">Sign In</TabsTrigger>
                        <TabsTrigger value="signup">Sign Up</TabsTrigger>
                    </TabsList>
                    <TabsContent value="login">
                        <form onSubmit={handleLoginSubmit} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" name="email" type="email" placeholder="admin@example.com" required autoComplete="email"/>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input id="password" name="password" type="password" required autoComplete="current-password"/>
                            </div>
                            {loginError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Login Failed</AlertTitle><AlertDescription>{loginError}</AlertDescription></Alert>)}
                            <Button className="w-full" type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Login
                            </Button>
                        </form>
                    </TabsContent>
                    <TabsContent value="signup">
                        <form onSubmit={handleSignupSubmit} className="space-y-4 py-4">
                            <div className="space-y-2"><Label htmlFor="name">Full Name</Label><Input id="name" name="name" type="text" placeholder="John Doe" required /></div>
                            <div className="space-y-2"><Label htmlFor="signup-email">Email</Label><Input id="signup-email" name="email" type="email" placeholder="you@example.com" required /></div>
                            <div className="space-y-2"><Label htmlFor="signup-password">Password</Label><Input id="signup-password" name="password" type="password" required /></div>
                            <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm Password</Label><Input id="confirmPassword" name="confirmPassword" type="password" required /></div>
                            <div className="space-y-2"><Label htmlFor="signupCode">Sign-Up Code</Label><Input id="signupCode" name="signupCode" type="password" required /></div>
                            {signupError && (<Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Sign-up Failed</AlertTitle><AlertDescription>{signupError}</AlertDescription></Alert>)}
                            <Button className="w-full" type="submit" disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Create Account
                            </Button>
                        </form>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    )
}
