

'use server'

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { NextRequest } from 'next/server'

const secretKey = process.env.SESSION_SECRET || 'fallback-secret-key-for-session'
const key = new TextEncoder().encode(secretKey)

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
      return {}
  }
}

export async function getSession() {
  const session = cookies().get('session')?.value
  if (!session) return null
  return await decrypt(session)
}
