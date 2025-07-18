
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { createInitialStoreForUser } from '@/lib/queries';

type AuthMode = 'login' | 'signup';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { auth } = getFirebaseServices();
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/dashboard');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (user) {
            await createInitialStoreForUser({
                uid: user.uid,
                email: user.email || '',
            });
        }
        router.push('/dashboard');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: authMode === 'login' ? 'Login Failed' : 'Sign Up Failed',
        description: (error as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setAuthMode(prevMode => (prevMode === 'login' ? 'signup' : 'login'));
    setEmail('');
    setPassword('');
  };
  
  if (!isMounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-8 left-8 flex items-center gap-2 text-lg font-semibold text-primary">
          <Store className="h-6 w-6" />
          <span className="text-foreground">StoreFlex Lite</span>
        </div>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full max-w-xs" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
               <Skeleton className="h-4 w-16" />
               <Skeleton className="h-10 w-full" />
            </div>
             <div className="grid gap-2">
               <Skeleton className="h-4 w-16" />
               <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-48" />
          </CardFooter>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
       <div className="absolute top-8 left-8 flex items-center gap-2 text-lg font-semibold text-primary">
          <Store className="h-6 w-6" />
          <span className="text-foreground">StoreFlex Lite</span>
        </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">{authMode === 'login' ? 'Login' : 'Sign Up'}</CardTitle>
          <CardDescription>
            {authMode === 'login' 
                ? 'Enter your email below to login to your account.'
                : 'Create a new account to get started.'
            }
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleAuthAction}>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {authMode === 'login' ? 'Sign in' : 'Create account'}
            </Button>
             <Button variant="link" type="button" onClick={toggleAuthMode} className="text-sm font-normal">
              {authMode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </main>
  );
}
