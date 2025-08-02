
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl

  // If user is trying to access login page but is already logged in, redirect to dashboard
  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is trying to access a protected dashboard route and is not logged in, redirect to login
  if (pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // --- Role-based access control ---
  if (pathname.startsWith('/dashboard') && session) {
    const userRole = session.user.role;
    
    const adminOnlyPaths = [
      '/dashboard/inventory',
      '/dashboard/buy',
      '/dashboard/suppliers',
      '/dashboard/moneyflow',
      '/dashboard/reports',
      '/dashboard/price-optimizer',
      '/dashboard/account'
    ];
    
    // Redirect sales user from admin-only pages
    if (userRole === 'sales' && (adminOnlyPaths.some(path => pathname.startsWith(path)))) {
        return NextResponse.redirect(new URL('/dashboard/sales', request.url));
    }

    // Redirect sales user from the main dashboard to their default page
    if (userRole === 'sales' && pathname === '/dashboard') {
        return NextResponse.redirect(new URL('/dashboard/sales', request.url));
    }
  }


  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
