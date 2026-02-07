import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog, ensureUserRecord } from '@/lib/supabase/auth';
import { createRouteHandlerClient, applyCookieChanges } from '@/lib/supabase/route-handler';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { sendWelcomeEmail } from '@/lib/email/send';
import { getBaseUrl } from '@/lib/seo';
import {
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PASSWORD_MAX_LENGTH,
  getPasswordStrengthMessage,
  isPasswordStrong,
  isValidEmail,
  normalizeEmail,
  normalizeName,
} from '@/lib/auth/registration';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().min(1, 'Email is required').max(EMAIL_MAX_LENGTH, 'Email is too long'),
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH, 'Password is too long'),
  name: z.string().max(NAME_MAX_LENGTH, `Name must be ${NAME_MAX_LENGTH} characters or less`).optional(),
  acceptedLegal: z.boolean(),
});

function mapSignUpError(message: string | undefined): { status: number; error: string } {
  const normalized = (message || '').toLowerCase();

  if (normalized.includes('already registered') || normalized.includes('already exists')) {
    return {
      status: 409,
      error: 'An account with this email already exists. Please sign in.',
    };
  }

  if (normalized.includes('password')) {
    return {
      status: 400,
      error: message || 'Password does not meet requirements.',
    };
  }

  return {
    status: 400,
    error: message || 'Unable to create account. Please verify your information and try again.',
  };
}

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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid registration data' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);
    const normalizedName = normalizeName(parsed.data.name);
    const password = parsed.data.password;
    const acceptedLegal = parsed.data.acceptedLegal;

    // Validate input
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!acceptedLegal) {
      return NextResponse.json(
        { error: 'You must accept the Terms, Privacy Policy, and Refund Policy to create an account.' },
        { status: 400 }
      );
    }

    // Email format validation
    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Password strength validation
    if (!isPasswordStrong(password)) {
      return NextResponse.json(
        { error: getPasswordStrengthMessage(password) },
        { status: 400 }
      );
    }

    const { supabase, cookieChanges } = createRouteHandlerClient(request);
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: normalizedName || normalizedEmail.split('@')[0],
        },
        emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      }
    });

    if (error || !data.user) {
      const mapped = mapSignUpError(error?.message);
      return NextResponse.json(
        { error: mapped.error },
        { status: mapped.status }
      );
    }

    try {
      await createAuditLog({
        userId: data.user.id,
        action: 'USER_REGISTERED',
        entityType: 'user',
        entityId: data.user.id,
      });
    } catch (auditError) {
      console.warn('Register audit log failed:', auditError);
    }

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
      dashboardUrl: `${getBaseUrl()}/dashboard`,
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

    response.headers.set('Cache-Control', 'no-store');
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
