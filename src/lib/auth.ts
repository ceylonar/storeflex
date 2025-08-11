

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation';
import { getFirebaseServices } from './firebase';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, signInWithCredential, OAuthProvider } from 'firebase/auth';
import { encrypt, getSession } from './session';
import { z } from 'zod';


export interface User {
    id: string; 
    name: string;
    email: string;
    role: 'admin';
}

const LoginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

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


export async function login(prevState: { error: string | undefined } | null, formData: FormData) {
  const validatedFields = LoginSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
      const errorMessages = validatedFields.error.flatten().fieldErrors;
      const message = Object.values(errorMessages).flat().join(' ');
      return { error: message };
  }
  
  const { email, password } = validatedFields.data;

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

      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const session = await encrypt({ user, expires })

      cookies().set('session', session, { expires, httpOnly: true })

      redirect('/dashboard');
  } catch (e: any) {
       if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-email') {
          return { error: 'Invalid email or password.' };
      }
      return { error: 'An unexpected error occurred during login. Please try again.' };
  }
}

export async function signup(prevState: { error: string | undefined } | null, formData: FormData) {
  const validatedFields = SignupSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
      const errorMessages = validatedFields.error.flatten().fieldErrors;
      const message = Object.values(errorMessages).flat().join(' ');
      return { error: message };
  }

  const { email, password, name } = validatedFields.data;

  try {
    const { app } = getFirebaseServices();
    const auth = getAuth(app);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    const user: User = { 
        id: userCredential.user.uid, 
        name: name,
        email: userCredential.user.email!, 
        role: 'admin' 
    };

    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const session = await encrypt({ user, expires })

    cookies().set('session', session, { expires, httpOnly: true })

    redirect('/dashboard');
  } catch (e: any) {
    if (e.code === 'auth/email-already-in-use') {
        return { error: 'This email address is already in use.' };
    }
    return { error: 'An unexpected error occurred during sign-up. Please try again.' };
  }
}

export async function loginWithGoogle(idToken: string) {
    // This server action would typically verify the idToken with Firebase Admin SDK.
    // However, since we are using client-side SDK for auth, we will trust the token
    // for this demo application's context and create a session.
    // In a production app, you MUST verify the token on the server.
    
    // For now, let's assume the client has authenticated and sent us user info.
    // The idToken would be decoded or used to fetch user details.
    // The client will need to send us name and email along with the token.
    // This is a simplified example.
    
    // This function is now a placeholder. Google Sign-In will be handled
    // on the client and the session will be created via a different server action
    // if needed, or by directly using the client-side auth state persistence.
    // For this app, we'll rely on Firebase's own session management on the client
    // after google sign in and handle session in middleware.

    // A more robust implementation would look like this:
    // const decodedToken = await getFirebaseAdmin().auth.verifyIdToken(idToken);
    // const user = { id: decodedToken.uid, email: decodedToken.email, ... };
    // create session...
    console.log("Received Google ID Token (not verified in this demo):", idToken);
}

export async function sendPasswordReset(email: string): Promise<{success: boolean, message: string}> {
    if (!email) {
        return { success: false, message: 'Email address is required.' };
    }
    try {
        const { app } = getFirebaseServices();
        const auth = getAuth(app);
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
