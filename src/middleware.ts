
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const secretKey = process.env.SESSION_SECRET;
const key = new TextEncoder().encode(secretKey);

async function decrypt(input: string): Promise<any> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (e) {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session')?.value;
  let session = null;

  if (sessionCookie) {
    session = await decrypt(sessionCookie);
  }
  
  const { pathname } = request.nextUrl;

  // If user is trying to access login page but is already logged in, redirect to dashboard
  if ((pathname === '/login' || pathname === '/') && session?.user) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // If user is trying to access a protected dashboard route and is not logged in, redirect to login
  if (pathname.startsWith('/dashboard') && !session?.user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // For all other cases, just continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
