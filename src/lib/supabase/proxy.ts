import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const pathname = request.nextUrl.pathname;

  // If environment variables are not yet configured or placeholder during build, pass through
  if (!supabaseUrl || !supabaseAnonKey || supabaseAnonKey.includes('placeholder')) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth session safely
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Clear invalid or expired session cookies so the browser doesn't send them repeatedly
      request.cookies.getAll().forEach((cookie) => {
        if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
          request.cookies.delete(cookie.name);
          supabaseResponse.cookies.delete(cookie.name);
        }
      });
    } else {
      user = data.user;
    }
  } catch {
    // In case of unhandled auth error, remove stale auth cookies
    request.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) {
        request.cookies.delete(cookie.name);
        supabaseResponse.cookies.delete(cookie.name);
      }
    });
  }

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isTalentRoute = pathname.startsWith('/talent');
  const isVendorRoute = pathname.startsWith('/vendor');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isProtectedRoute = isTalentRoute || isVendorRoute || isOnboardingRoute;

  // Helper to construct redirect response while preserving any cookie modifications
  const createRedirectResponse = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    return redirectResponse;
  };

  // 1. Unauthenticated user trying to access protected route
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return createRedirectResponse(url);
  }

  // 2. Authenticated user logic
  if (user) {
    // Determine user role
    const userRole = (user.user_metadata?.role as 'talent' | 'vendor') || 'talent';

    // If user is logged in and visits /login or /register, redirect to dashboard
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = userRole === 'talent' ? '/talent/dashboard' : '/vendor/dashboard';
      return createRedirectResponse(url);
    }

    // Role-based route enforcement
    if (isTalentRoute && userRole !== 'talent') {
      const url = request.nextUrl.clone();
      url.pathname = '/vendor/dashboard';
      return createRedirectResponse(url);
    }

    if (isVendorRoute && userRole !== 'vendor') {
      const url = request.nextUrl.clone();
      url.pathname = '/talent/dashboard';
      return createRedirectResponse(url);
    }
  }

  return supabaseResponse;
}
