
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchUserByEmail, fetchUserProfile } from './queries';
import { UserProfile } from './types';

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

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  const user = await fetchUserByEmail(email);

  if (!user || user.password !== password) {
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

export async function getCurrentUser(): Promise<UserProfile | null> {
    const session = await getSession();
    if (!session?.userId) {
      return null;
    }
    return fetchUserProfile(session.userId);
}
