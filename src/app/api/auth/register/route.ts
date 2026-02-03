import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog, ensureUserRecord } from '@/lib/supabase/auth';
import { createRouteHandlerClient, applyCookieChanges } from '@/lib/supabase/route-handler';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { sendWelcomeEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  // Apply rate limiting: 5 attempts per hour per IP
  const limitResult = await applyRateLimit(request, {
    config: RATE_LIMIT_CONFIGS.AUTH_REGISTER,
    byIp: true,
    byUser: false,
    message: 'Too many registration attempts. Please try again later.',
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  try {
    const body = await request.json();
    const { email, password, name } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password strength validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const { supabase, cookieChanges } = createRouteHandlerClient(request);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email.split('@')[0],
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
      }
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || 'User with this email already exists' },
        { status: 409 }
      );
    }

    await createAuditLog({
      userId: data.user.id,
      action: 'USER_REGISTERED',
      entityType: 'user',
      entityId: data.user.id,
    });

    const user = await ensureUserRecord(data.user);
    if (!user) {
      return NextResponse.json(
        { error: 'Failed to load user profile' },
        { status: 500 }
      );
    }

    // Send welcome email (fire and forget - don't block response)
    sendWelcomeEmail({
      recipientEmail: user.email,
      userName: user.name || 'there',
      dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
      registrationDate: new Date(),
    }).catch((error) => {
      console.error('Failed to send welcome email:', error);
      // Don't fail registration if email fails
    });

    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        },
      },
      { status: 201 }
    );

    applyCookieChanges(response, cookieChanges);
    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
