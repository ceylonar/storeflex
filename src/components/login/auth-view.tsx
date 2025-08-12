'use client'

import React, { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from '@/components/icons/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getFirebaseServices } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { createSessionForUser, sendPasswordReset } from "@/lib/auth";
import { useRouter } from 'next/navigation';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';

function SubmitButton({ children, disabled }: { children: React.ReactNode, disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button className="w-full" type="submit" disabled={pending || disabled}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

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

    const handleGoogleSignIn = async () => {
        setIsSubmitting(true);
        try {
            const { auth } = getFirebaseServices();
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ 'prompt': 'select_account' });
            const result = await signInWithPopup(auth, provider);
            await createSessionForUser(result.user);
            router.push('/dashboard');
        } catch (error: any) {
            console.error("Google Sign-In Error:", error);
            let message = 'An unexpected error occurred during Google sign-in.';
            if (error.code === 'auth/popup-closed-by-user') {
                message = 'Sign-in window was closed. Please try again.';
            } else if (error.code === 'auth/unauthorized-domain') {
                 message = "This domain is not authorized. Please contact support or add it to the Firebase console's authorized domains.";
            }
             toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: message });
        } finally {
            setIsSubmitting(false);
        }
    };

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
                
                <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-background px-2 text-xs text-muted-foreground">OR</span>
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 173.4 54.7l-73.2 67.7C309.6 98.4 282.2 88 248 88c-73.2 0-133.1 59.2-133.1 131.5s59.9 131.5 133.1 131.5c82.3 0 115.6-53.4 121.2-80.6H248V261.8h239.8z"></path></svg>
                    Sign in with Google
                </Button>

            </CardContent>
        </Card>
    );
}
