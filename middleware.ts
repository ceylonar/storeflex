
'use server';

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

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

  // For all other cases, just continue
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
