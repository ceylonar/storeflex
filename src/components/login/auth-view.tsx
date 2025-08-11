

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from '@/components/icons/logo';
import LoginForm from './login-form';
import SignupForm from "./signup-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { getFirebaseServices } from "@/lib/firebase";
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from "@/hooks/use-toast";
import { encrypt } from "@/lib/session";
import { cookies } from 'next/headers';
import type { User } from "@/lib/auth";


export default function AuthView() {
    const router = useRouter();
    const { toast } = useToast();

    const handleGoogleSignIn = async () => {
        try {
            const { app } = getFirebaseServices();
            const auth = getAuth(app);
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            // On successful sign-in, the onAuthStateChanged listener in a layout
            // or a middleware redirect would handle navigation.
            // For this app, we'll manually redirect after a short delay
            // to allow Firebase to set its client-side session.
            toast({ title: "Google Sign-In Successful", description: "Redirecting to your dashboard..."});
            setTimeout(() => {
                router.push('/dashboard');
            }, 1000);

        } catch (error: any) {
            console.error("Google Sign-In Error:", error);
            toast({
                variant: 'destructive',
                title: 'Google Sign-In Failed',
                description: error.message || 'An unexpected error occurred.'
            });
        }
    };


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
                        <div className="py-4">
                            <LoginForm />
                        </div>
                    </TabsContent>
                    <TabsContent value="signup">
                        <div className="py-4">
                            <SignupForm />
                        </div>
                    </TabsContent>
                </Tabs>
                
                <div className="relative my-4">
                    <Separator />
                    <span className="absolute left-1/2 -translate-x-1/2 top-[-10px] bg-background px-2 text-xs text-muted-foreground">OR</span>
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                    <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 173.4 54.7l-73.2 67.7C309.6 98.4 282.2 88 248 88c-73.2 0-133.1 59.2-133.1 131.5s59.9 131.5 133.1 131.5c82.3 0 115.6-53.4 121.2-80.6H248V261.8h239.8z"></path></svg>
                    Sign in with Google
                </Button>

            </CardContent>
        </Card>
    );
}
