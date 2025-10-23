import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

function isPublicPath(pathname: string): boolean {
  if (pathname === '/') return true; // landing page
  if (pathname.startsWith('/auth/')) return true; // auth pages
  if (pathname.startsWith('/api/auth/')) return true; // auth API endpoints
  return false;
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createClient();

  // Refresh session if expired
  const user = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (!user && !isPublicPath(pathname)) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

