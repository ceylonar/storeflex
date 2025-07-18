
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

async function verifyIdToken(token: string) {
    const auth = getAuth(getAdminApp());
    return auth.verifyIdToken(token);
}

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('__session')?.value;

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isDashboardPage = request.nextUrl.pathname.startsWith('/dashboard');

  if (!sessionCookie && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (sessionCookie) {
    try {
      await verifyIdToken(sessionCookie);
      // User is authenticated
      if (isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      // Token is invalid, redirect to login
      console.error('Middleware Auth Error:', error);
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.set('__session', '', { maxAge: -1 }); // Clear invalid cookie
      return response;
    }
  }
  
  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
