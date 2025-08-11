

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation';
import { getFirebaseServices } from './firebase';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { encrypt, getSession } from './session';

export interface User {
    id: string; // This will now be the Firebase Auth UID
    name: string;
    email: string; // Add email to the user object
    role: 'admin'; // Only admin role remains
}

export async function login(prevState: { error: string | undefined } | null, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
      return { error: 'Email and password are required.'}
  }

  // Gracefully handle missing Firebase configuration
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
    return { error: 'Firebase is not configured. Please set up your .env file according to the README.md instructions.' };
  }

  try {
      const { app } = getFirebaseServices();
      const auth = getAuth(app);
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      const user: User = { 
          id: userCredential.user.uid, 
          name: userCredential.user.displayName || userCredential.user.email || 'Admin', 
          email: userCredential.user.email!, 
          role: 'admin' 
      };

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      const session = await encrypt({ user, expires })

      cookies().set('session', session, { expires, httpOnly: true })

      redirect('/dashboard');
  } catch (e: any) {
      console.error("Firebase Auth Error:", e.code, e.message);
       if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
          return { error: 'Invalid email or password.' };
      }
      return { error: 'An unexpected error occurred during login. Please check server logs.' };
  }
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
  redirect('/login');
}

export async function getUser(): Promise<User | null> {
    const session = await getSession();
    if (session && session.user) {
        return session.user;
    }
    return null;
}
