
'use server'

import { cookies } from 'next/headers'
import { getFirebaseServices } from './firebase';
import { getAuth, type User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { encrypt, decrypt } from './session';
import { getFirebaseAdmin } from './firebase-admin';

export async function createSessionForUser(token: string) {
    const { auth: adminAuth } = getFirebaseAdmin();
    try {
        const decodedToken = await adminAuth.verifyIdToken(token);
        const user = {
            id: decodedToken.uid,
            email: decodedToken.email || '',
            name: decodedToken.name || decodedToken.email?.split('@')[0] || 'User',
        };

        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const session = await encrypt({ user, expires })

        cookies().set('session', session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production' })
        
        return { success: true };

    } catch (error) {
        console.error("Failed to verify ID token or create session:", error);
        return { success: false, message: "Failed to create a secure session." };
    }
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
}

export async function getUser(): Promise<{ id: string; name: string; email: string; } | null> {
    const sessionCookie = cookies().get('session')?.value
    if (!sessionCookie) return null
    
    const session = await decrypt(sessionCookie);
    if (session && session.user && session.expires && new Date(session.expires) > new Date()) {
        return session.user;
    }
    return null;
}
