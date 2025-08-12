
'use server'

import { cookies } from 'next/headers'
import { getFirebaseServices } from './firebase';
import { getAuth, type User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { encrypt, decrypt } from './session';

export async function createSessionForUser(firebaseUser: { uid: string, email: string | null, displayName: string | null }) {
    if (!firebaseUser.email) {
      return { success: false, message: "User email not found during session creation." };
    }
    
    // Create a plain, serializable user object for the session.
    // This is the critical change to prevent serialization errors.
    const user = { 
        id: firebaseUser.uid, 
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin', 
        email: firebaseUser.email, 
    };

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ user, expires })

    cookies().set('session', session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production' })
    
    return { success: true };
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
}

export async function getUser(): Promise<{ id: string; name: string; email: string; } | null> {
    const sessionCookie = cookies().get('session')?.value
    if (!sessionCookie) return null
    
    const session = await decrypt(sessionCookie);
    if (session && session.user) {
        return session.user;
    }
    return null;
}
