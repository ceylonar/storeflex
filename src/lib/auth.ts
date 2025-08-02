
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchUserByEmail, createInitialUser, getCurrentUser } from './queries';
import type { UserProfile } from './types';

const SESSION_COOKIE_NAME = 'storeflex-session';

export async function getSession() {
  const cookie = cookies().get(SESSION_COOKIE_NAME);
  if (!cookie) return null;

  try {
    const session = JSON.parse(cookie.value);
    return session;
  } catch (error) {
    return null;
  }
}

export async function loginUser(prevState: { message: string } | undefined, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  let user = await fetchUserByEmail(email);

  // If no user exists, this is the first login. Create the admin user.
  if (!user) {
    console.log("No user found, creating initial admin user...");
    user = await createInitialUser({ email, password });
    if (!user) {
        return { success: false, message: 'Failed to create initial admin account.' };
    }
  }

  if (user.password !== password) {
    return { success: false, message: 'Invalid credentials.' };
  }
  
  const session = { userId: user.id, role: user.role };

  cookies().set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/',
  });

  redirect('/dashboard');
}

export async function logoutUser() {
    cookies().delete(SESSION_COOKIE_NAME);
    redirect('/login');
}
