import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog, ensureUserRecord } from '@/lib/supabase/auth';
import { createRouteHandlerClient, applyCookieChanges } from '@/lib/supabase/route-handler';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting: 10 attempts per 15 minutes per IP
  const limitResult = await applyRateLimit(request, {
    config: RATE_LIMIT_CONFIGS.AUTH_LOGIN,
    byIp: true,
    byUser: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { supabase, cookieChanges } = createRouteHandlerClient(request);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || 'Invalid email or password' },
        { status: 401 }
      );
    }

    try {
      await createAuditLog({
        userId: data.user.id,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: data.user.id,
      });
    } catch (auditError) {
      console.warn('Login audit log failed:', auditError);
    }

    const user = await ensureUserRecord(data.user);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to load user profile' },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
      },
      { status: 200 }
    );

    response.headers.set('Cache-Control', 'no-store');
    applyCookieChanges(response, cookieChanges);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
