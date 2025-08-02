
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './lib/auth';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};

export async function middleware(req: NextRequest) {
  const session = await getSession();
  const { pathname } = req.nextUrl;

  // Allow access to login page regardless of session state
  if (pathname === '/login') {
    return NextResponse.next();
  }

  // If no session and not on login page, redirect to login
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If there's a session and user is on root, redirect to dashboard
  if (session && pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Allow access to other pages if session exists
  return NextResponse.next();
}
