
'use server'

import { cookies } from 'next/headers'
import { getFirebaseAdmin } from './firebase-admin';
import { encrypt } from './session';

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
        // Directly use the secret from the environment variable here
        const secretKey = process.env.SESSION_SECRET;
        if (!secretKey) {
            throw new Error('SESSION_SECRET is not set on the server.');
        }
        const session = await encrypt({ user, expires }, secretKey);

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
    
    // Directly use the secret from the environment variable here
    const secretKey = process.env.SESSION_SECRET;
    if (!secretKey) {
        console.error('SESSION_SECRET is not set on the server for getUser.');
        return null;
    }
    const session = await decrypt(sessionCookie, secretKey);
    if (session && session.user && session.expires && new Date(session.expires) > new Date()) {
        return session.user;
    }
    return null;
}
