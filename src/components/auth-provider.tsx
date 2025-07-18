
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  idToken: string | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, idToken: null });

async function setToken(token: string) {
    await fetch('/api/auth/set-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
    });
}

async function clearToken() {
    await fetch('/api/auth/clear-token', {
        method: 'POST',
    });
}


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    try {
        const { auth } = getFirebaseServices();
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          setUser(currentUser);
          if (currentUser) {
            const token = await currentUser.getIdToken();
            setIdToken(token);
            await setToken(token);
          } else {
            setIdToken(null);
            await clearToken();
          }
          setLoading(false);
          // Redirect logic is handled below to avoid race conditions
        });
        return () => unsubscribe();
    } catch (e) {
        console.error(e);
        setError((e as Error).message);
        setLoading(false);
    }
  }, [isMounted]);

  useEffect(() => {
    if (!loading) {
      const isProtectedRoute = pathname.startsWith('/dashboard');
      if (!user && isProtectedRoute) {
        router.push('/login');
      }
      if (user && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);


  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
     return (
      <div className="flex h-screen items-center justify-center text-center text-destructive">
       <div className="space-y-2">
        <h1 className="text-xl font-bold">Application Error</h1>
        <p className="text-sm">{error}</p>
        <p className="text-xs text-muted-foreground">Please ensure your Firebase environment variables are set correctly.</p>
       </div>
      </div>
    );
  }

  // Prevent dashboard flicker for unauthenticated users
  if (!user && pathname.startsWith('/dashboard')) {
      return (
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      );
  }

  return (
    <AuthContext.Provider value={{ user, idToken }}>
        {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
