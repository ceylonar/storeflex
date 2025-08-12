
'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export async function encrypt(payload: any, secretKey: string) {
  const key = new TextEncoder().encode(secretKey);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1 day from now')
    .sign(key)
}

export async function decrypt(input: string, secretKey: string): Promise<any> {
  const key = new TextEncoder().encode(secretKey);
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    })
    return payload
  } catch (e) {
      console.error("Decryption failed:", e);
      return null
  }
}

export async function getSession() {
  const sessionCookie = cookies().get('session')?.value
  if (!sessionCookie) return null

  const secretKey = process.env.SESSION_SECRET;
  if (!secretKey) {
    console.error('SESSION_SECRET is not set for getSession.');
    return null;
  }
  return await decrypt(sessionCookie, secretKey)
}
