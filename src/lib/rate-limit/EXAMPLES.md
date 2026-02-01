# Rate Limiting Examples

This file contains practical examples for implementing rate limiting in SequenceHUB.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Advanced Patterns](#advanced-patterns)
3. [Custom Configurations](#custom-configurations)
4. [Testing](#testing)
5. [Monitoring](#monitoring)

## Basic Usage

### Example 1: Simple IP-Based Rate Limiting

```typescript
// /src/app/api/public/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Apply rate limiting: 100 requests per minute per IP
  const limitResult = await applyRateLimit(request, {
    config: RATE_LIMIT_CONFIGS.API_UNAUTHENTICATED,
    byIp: true,
    byUser: false,
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  // Your search logic here
  const results = await searchProducts(request.nextUrl.searchParams);

  return NextResponse.json({ results });
}
```

### Example 2: User-Based Rate Limiting

```typescript
// /src/app/api/user/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Apply rate limiting: 30 updates per hour per user
  const limitResult = await applyRateLimit(request, {
    config: RATE_LIMIT_CONFIGS.PRODUCT_UPDATE,
    byUser: true,
    byIp: false,
    message: 'You can only update your profile 30 times per hour.',
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  // Update profile logic
  const updatedProfile = await updateUserProfile(user.id, await request.json());

  return NextResponse.json({ profile: updatedProfile });
}
```

### Example 3: Higher-Order Function Wrapper

```typescript
// /src/app/api/newsletter/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rate-limit';

export const POST = withRateLimit(
  async (request: NextRequest) => {
    const { email } = await request.json();

    await subscribeToNewsletter(email);

    return NextResponse.json({ success: true });
  },
  {
    config: {
      maxRequests: 3,
      windowSeconds: 3600, // 1 hour
      identifier: 'newsletter:subscribe',
    },
    byIp: true,
    message: 'You can only subscribe 3 times per hour.',
  }
);
```

## Advanced Patterns

### Example 4: Conditional Rate Limiting

```typescript
// /src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth-utils';
import { getCurrentUser } from '@/lib/auth';;
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Skip rate limiting for admin users
  const limitResult = await applyRateLimit(request, {
    config: RATE_LIMIT_CONFIGS.API_AUTHENTICATED,
    byUser: true,
    skip: async (req, u) => {
      return isAdmin(u);
    },
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  const users = await getAllUsers();
  return NextResponse.json({ users });
}
```

### Example 5: Resource-Specific Rate Limiting

```typescript
// /src/app/api/products/[id]/like/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: productId } = params;

  // Rate limit per product: 5 likes per hour per product per user
  const limitResult = await applyRateLimit(request, {
    config: {
      maxRequests: 5,
      windowSeconds: 3600,
      identifier: 'product:like',
    },
    keyIdentifier: `${user.id}:${productId}`,
    byUser: false,
    byIp: false,
    message: 'You can only like this product 5 times per hour.',
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  await likeProduct(productId, user.id);
  return NextResponse.json({ success: true });
}
```

### Example 6: Multi-Tier Rate Limiting

```typescript
// /src/app/api/search/advanced/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  // Apply different limits based on authentication
  const config = user
    ? {
        maxRequests: 100,
        windowSeconds: 60,
        identifier: 'search:advanced:auth',
      }
    : {
        maxRequests: 10,
        windowSeconds: 60,
        identifier: 'search:advanced:unauth',
      };

  const limitResult = await applyRateLimit(request, {
    config,
    byUser: !!user,
    byIp: !user,
    message: user
      ? 'Rate limit: 100 searches per minute for authenticated users'
      : 'Rate limit: 10 searches per minute. Login for higher limits.',
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  const results = await advancedSearch(await request.json());
  return NextResponse.json({ results });
}
```

### Example 7: Webhook IP Allowlist

```typescript
// /src/app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getClientIp, isIpAllowed, STRIPE_WEBHOOK_IPS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);

  // Only allow Stripe IPs
  if (!isIpAllowed(clientIp, STRIPE_WEBHOOK_IPS)) {
    return NextResponse.json(
      { error: 'Forbidden - Invalid source IP' },
      { status: 403 }
    );
  }

  // Verify webhook signature
  const signature = request.headers.get('stripe-signature');
  const event = await stripe.webhooks.constructEvent(
    await request.text(),
    signature!,
    process.env.STRIPE_WEBHOOK_SECRET!
  );

  // Process webhook
  await handleStripeWebhook(event);

  return NextResponse.json({ received: true });
}
```

## Custom Configurations

### Example 8: Dynamic Rate Limits Based on User Tier

```typescript
// /src/app/api/export/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's subscription tier
  const subscription = await getUserSubscription(user.id);

  // Different limits based on tier
  const limits = {
    free: { maxRequests: 1, windowSeconds: 86400 }, // 1/day
    pro: { maxRequests: 10, windowSeconds: 86400 }, // 10/day
    enterprise: { maxRequests: 100, windowSeconds: 86400 }, // 100/day
  };

  const config = {
    ...limits[subscription.tier],
    identifier: 'export:data',
  };

  const limitResult = await applyRateLimit(request, {
    config,
    byUser: true,
    message: `Export limit for ${subscription.tier} tier exceeded.`,
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  const exportData = await generateExport(user.id);
  return NextResponse.json({ export: exportData });
}
```

### Example 9: Time-Based Rate Limits

```typescript
// /src/app/api/batch/process/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';;
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hour = new Date().getHours();
  const isPeakHours = hour >= 9 && hour <= 17; // 9 AM - 5 PM

  // Stricter limits during peak hours
  const config = isPeakHours
    ? { maxRequests: 5, windowSeconds: 3600, identifier: 'batch:peak' }
    : { maxRequests: 20, windowSeconds: 3600, identifier: 'batch:offpeak' };

  const limitResult = await applyRateLimit(request, {
    config,
    byUser: true,
    message: isPeakHours
      ? 'Peak hours limit: 5 batch jobs per hour'
      : 'Off-peak limit: 20 batch jobs per hour',
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  const job = await processBatchJob(user.id, await request.json());
  return NextResponse.json({ job });
}
```

## Testing

### Example 10: Unit Testing Rate Limiting

```typescript
// /src/lib/rate-limit/__tests__/limiter.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { createTestRateLimiter, simulateRequests, createTestConfig } from '../test-utils';

describe('Rate Limiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = createTestRateLimiter();
  });

  it('should allow requests within limit', async () => {
    const config = createTestConfig(5, 60);
    const key = { type: 'ip', identifier: '127.0.0.1' };

    const result = await simulateRequests(limiter, key, config, 5);

    expect(result.allowed).toBe(5);
    expect(result.blocked).toBe(0);
  });

  it('should block requests over limit', async () => {
    const config = createTestConfig(5, 60);
    const key = { type: 'ip', identifier: '127.0.0.1' };

    const result = await simulateRequests(limiter, key, config, 10);

    expect(result.allowed).toBe(5);
    expect(result.blocked).toBe(5);
  });

  it('should reset after window expires', async () => {
    const config = createTestConfig(5, 1); // 1 second window
    const key = { type: 'ip', identifier: '127.0.0.1' };

    // Exhaust limit
    await simulateRequests(limiter, key, config, 5);

    // Should be blocked
    const blocked = await limiter.check(key, config);
    expect(blocked.allowed).toBe(false);

    // Wait for reset
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Should be allowed
    const allowed = await limiter.check(key, config);
    expect(allowed.allowed).toBe(true);
  });
});
```

### Example 11: Integration Testing

```typescript
// /src/app/api/auth/login/__tests__/route.test.ts
import { describe, it, expect } from 'bun:test';
import { POST } from '../route';
import { createMockRequest } from '@/lib/rate-limit/test-utils';

describe('POST /api/auth/login', () => {
  it('should rate limit after 10 attempts', async () => {
    const makeRequest = () =>
      createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        body: { email: 'test@example.com', password: 'wrong' },
        headers: { 'x-forwarded-for': '127.0.0.1' },
      });

    // Make 10 requests (should all go through)
    for (let i = 0; i < 10; i++) {
      const response = await POST(makeRequest());
      expect(response.status).not.toBe(429);
    }

    // 11th request should be rate limited
    const response = await POST(makeRequest());
    expect(response.status).toBe(429);

    const data = await response.json();
    expect(data.error).toContain('Too many');
  });

  it('should include rate limit headers', async () => {
    const request = createMockRequest({
      method: 'POST',
      url: 'http://localhost:3000/api/auth/login',
      body: { email: 'test@example.com', password: 'password' },
    });

    const response = await POST(request);

    expect(response.headers.has('x-ratelimit-limit')).toBe(true);
    expect(response.headers.has('x-ratelimit-remaining')).toBe(true);
    expect(response.headers.has('x-ratelimit-reset')).toBe(true);
  });
});
```

## Monitoring

### Example 12: Violation Monitoring

```typescript
// /src/lib/monitoring/rate-limit-monitor.ts
import { rateLimiter } from '@/lib/rate-limit';
import { db } from '@/lib/db';

// Register custom violation handler
rateLimiter.onViolation(async (violation) => {
  console.warn('[Rate Limit] Violation detected:', {
    type: violation.key.type,
    identifier: violation.key.identifier,
    config: violation.config.identifier,
    excessRequests: violation.excessRequests,
  });

  // Check for repeated violations
  const recentViolations = await db.auditLog.count({
    where: {
      action: 'RATE_LIMIT_EXCEEDED',
      entityId: violation.key.identifier,
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
      },
    },
  });

  // Create security alert after 5 violations
  if (recentViolations >= 5) {
    await rateLimiter.createSecurityAlert(violation.key, recentViolations, {
      ipAddress: violation.ipAddress,
      userAgent: violation.userAgent,
      userId: violation.userId,
    });

    // Send notification to security team
    await sendSecurityAlert({
      title: 'Persistent Rate Limit Violations',
      identifier: violation.key.identifier,
      violations: recentViolations,
    });
  }
});
```

### Example 13: Real-Time Dashboard Data

```typescript
// /src/app/api/admin/rate-limits/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth-utils';
import { getCurrentUser } from '@/lib/auth';;
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get rate limit violations in last 24 hours
  const violations = await db.auditLog.groupBy({
    by: ['entityType', 'action'],
    where: {
      action: 'RATE_LIMIT_EXCEEDED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    _count: true,
  });

  // Get top violators
  const topViolators = await db.auditLog.groupBy({
    by: ['ipAddress'],
    where: {
      action: 'RATE_LIMIT_EXCEEDED',
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
    _count: true,
    orderBy: {
      _count: {
        ipAddress: 'desc',
      },
    },
    take: 10,
  });

  return NextResponse.json({
    violations,
    topViolators,
  });
}
```

### Example 14: Manual Rate Limit Reset

```typescript
// /src/app/api/admin/rate-limits/reset/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth-utils';
import { getCurrentUser } from '@/lib/auth';;
import { rateLimiter, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { identifier, type, config } = await request.json();

  // Reset rate limit for specific key
  await rateLimiter.reset(
    { type, identifier },
    RATE_LIMIT_CONFIGS[config as keyof typeof RATE_LIMIT_CONFIGS]
  );

  // Log admin action
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'ADMIN_ACTION',
      entityType: 'rate_limit_reset',
      entityId: identifier,
      metadata: JSON.stringify({ type, config }),
    },
  });

  return NextResponse.json({ success: true });
}
```

## Best Practices

1. **Always provide helpful error messages** - Tell users when they can try again
2. **Use appropriate limits** - Too strict breaks UX, too loose allows abuse
3. **Log all violations** - Essential for security monitoring
4. **Test rate limits** - Ensure they work as expected
5. **Monitor production** - Watch for false positives and adjust limits
6. **Document limits** - Make it clear to API consumers what the limits are
7. **Provide feedback** - Include headers even on successful requests
8. **Handle errors gracefully** - Don't let rate limiter failures break your app
9. **Use Redis in production** - In-memory store doesn't scale
10. **Review logs regularly** - Look for patterns of abuse

## Common Pitfalls

1. **Forgetting to apply middleware** - Rate limiting only works if you apply it
2. **Using same key for different resources** - Leads to shared limits
3. **Not testing edge cases** - Window boundaries can be tricky
4. **Ignoring violation logs** - They're there for a reason
5. **Too strict on first deployment** - Start loose, tighten based on data
6. **Not accounting for legitimate bursts** - Some use cases need flexibility
7. **Blocking legitimate traffic** - Monitor false positives
8. **Not resetting during testing** - Tests will fail inconsistently

---

For more information, see [RATE_LIMITING.md](../../../RATE_LIMITING.md)
