import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next');

  // Sanitasi parameter next untuk mencegah Open Redirect (wajib path relatif)
  let safeNext = '/';
  if (
    rawNext &&
    rawNext.startsWith('/') &&
    !rawNext.startsWith('//') &&
    !rawNext.startsWith('/\\')
  ) {
    safeNext = rawNext;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${safeNext}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
