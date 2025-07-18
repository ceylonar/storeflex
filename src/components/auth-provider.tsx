
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, idToken: null, loading: true });

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
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
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
        });
        return () => unsubscribe();
    } catch (e) {
        console.error(e);
        setError((e as Error).message);
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user && !pathname.startsWith('/login')) {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

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

  if (!user && !pathname.startsWith('/login')) {
    // While redirecting, show a loader to prevent flicker
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, idToken, loading }}>
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
