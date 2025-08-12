
'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation';
import { getFirebaseServices } from './firebase';
import { getAuth, type User as FirebaseUser } from 'firebase/auth';
import { encrypt, getSession } from './session';
import { z } from 'zod';
import { getFirebaseAdmin } from './firebase-admin';


export interface User {
    id: string; 
    name: string;
    email: string;
    role: 'admin';
}

const SignupSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  signupCode: z.string().refine(code => code === "CeylonarStoreFlex", {
    message: "Invalid Sign-Up Code.",
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


export async function createSessionForUser(firebaseUser: {uid: string, email: string | null, displayName: string | null}) {
    if (!firebaseUser.email) {
        throw new Error("User email not found.");
    }
    
    // Check if the user exists in Firebase Auth to ensure it's a valid user
    const { auth: adminAuth } = getFirebaseAdmin();
    try {
        const userRecord = await adminAuth.getUser(firebaseUser.uid);
        const user: User = { 
            id: userRecord.uid, 
            name: userRecord.displayName || userRecord.email || 'Admin', 
            email: userRecord.email!, 
            role: 'admin' 
        };

        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const session = await encrypt({ user, expires })

        cookies().set('session', session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production' })
        
        // No redirect here, let the client handle it.
        return { success: true };

    } catch (error) {
        console.error("Session creation error:", error);
        throw new Error("Failed to create user session.");
    }
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
  redirect('/login');
}

export async function getUser(): Promise<User | null> {
    const session = await getSession();
    if (session && session.user) {
        return session.user;
    }
    return null;
}
