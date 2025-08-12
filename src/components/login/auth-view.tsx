'use client'

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from '@/components/icons/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseServices } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { createSessionForUser, sendPasswordReset } from "@/lib/auth";
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';

function ForgotPasswordDialog() {
  const [email, setEmail] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please enter your email address.' });
      return;
    }
    setIsSubmitting(true);
    const result = await sendPasswordReset(email);
    if (result.success) {
      toast({ title: 'Success', description: result.message });
      setIsOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="link" className="px-0 font-normal">Forgot password?</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Your Password</DialogTitle>
          <DialogDescription>
            Enter your email address and we will send you a link to reset your password.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          <Label htmlFor="reset-email">Email Address</Label>
          <Input id="reset-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleForgotPassword} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AuthView() {
    const { toast } = useToast();
    const router = useRouter();
    const [loginError, setLoginError] = useState<string | null>(null);
    const [signupError, setSignupError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoginError(null);
        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        try {
            const { auth } = getFirebaseServices();
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            await createSessionForUser(userCredential.user);
            router.push('/dashboard');
        } catch (error: any) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                setLoginError('Invalid email or password.');
            } else {
                setLoginError('An unexpected error occurred during login.');
            }
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleSignupSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSignupError(null);
        setIsSubmitting(true);
        const formData = new FormData(event.currentTarget);
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;
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

        try {
            const { auth } = getFirebaseServices();
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            await createSessionForUser(userCredential.user);
            router.push('/dashboard');
        } catch (error: any) {
             if (error.code === 'auth/email-already-in-use') {
                setSignupError('This email address is already in use.');
            } else {
                setSignupError('An unexpected error occurred during sign-up.');
            }
        } finally {
            setIsSubmitting(false);
        }
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
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="password">Password</Label>
                                    <ForgotPasswordDialog />
                                </div>
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
    );
}