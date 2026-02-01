# Example Supabase Auth Route Implementations

Complete reference implementations for all authentication routes using Supabase Auth.

---

## Registration Route

**File:** `/Users/cope/SHUB-V1/src/app/api/auth/register/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { registerUser } from '@/lib/supabase/auth';
import { z } from 'zod';

const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = RegisterSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name } = validation.data;

    // Register user
    const { user, error } = await registerUser(email, password, name);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user,
        message: 'Account created successfully. Please check your email to verify your account.'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
```

---

## Login Route

**File:** `/Users/cope/SHUB-V1/src/app/api/auth/login/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { loginUser, createAuditLog } from '@/lib/supabase/auth';
import { z } from 'zod';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = LoginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    // Attempt login
    const { user, error } = await loginUser(email, password);

    if (error) {
      // Log failed login attempt
      await createAuditLog({
        action: 'SECURITY_ALERT',
        entityType: 'auth',
        metadata: JSON.stringify({
          event: 'login_failed',
          email,
          reason: error
        }),
        ipAddress: request.headers.get('x-forwarded-for') || undefined,
        userAgent: request.headers.get('user-agent') || undefined
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        user
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Failed to login' },
      { status: 500 }
    );
  }
}
```

---

## Logout Route

**File:** `/Users/cope/SHUB-V1/src/app/api/auth/logout/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { logoutUser } from '@/lib/supabase/auth';

export async function POST() {
  try {
    const { error } = await logoutUser();

    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
```

---

## Get Current User Route

**File:** `/Users/cope/SHUB-V1/src/app/api/auth/me/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { user },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Failed to get user' },
      { status: 500 }
    );
  }
}
```

---

## Reset Password Request Route

**File:** `/Users/cope/SHUB-V1/src/app/api/auth/reset-password/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/supabase/auth';
import { z } from 'zod';

const ResetPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = ResetPasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email } = validation.data;

    // Request password reset
    const { error } = await resetPassword(email);

    // Always return success to prevent email enumeration
    // Even if user doesn't exist, return success
    if (error && !error.includes('not found')) {
      console.error('Password reset error:', error);
    }

    return NextResponse.json(
      {
        success: true,
        message: 'If an account exists with this email, you will receive a password reset link.'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: 'Failed to process password reset' },
      { status: 500 }
    );
  }
}
```

---

## Update Password Route

**File:** `/Users/cope/SHUB-V1/src/app/api/auth/update-password/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { updatePassword, getCurrentUser } from '@/lib/supabase/auth';
import { z } from 'zod';

const UpdatePasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    const validation = UpdatePasswordSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message },
        { status: 400 }
      );
    }

    const { newPassword } = validation.data;

    // Update password
    const { error } = await updatePassword(newPassword);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Password updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}
```

---

## OAuth Callback Route

**File:** `/Users/cope/SHUB-V1/src/app/api/auth/callback/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home page or dashboard
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`);
}
```

---

## Example Protected API Route

**File:** `/Users/cope/SHUB-V1/src/app/api/example/protected/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, isAdmin } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  // Get authenticated user
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Optional: Check for specific role
  if (!isAdmin(user)) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  // Your protected logic here
  return NextResponse.json(
    {
      message: 'This is a protected endpoint',
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles
      }
    },
    { status: 200 }
  );
}
```

---

## Example Database Query with RLS

**File:** `/Users/cope/SHUB-V1/src/app/api/products/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createServerClient } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();

    // Query with automatic RLS enforcement
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        creator:users!creator_id(id, name, email),
        versions:product_versions(
          *,
          files:product_files(*)
        ),
        media:product_media(*),
        prices(*)
      `)
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // RLS policies automatically ensure:
    // - Only published products visible to non-creators
    // - Creators can see their own draft products
    // - Admins can see all products

    return NextResponse.json(
      { product },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get product error:', error);
    return NextResponse.json(
      { error: 'Failed to get product' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createServerClient();

    // RLS policy automatically checks ownership
    // Will fail if user doesn't own the product
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete product or not authorized' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Product deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Delete product error:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
```

---

## Client-Side Auth Usage

**Example React Component:**

```typescript
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginForm() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      // Redirect to dashboard
      router.push('/dashboard');
      router.refresh(); // Refresh to update auth state
    } catch (err) {
      setError('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (user) {
    router.push('/dashboard');
    return null;
  }

  return (
    <form onSubmit={handleLogin}>
      {error && <div className="error">{error}</div>}

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

---

## Testing Auth Routes

```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Get current user (with session cookie)
curl -X GET http://localhost:3000/api/auth/me \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt

# Request password reset
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

---

## Summary

All authentication routes now use Supabase Auth instead of custom JWT authentication. Key changes:

1. **Registration** - Creates Supabase Auth account + user record
2. **Login** - Uses Supabase session management
3. **Logout** - Clears Supabase session
4. **Password Reset** - Uses Supabase email templates
5. **Protected Routes** - Use `getCurrentUser()` from Supabase
6. **RLS Enforcement** - Automatic via Supabase policies

**Migration Benefits:**
- Built-in session management
- Automatic JWT refresh
- OAuth providers ready
- Better security (no custom crypto)
- Simplified codebase

**Next Steps:**
1. Implement these routes
2. Update existing API routes to use `getCurrentUser()` from Supabase
3. Test authentication flows
4. Deploy to staging
5. Test in production
