import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/supabase/auth';
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

    const { user, error } = await loginUser(email, password);

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
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
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
