import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient, applyCookieChanges } from '@/lib/supabase/route-handler';

function buildRedirect(request: NextRequest, path: string, params?: Record<string, string>) {
  const url = new URL(path, request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return url;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const authError = searchParams.get('error');
  const authErrorDescription = searchParams.get('error_description');

  if (authError) {
    return NextResponse.redirect(
      buildRedirect(request, '/auth/login', {
        authError: authErrorDescription || 'Unable to verify account. Please try signing in again.',
      })
    );
  }

  if (!code) {
    return NextResponse.redirect(
      buildRedirect(request, '/auth/login', {
        authError: 'Missing verification code. Please try signing in.',
      })
    );
  }

  const { supabase, cookieChanges } = createRouteHandlerClient(request);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      buildRedirect(request, '/auth/login', {
        authError: 'Verification link expired or invalid. Request a new email and try again.',
      })
    );
  }

  const response = NextResponse.redirect(buildRedirect(request, '/dashboard'));
  applyCookieChanges(response, cookieChanges);
  return response;
}
