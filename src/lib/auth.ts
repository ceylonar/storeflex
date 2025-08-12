
'use server'

import { cookies } from 'next/headers'
import { getFirebaseServices } from './firebase';
import { getAuth, type User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { encrypt, decrypt } from './session';
import { revalidatePath } from 'next/cache';

export async function createSessionForUser(firebaseUser: FirebaseUser) {
    if (!firebaseUser.email) {
        throw new Error("User email not found.");
    }
    
    // Create a plain, serializable user object for the session.
    const user = { 
        id: firebaseUser.uid, 
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Admin', 
        email: firebaseUser.email, 
    };

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ user, expires })

    cookies().set('session', session, { expires, httpOnly: true, secure: process.env.NODE_ENV === 'production' })
}

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  const { auth } = getFirebaseServices();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await createSessionForUser(userCredential.user);
    return { success: true };
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
      return { success: false, message: 'Invalid email or password.' };
    }
    console.error('Login Error:', error);
    return { success: false, message: 'An unexpected error occurred during login.' };
  }
}

export async function signup(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

   if (!name || !email || !password) {
    return { success: false, message: 'Name, email, and password are required.' };
  }
  if (password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters.' };
  }

  const { auth } = getFirebaseServices();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    
    // Re-fetch user to get updated profile
    const updatedUser = getAuth(auth.app).currentUser;
    if (updatedUser) {
        await createSessionForUser(updatedUser);
        return { success: true };
    } else {
        throw new Error("Could not find updated user after profile update.");
    }
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, message: 'This email address is already in use.' };
    }
    console.error('Signup Error:', error);
    return { success: false, message: 'An unexpected error occurred during sign-up.' };
  }
}


export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
  revalidatePath('/login', 'layout');
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
