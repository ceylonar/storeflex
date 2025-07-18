
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
          if (!currentUser && pathname !== '/login' && pathname !== '/welcome') {
            router.push('/login');
          }
        });
        return () => unsubscribe();
    } catch (e) {
        console.error(e);
        setError((e as Error).message);
        setLoading(false);
    }
  }, [router, pathname, isMounted]);

  if (!isMounted || loading) {
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

  // Allow unauthenticated access to login and welcome pages
  if (!user && (pathname === '/login' || pathname === '/welcome')) {
      return (
         <AuthContext.Provider value={{ user, idToken }}>
            {children}
         </AuthContext.Provider>
      )
  }

  // If authenticated, render children (except on login page)
  if (user && pathname !== '/login') {
    return (
        <AuthContext.Provider value={{ user, idToken }}>
            {children}
        </AuthContext.Provider>
    );
  }
  
  // Fallback for unauthenticated users on protected pages (will show loader until redirect)
  return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
