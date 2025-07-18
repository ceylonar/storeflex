
'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { getFirebaseServices } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
}

const AuthContext = createContext<AuthContextType>({ user: null });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    try {
        const { auth } = getFirebaseServices();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setUser(user);
          setLoading(false);
          if (!user && pathname !== '/login') {
            router.push('/login');
          }
        });
        return () => unsubscribe();
    } catch (e) {
        console.error(e);
        setError((e as Error).message);
        setLoading(false);
    }
  }, [router, pathname]);

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

  return (
    <AuthContext.Provider value={{ user }}>
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
