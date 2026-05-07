import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = (req.auth.user as { role?: string })?.role;
  if (
    (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
    role !== 'admin'
  ) {
    return NextResponse.redirect(new URL('/outils/centrifugation', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
