
'use server'

import { cookies } from 'next/headers'
import { getFirebaseServices } from './firebase';
import { getAuth, type User as FirebaseUser, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from 'firebase/auth';
import { encrypt, getSession } from './session';
import { z } from 'zod';

export async function createSessionForUser(firebaseUser: {uid: string, email: string | null, displayName: string | null}) {
    if (!firebaseUser.email) {
        throw new Error("User email not found.");
    }
    
    // Create a plain, serializable user object for the session.
    const user = { 
        id: firebaseUser.uid, 
        name: firebaseUser.displayName || firebaseUser.email || 'Admin', 
        email: firebaseUser.email, 
        role: 'admin' 
    };

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ user, expires })

    cookies().set('session', session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production' })
}


export async function sendPasswordReset(email: string): Promise<{success: boolean, message: string}> {
    if (!email) {
        return { success: false, message: 'Email address is required.' };
    }
    try {
        const { app } = getFirebaseServices();
        const auth = getAuth(app);
        const { sendPasswordResetEmail } = await import('firebase/auth');
        await sendPasswordResetEmail(auth, email);
        return { success: true, message: 'Password reset email sent successfully. Check your inbox.' };
    } catch(e: any) {
        if (e.code === 'auth/user-not-found') {
            return { success: false, message: 'No user found with this email address.' };
        }
        return { success: false, message: 'Failed to send password reset email. Please try again.' };
    }
}


export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
}

export async function getUser(): Promise<{ id: string; name: string; email: string; role: 'admin'; } | null> {
    const session = await getSession();
    if (session && session.user) {
        return session.user;
    }
    return null;
}
