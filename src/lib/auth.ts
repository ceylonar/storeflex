
'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { fetchUserByEmail, createInitialUser } from './queries';

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

  // If no user exists with that email, create it as the first admin.
  if (!user) {
    console.log("No user found, creating initial user...");
    user = await createInitialUser({ email, password });
    if (!user) {
        return { success: false, message: 'Could not create an initial admin account. The database may not be empty.' };
    }
  }

  if (user.password !== password) {
    return { success: false, message: 'Invalid credentials.' };
  }
  
  const session = { userId: user.id };

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
