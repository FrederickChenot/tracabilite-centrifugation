import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Redirige les utilisateurs déjà connectés qui tentent d'accéder à /login
  if (pathname === '/login' && req.auth) {
    return NextResponse.redirect(new URL('/outils/centrifugation', req.url));
  }

  // Routes outils — protégées par cookie labo_access
  if (
    pathname === '/outils/centrifugation' ||
    pathname.startsWith('/outils/centrifugation/') ||
    pathname === '/outils/transport' ||
    pathname.startsWith('/outils/transport/') ||
    pathname === '/recherche' ||
    pathname.startsWith('/recherche/')
  ) {
    if (req.cookies.get('labo_access')?.value !== 'true') {
      return NextResponse.redirect(new URL('/outils/login', req.url));
    }
    return NextResponse.next();
  }

  if (
    pathname === '/' ||
    pathname === '/mentions-legales' ||
    pathname === '/cgu' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/contact') ||
    pathname.startsWith('/transport/') ||
    pathname.startsWith('/api/transport/') ||
    pathname.startsWith('/api/public/') ||
    pathname.startsWith('/outils/') ||
    pathname.startsWith('/api/centri/') ||
    pathname.startsWith('/api/referentiels') ||
    pathname === '/api/admin/sites' ||
    pathname === '/api/outils/auth'
  ) {
    return NextResponse.next();
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const role = (req.auth.user as { role?: string })?.role;
  const mustChange = (req.auth.user as { must_change_password?: boolean })?.must_change_password;

  if (mustChange && !pathname.startsWith('/profil') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(new URL('/profil', req.url));
  }

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
