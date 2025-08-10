
import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateSession } from '@/lib/session'
import type { User } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl

  // If user is trying to access login page but is already logged in, redirect to dashboard
  if ((pathname === '/login' || pathname === '/') && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is trying to access a protected dashboard route and is not logged in, redirect to login
  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // All logged-in users are admins, so no more role-based checks needed

  return await updateSession(request) || NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
