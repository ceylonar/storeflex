
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from './lib/auth';

export const config = {
  matcher: ['/dashboard/:path*'],
};

export async function middleware(req: NextRequest) {
  const session = await getSession();

  // If no session, redirect to login
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If there's a session, allow access to the dashboard
  return NextResponse.next();
}
