# Protected Routes & Role-Based Access Control Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Role-Based Access Matrix](#role-based-access-matrix)
3. [Server-Side Protection (API Routes)](#server-side-protection-api-routes)
4. [Client-Side Protection (Pages)](#client-side-protection-pages)
5. [Middleware Protection](#middleware-protection)
6. [Integration Examples](#integration-examples)
7. [Best Practices](#best-practices)

---

## Overview

SequenceHUB has **3 user roles** with different access levels:

- 🛡️ **ADMIN** - Full system access (admin panel, user management, moderation)
- 🎨 **CREATOR** - Can sell products (create listings, view sales, manage payouts)
- 🛒 **BUYER** - Can purchase products (browse, buy, download, view library)

**Note:** Users can have multiple roles (e.g., a creator can also be a buyer)

---

## Role-Based Access Matrix

| Feature | Buyer | Creator | Admin |
|---------|-------|---------|-------|
| Browse products | ✅ | ✅ | ✅ |
| Purchase products | ✅ | ✅ | ✅ |
| Download owned products | ✅ | ✅ | ✅ |
| View library | ✅ | ✅ | ✅ |
| Create products | ❌ | ✅ | ✅ |
| Edit own products | ❌ | ✅ | ✅ |
| View sales dashboard | ❌ | ✅ | ✅ |
| Connect Stripe | ❌ | ✅ | ✅ |
| View payouts | ❌ | ✅ | ✅ |
| View all users | ❌ | ❌ | ✅ |
| Moderate content | ❌ | ❌ | ✅ |
| View admin panel | ❌ | ❌ | ✅ |

---

## Server-Side Protection (API Routes)

### Example 1: Protect Product Creation (Creator Only)

**File:** `src/app/api/dashboard/products/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  // 1. Get authenticated user
  const user = await getCurrentUser();

  // 2. Check if user is authenticated
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // 3. Check if user has CREATOR or ADMIN role
  if (!isCreatorOrAdmin(user)) {
    return NextResponse.json(
      { error: 'Only creators can create products' },
      { status: 403 }
    );
  }

  // 4. Proceed with product creation
  try {
    const body = await request.json();
    const { title, description, category, price } = body;

    const product = await db.product.create({
      data: {
        creatorId: user.id, // ← Use authenticated user's ID
        title,
        description,
        category,
        slug: generateSlug(title),
        status: 'DRAFT',
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
```

---

### Example 2: Protect Product Updates (Owner or Admin Only)

**File:** `src/app/api/dashboard/products/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Fetch the product
  const product = await db.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    return NextResponse.json(
      { error: 'Product not found' },
      { status: 404 }
    );
  }

  // ✅ OWNERSHIP CHECK: Only product owner or admin can edit
  const isOwner = product.creatorId === user.id;
  const isAdminUser = isAdmin(user);

  if (!isOwner && !isAdminUser) {
    return NextResponse.json(
      { error: 'You can only edit your own products' },
      { status: 403 }
    );
  }

  // Update product
  try {
    const body = await request.json();
    const updated = await db.product.update({
      where: { id: params.id },
      data: {
        title: body.title,
        description: body.description,
        // ... other fields
      },
    });

    return NextResponse.json({ product: updated });
  } catch (error) {
    return NextResponse.json(
      { error: 'Update failed' },
      { status: 500 }
    );
  }
}
```

---

### Example 3: Protect Admin Panel (Admin Only)

**File:** `src/app/api/admin/users/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // ✅ ADMIN-ONLY CHECK
  if (!isAdmin(user)) {
    return NextResponse.json(
      { error: 'Admin access required' },
      { status: 403 }
    );
  }

  // Get all users (admin only)
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      createdAt: true,
      roles: {
        select: {
          role: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ users });
}
```

---

### Example 4: Protect Download Access (Entitlement Check)

**File:** `src/app/api/library/download/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateDownloadToken } from '@/lib/download-tokens';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { productId, versionId } = body;

  // ✅ ENTITLEMENT CHECK: User must own this product
  const entitlement = await db.entitlement.findUnique({
    where: {
      userId_productId_versionId: {
        userId: user.id,
        productId,
        versionId,
      },
    },
  });

  if (!entitlement || !entitlement.isActive) {
    // Log failed access attempt
    await createAuditLog({
      userId: user.id,
      action: 'DOWNLOAD_ACCESS_DENIED',
      entityType: 'product',
      entityId: productId,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      { error: 'You do not have access to this product' },
      { status: 403 }
    );
  }

  // ✅ RATE LIMIT CHECK: Max 10 downloads per day
  if (entitlement.downloadCount >= 10) {
    return NextResponse.json(
      { error: 'Daily download limit reached (10/day)' },
      { status: 429 }
    );
  }

  // Generate signed download URL
  const downloadUrl = await generateDownloadToken({
    userId: user.id,
    entitlementId: entitlement.id,
    fileId: versionId,
  });

  // Update download count
  await db.entitlement.update({
    where: { id: entitlement.id },
    data: {
      downloadCount: { increment: 1 },
      lastDownloadAt: new Date(),
    },
  });

  return NextResponse.json({ downloadUrl });
}
```

---

## Client-Side Protection (Pages)

### Example 5: Protect Creator Dashboard Page

**File:** `src/app/dashboard/products/page.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function ProductsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isCreatorOrAdmin } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/products');
      return;
    }

    // Redirect to onboarding if not a creator
    if (!isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }
  }, [isAuthenticated, isLoading, isCreatorOrAdmin, router]);

  // Show loading while checking auth
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Show error if not creator
  if (!isCreatorOrAdmin) {
    return null; // Will redirect via useEffect
  }

  // ✅ Render protected content
  return (
    <div>
      <h1>My Products</h1>
      {/* Creator dashboard content */}
    </div>
  );
}
```

---

### Example 6: Protect Admin Panel

**File:** `src/app/admin/page.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/admin');
      return;
    }

    // ✅ ADMIN-ONLY: Redirect non-admins
    if (!isAdmin) {
      router.push('/dashboard'); // Redirect to regular dashboard
      return;
    }
  }, [isAuthenticated, isLoading, isAdmin, router]);

  if (isLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {/* Admin content */}
    </div>
  );
}
```

---

### Example 7: Custom Hook for Protected Routes

**File:** `src/hooks/use-require-auth.ts`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import type { Role } from '@/lib/auth-types';

interface RequireAuthOptions {
  redirectTo?: string;
  requiredRole?: Role;
  requireCreatorOrAdmin?: boolean;
  requireAdmin?: boolean;
}

export function useRequireAuth(options: RequireAuthOptions = {}) {
  const {
    redirectTo = '/auth/login',
    requiredRole,
    requireCreatorOrAdmin = false,
    requireAdmin = false,
  } = options;

  const router = useRouter();
  const { user, isAuthenticated, isLoading, isCreatorOrAdmin, isAdmin } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Check authentication
    if (!isAuthenticated) {
      const currentPath = window.location.pathname;
      router.push(`${redirectTo}?redirect=${currentPath}`);
      return;
    }

    // Check specific role requirement
    if (requiredRole && user) {
      const hasRole = user.roles.some((r) => r.role === requiredRole);
      if (!hasRole) {
        router.push('/dashboard');
        return;
      }
    }

    // Check creator or admin requirement
    if (requireCreatorOrAdmin && !isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }

    // Check admin requirement
    if (requireAdmin && !isAdmin) {
      router.push('/dashboard');
      return;
    }
  }, [
    isAuthenticated,
    isLoading,
    isCreatorOrAdmin,
    isAdmin,
    user,
    requiredRole,
    requireCreatorOrAdmin,
    requireAdmin,
    redirectTo,
    router,
  ]);

  return {
    user,
    isAuthenticated,
    isLoading,
    isAuthorized:
      isAuthenticated &&
      (!requireCreatorOrAdmin || isCreatorOrAdmin) &&
      (!requireAdmin || isAdmin),
  };
}
```

**Usage:**

```typescript
'use client';

import { useRequireAuth } from '@/hooks/use-require-auth';

export default function CreatorDashboard() {
  const { user, isLoading, isAuthorized } = useRequireAuth({
    requireCreatorOrAdmin: true,
  });

  if (isLoading || !isAuthorized) {
    return <div>Loading...</div>;
  }

  return <div>Welcome, {user?.name}!</div>;
}
```

---

## Middleware Protection

### Example 8: Next.js Middleware (Edge Runtime)

**File:** `src/middleware.ts`

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('auth_token')?.value;
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicRoutes = ['/', '/auth/login', '/auth/register', '/browse', '/p'];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Protected routes require auth token
  if (!authToken) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow authenticated requests
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

**Note:** For role-based checks in middleware, you'd need to decode the JWT, but this adds overhead. Better to do role checks on the page/API route level.

---

## Integration Examples

### Example 9: Product Purchase Flow (Buyer)

**File:** `src/app/api/checkout/create/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  // ✅ AUTH CHECK: Must be logged in to purchase
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'You must be logged in to purchase' },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { productId } = body;

  // Get product details
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      prices: { where: { isActive: true } },
      creator: {
        include: {
          creatorAccount: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: 'Product not found' },
      { status: 404 }
    );
  }

  // ✅ OWNERSHIP CHECK: Can't buy your own product
  if (product.creatorId === user.id) {
    return NextResponse.json(
      { error: 'You cannot purchase your own product' },
      { status: 400 }
    );
  }

  // ✅ DUPLICATE CHECK: Already owns this product
  const existingEntitlement = await db.entitlement.findFirst({
    where: {
      userId: user.id,
      productId: product.id,
      isActive: true,
    },
  });

  if (existingEntitlement) {
    return NextResponse.json(
      { error: 'You already own this product' },
      { status: 400 }
    );
  }

  // Create Stripe checkout session
  const price = product.prices[0];
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.title,
            description: product.description,
          },
          unit_amount: Math.round(price.amount * 100),
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/library?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/p/${product.slug}`,
    client_reference_id: user.id,
    metadata: {
      productId: product.id,
      userId: user.id,
    },
    // ✅ STRIPE CONNECT: Transfer to creator
    payment_intent_data: {
      transfer_data: {
        destination: product.creator.creatorAccount?.stripeAccountId!,
      },
      application_fee_amount: Math.round(
        price.amount * 100 * (product.creator.creatorAccount?.platformFeePercent || 10) / 100
      ),
    },
  });

  // Save checkout session
  await db.checkoutSession.create({
    data: {
      sessionId: session.id,
      userId: user.id,
      productId: product.id,
      priceId: price.id,
      amount: price.amount,
      currency: price.currency,
      status: 'PENDING',
    },
  });

  // Audit log
  await createAuditLog({
    userId: user.id,
    action: 'CHECKOUT_SESSION_CREATED',
    entityType: 'checkout',
    entityId: session.id,
    metadata: JSON.stringify({ productId: product.id }),
  });

  return NextResponse.json({ sessionId: session.id, url: session.url });
}
```

---

### Example 10: Creator Stripe Onboarding (Creator Only)

**File:** `src/app/api/creator/onboarding/start/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog, assignRole } from '@/lib/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // Check if user already has a creator account
  const existingAccount = await db.creatorAccount.findUnique({
    where: { userId: user.id },
  });

  let stripeAccountId = existingAccount?.stripeAccountId;

  // Create Stripe Connect account if doesn't exist
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId: user.id,
      },
    });

    stripeAccountId = account.id;

    // Create or update creator account
    await db.creatorAccount.upsert({
      where: { userId: user.id },
      update: {
        stripeAccountId,
        stripeAccountStatus: 'pending',
        onboardingStatus: 'IN_PROGRESS',
      },
      create: {
        userId: user.id,
        stripeAccountId,
        stripeAccountStatus: 'pending',
        onboardingStatus: 'IN_PROGRESS',
      },
    });

    // ✅ ASSIGN CREATOR ROLE
    await assignRole(user.id, 'CREATOR');

    await createAuditLog({
      userId: user.id,
      action: 'STRIPE_ONBOARDING_STARTED',
      entityType: 'creator_account',
      entityId: stripeAccountId,
    });
  }

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/creator/onboarding`,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}
```

---

### Example 11: View Sales Stats (Creator Only)

**File:** `src/app/api/dashboard/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }

  // ✅ CREATOR/ADMIN CHECK
  if (!isCreatorOrAdmin(user)) {
    return NextResponse.json(
      { error: 'Creator access required' },
      { status: 403 }
    );
  }

  // Get stats for THIS creator only (ownership filter)
  const [totalProducts, totalSales, totalRevenue, totalDownloads] = await Promise.all([
    // Products created by this user
    db.product.count({
      where: { creatorId: user.id },
    }),

    // Orders for this creator's products
    db.orderItem.count({
      where: {
        product: {
          creatorId: user.id,
        },
      },
    }),

    // Total revenue from this creator's products
    db.orderItem.aggregate({
      where: {
        product: {
          creatorId: user.id,
        },
        order: {
          status: 'COMPLETED',
        },
      },
      _sum: {
        priceAtPurchase: true,
      },
    }),

    // Total downloads of this creator's products
    db.entitlement.aggregate({
      where: {
        order: {
          items: {
            some: {
              product: {
                creatorId: user.id,
              },
            },
          },
        },
      },
      _sum: {
        downloadCount: true,
      },
    }),
  ]);

  return NextResponse.json({
    totalProducts,
    totalSales,
    totalRevenue: totalRevenue._sum.priceAtPurchase || 0,
    totalDownloads: totalDownloads._sum.downloadCount || 0,
  });
}
```

---

## Best Practices

### ✅ DO's

1. **Always check authentication first**
   ```typescript
   const user = await getCurrentUser();
   if (!user) return unauthorized();
   ```

2. **Verify ownership before allowing edits**
   ```typescript
   if (resource.ownerId !== user.id && !isAdmin(user)) {
     return forbidden();
   }
   ```

3. **Use audit logging for sensitive actions**
   ```typescript
   await createAuditLog({
     userId: user.id,
     action: 'PRODUCT_DELETED',
     entityId: productId,
   });
   ```

4. **Filter database queries by user ID**
   ```typescript
   const products = await db.product.findMany({
     where: { creatorId: user.id }, // ← Only this user's products
   });
   ```

5. **Use typed role checks**
   ```typescript
   import { isCreatorOrAdmin, isAdmin } from '@/lib/auth-utils';
   if (!isCreatorOrAdmin(user)) return forbidden();
   ```

### ❌ DON'Ts

1. **Don't trust client-side role checks alone**
   ```typescript
   // ❌ BAD: Only client-side check
   {user.roles.includes('ADMIN') && <AdminPanel />}

   // ✅ GOOD: Server validates on API call
   // Client just hides UI, server enforces access
   ```

2. **Don't skip ownership validation**
   ```typescript
   // ❌ BAD: Anyone can delete any product
   await db.product.delete({ where: { id } });

   // ✅ GOOD: Check ownership first
   const product = await db.product.findUnique({ where: { id } });
   if (product.creatorId !== user.id) return forbidden();
   ```

3. **Don't expose sensitive data in responses**
   ```typescript
   // ❌ BAD: Returns passwordHash
   return NextResponse.json({ user });

   // ✅ GOOD: Exclude sensitive fields
   const { passwordHash, ...safeUser } = user;
   return NextResponse.json({ user: safeUser });
   ```

4. **Don't hardcode user IDs**
   ```typescript
   // ❌ BAD: Uses hardcoded ID
   const products = await db.product.findMany({
     where: { creatorId: 'some-id' }
   });

   // ✅ GOOD: Uses authenticated user
   const products = await db.product.findMany({
     where: { creatorId: user.id }
   });
   ```

---

## Summary

**Protection Layers:**

1. 🔒 **Middleware** - Basic auth token check
2. 🔒 **API Routes** - Role validation, ownership checks
3. 🔒 **Database Queries** - Filter by user ID
4. 🔒 **Audit Logs** - Track all sensitive actions
5. 🔒 **Client Pages** - Redirect unauthorized users

**Role Hierarchy:**

```
BUYER (default)
  ↓ can become
CREATOR (via Stripe Connect)
  ↓ manually promoted
ADMIN (via database update)
```

**Quick Reference:**

- Authenticate: `const user = await getCurrentUser()`
- Check creator: `isCreatorOrAdmin(user)`
- Check admin: `isAdmin(user)`
- Check owner: `resource.ownerId === user.id`
- Log action: `await createAuditLog({ userId, action, ... })`

---

**Ready to implement?** These patterns protect your entire SequenceHUB marketplace! 🚀
