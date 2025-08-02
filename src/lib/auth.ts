
'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { redirect } from 'next/navigation';

const secretKey = process.env.SESSION_SECRET || 'fallback-secret-key-for-session'
const key = new TextEncoder().encode(secretKey)

// --- Hardcoded Users ---
const users = [
    { id: '1', name: 'Admin', username: 'superadmin', password: 'storeflexadmin', role: 'admin' },
    { id: '2', name: 'Sales Associate', username: 'sales', password: 'storeflexsales', role: 'sales' },
]
// -----------------------

export interface User {
    id: string;
    name: string;
    username: string;
    role: 'admin' | 'sales';
}


export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key)
}

export async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (e) {
      console.log("Decryption failed:", e);
      return null;
  }
}

export async function login(prevState: { error: string | undefined } | null, formData: FormData) {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
      return { error: 'Username and password are required.'}
  }

  const user = users.find((u) => u.username === username && u.password === password)

  if (!user) {
    return { error: 'Invalid username or password.' }
  }

  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  const sessionUser: User = { id: user.id, name: user.name, username: user.username, role: user.role as 'admin' | 'sales' }
  const session = await encrypt({ user: sessionUser, expires })

  cookies().set('session', session, { expires, httpOnly: true })

  redirect('/dashboard');
}

export async function logout() {
  cookies().set('session', '', { expires: new Date(0) })
  redirect('/login');
}

export async function getSession() {
  const session = cookies().get('session')?.value
  if (!session) return null
  return await decrypt(session)
}

export async function getUser(): Promise<User | null> {
    const session = await getSession();
    if (session && session.user) {
        return session.user;
    }
    return null;
}

export async function updateSession(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  if (!session) return

  // Refresh the session so it doesn't expire
  const parsed = await decrypt(session)
  parsed.expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  const res = NextResponse.next()
  res.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    expires: parsed.expires,
  })
  return res
}
