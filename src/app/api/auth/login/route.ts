import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog, ensureUserRecord } from '@/lib/supabase/auth';
import { createRouteHandlerClient, applyCookieChanges } from '@/lib/supabase/route-handler';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, isValidEmail, normalizeEmail } from '@/lib/auth/registration';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').max(EMAIL_MAX_LENGTH, 'Email is too long'),
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH, 'Password is too long'),
});

function mapLoginError(message: string | undefined): string {
  const normalized = (message || '').toLowerCase();

  if (
    normalized.includes('invalid login credentials') ||
    normalized.includes('invalid email or password') ||
    normalized.includes('email not found') ||
    normalized.includes('user not found')
  ) {
    return 'Invalid email or password';
  }

  // Keep account-specific states generic to avoid account enumeration.
  if (normalized.includes('not confirmed') || normalized.includes('not verified')) {
    return 'Invalid email or password';
  }

  return message || 'Invalid email or password';
}

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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const payload = body as { email?: unknown; password?: unknown };
    if (!payload?.email || !payload?.password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid login data' },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const password = parsed.data.password;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
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
        { error: mapLoginError(error?.message) },
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
