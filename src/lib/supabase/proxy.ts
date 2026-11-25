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

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isTalentRoute = pathname.startsWith('/talent');
  const isVendorRoute = pathname.startsWith('/vendor');
  const isOnboardingRoute = pathname.startsWith('/onboarding');
  const isProtectedRoute = isTalentRoute || isVendorRoute || isOnboardingRoute;

  // 1. Unauthenticated user trying to access protected route
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // 2. Authenticated user logic
  if (user) {
    // Authoritatively determine user role and HR company membership from database
    let baseRole = (user.user_metadata?.role as 'talent' | 'vendor') || 'talent';
    let hasActiveHrMembership = baseRole === 'vendor';

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'talent' || profile?.role === 'vendor') {
      baseRole = profile.role;
      hasActiveHrMembership = profile.role === 'vendor';
    }

    if (!hasActiveHrMembership && (isVendorRoute || isAuthRoute)) {
      const { data: memberRow } = await supabase
        .from('company_members')
        .select('company_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (memberRow?.company_id) {
        hasActiveHrMembership = true;
      }
    }

    // If user is logged in and visits /login or /register, redirect to dashboard
    if (isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname =
        baseRole === 'vendor' || (hasActiveHrMembership && baseRole !== 'talent')
          ? '/vendor/dashboard'
          : '/talent/dashboard';
      return NextResponse.redirect(url);
    }

    // Role-based route enforcement
    if (isTalentRoute && baseRole !== 'talent') {
      const url = request.nextUrl.clone();
      url.pathname = '/vendor/dashboard';
      return NextResponse.redirect(url);
    }

    if (isVendorRoute && !hasActiveHrMembership) {
      const url = request.nextUrl.clone();
      url.pathname = '/talent/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
