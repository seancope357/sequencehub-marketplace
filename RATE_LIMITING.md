# Rate Limiting System Documentation

## Overview

SequenceHUB implements a comprehensive multi-tiered rate limiting system to protect against abuse, prevent brute force attacks, and ensure fair resource usage across all users.

## Architecture

### Core Components

1. **Rate Limiter** (`/src/lib/rate-limit/limiter.ts`)
   - Central rate limiting logic
   - Sliding window algorithm for accurate tracking
   - Violation detection and audit logging

2. **Storage Backends**
   - **Memory Store** (`memory-store.ts`): In-memory Map with automatic cleanup (development)
   - **Redis Store** (`redis-store.ts`): Distributed rate limiting via Redis (production)

3. **Middleware** (`middleware.ts`)
   - Next.js Route Handler integration
   - IP and user-based limiting
   - Automatic header management

4. **Type System** (`types.ts`)
   - Comprehensive TypeScript definitions
   - Predefined rate limit configurations

## Rate Limit Policies

### Authentication Endpoints (`/api/auth/*`)

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /api/auth/login` | 10 requests | 15 minutes | Prevent brute force attacks |
| `POST /api/auth/register` | 5 requests | 1 hour | Prevent spam registrations |
| `POST /api/auth/password-reset` | 3 requests | 1 hour | Prevent abuse of reset flow |

**Limiting Strategy**: IP-based (unauthenticated users)

### Payment Endpoints (`/api/checkout/*`)

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /api/checkout/create` | 10 requests | 1 hour | Prevent payment fraud |
| `POST /api/webhooks/stripe` | 1000 requests | 1 minute | Allow Stripe webhooks (IP-filtered) |

**Limiting Strategy**: User-based for checkout, IP allowlist for webhooks

### File Operations

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /api/upload/simple` | 10 uploads | 1 hour | Prevent storage abuse |
| `DELETE /api/dashboard/products/[id]` | 20 deletions | 1 hour | Prevent mass deletion abuse |
| `POST /api/library/download` | 10 downloads | 24 hours | Existing entitlement-based limit |

**Limiting Strategy**: User-based (authenticated users)

### Creator Dashboard (`/api/dashboard/*`)

| Endpoint | Limit | Window | Purpose |
|----------|-------|--------|---------|
| `POST /api/dashboard/products` | 10 requests | 1 hour | Prevent product spam |
| `PATCH /api/dashboard/products/[id]` | 30 requests | 1 hour | Allow frequent updates |
| `GET /api/dashboard/stats` | 60 requests | 1 hour | Allow frequent polling |

**Limiting Strategy**: User-based (authenticated creators)

### General API Endpoints

| Type | Limit | Window | Purpose |
|------|-------|--------|---------|
| Unauthenticated | 100 requests | 1 minute | Prevent API abuse |
| Authenticated | 300 requests | 1 minute | Higher limit for logged-in users |

**Limiting Strategy**: IP-based for unauthenticated, user-based for authenticated

## Implementation Guide

### Quick Start

```typescript
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const limitResult = await applyRateLimit(request, {
    config: RATE_LIMIT_CONFIGS.AUTH_LOGIN,
    byIp: true,
    byUser: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  // Continue with handler logic
  // ...
}
```

### Using the Higher-Order Function

```typescript
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export const POST = withRateLimit(
  async (request: NextRequest) => {
    // Handler logic
    return NextResponse.json({ success: true });
  },
  {
    config: RATE_LIMIT_CONFIGS.PRODUCT_CREATE,
    byUser: true,
  }
);
```

### Custom Rate Limit Configuration

```typescript
import { applyRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const limitResult = await applyRateLimit(request, {
    config: {
      maxRequests: 5,
      windowSeconds: 300, // 5 minutes
      identifier: 'custom:action',
    },
    byUser: true,
    message: 'Custom rate limit message',
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  // Handler logic
}
```

### Skip Rate Limiting Conditionally

```typescript
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { isAdmin } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const limitResult = await applyRateLimit(request, {
    config: RATE_LIMIT_CONFIGS.API_AUTHENTICATED,
    byUser: true,
    skip: async (request, user) => {
      // Skip rate limiting for admin users
      return isAdmin(user);
    },
  });

  if (!limitResult.allowed) {
    return limitResult.response;
  }

  // Handler logic
}
```

## Environment Variables

### Required (Production)

```bash
# Redis URL for distributed rate limiting (optional)
REDIS_URL=redis://localhost:6379

# Rate limit configuration overrides (optional)
RATE_LIMIT_AUTH_LOGIN_MAX=10
RATE_LIMIT_AUTH_LOGIN_WINDOW=900

RATE_LIMIT_CHECKOUT_MAX=10
RATE_LIMIT_CHECKOUT_WINDOW=3600

RATE_LIMIT_UPLOAD_MAX=10
RATE_LIMIT_UPLOAD_WINDOW=3600
```

### Optional Configuration

```bash
# Redis key prefix (default: 'rate_limit:')
RATE_LIMIT_REDIS_PREFIX=rate_limit:

# Enable/disable violation logging (default: true)
RATE_LIMIT_LOG_VIOLATIONS=true

# Security alert threshold (default: 5)
RATE_LIMIT_ALERT_THRESHOLD=5

# Disable rate limiting for testing (NOT for production)
RATE_LIMIT_DISABLED=false
```

## Response Format

### Rate Limit Headers

All responses include standard rate limit headers:

```http
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1738368000
```

### 429 Too Many Requests Response

```json
{
  "error": "Too many requests. Please try again later.",
  "retryAfter": 120,
  "limit": 10,
  "reset": 1738368000
}
```

**HTTP Headers**:
```http
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1738368000
Retry-After: 120
```

## Storage Backends

### In-Memory Store (Development)

- Uses JavaScript `Map` for storage
- Sliding window algorithm with timestamp tracking
- Automatic cleanup every 60 seconds
- **Limitations**: Not suitable for distributed systems, lost on restart

**When to Use**: Development, testing, single-server deployments

### Redis Store (Production)

- Distributed rate limiting across multiple servers
- Atomic operations using Lua scripts
- Automatic key expiration via Redis TTL
- **Requirements**: Redis server (local or cloud)

**When to Use**: Production, horizontal scaling, multi-server deployments

**Setup**:

```bash
# Install Redis client (choose one)
npm install ioredis
# or
npm install redis
```

Then set `REDIS_URL` environment variable:

```bash
REDIS_URL=redis://localhost:6379
# or for cloud Redis
REDIS_URL=redis://:password@your-redis-host.com:6379
```

## Audit Logging

### Violation Logging

Every rate limit violation is automatically logged to the `AuditLog` table:

```typescript
{
  action: 'RATE_LIMIT_EXCEEDED',
  entityType: 'ip' | 'user' | 'endpoint' | 'resource',
  entityId: '192.168.1.1' | 'user_abc123',
  metadata: {
    scope: 'auth:login',
    limit: 10,
    window: 900,
    excessRequests: 3,
    path: '/api/auth/login'
  },
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  userId: 'user_abc123' // if authenticated
}
```

### Security Alerts

After multiple violations (default: 5), a security alert is created:

```typescript
{
  action: 'SECURITY_ALERT',
  entityType: 'rate_limit_abuse',
  entityId: 'ip:192.168.1.1',
  metadata: {
    violationCount: 5,
    message: 'Persistent rate limit violations detected'
  }
}
```

### Querying Violations

```typescript
// Get rate limit violations for an IP
const violations = await db.auditLog.findMany({
  where: {
    action: 'RATE_LIMIT_EXCEEDED',
    ipAddress: '192.168.1.1',
    createdAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    }
  }
});

// Get security alerts
const alerts = await db.auditLog.findMany({
  where: {
    action: 'SECURITY_ALERT',
    entityType: 'rate_limit_abuse'
  }
});
```

## Monitoring & Metrics

### Check Rate Limit Status

```typescript
import { rateLimiter } from '@/lib/rate-limit';

const result = await rateLimiter.check(
  { type: 'ip', identifier: '192.168.1.1' },
  RATE_LIMIT_CONFIGS.AUTH_LOGIN
);

console.log({
  allowed: result.allowed,
  remaining: result.remaining,
  reset: new Date(result.reset * 1000)
});
```

### Reset Rate Limit

```typescript
import { rateLimiter } from '@/lib/rate-limit';

await rateLimiter.reset(
  { type: 'user', identifier: 'user_abc123' },
  RATE_LIMIT_CONFIGS.UPLOAD_FILE
);
```

### Custom Violation Handling

```typescript
import { rateLimiter } from '@/lib/rate-limit';

// Register custom violation handler
rateLimiter.onViolation(async (violation) => {
  console.log('Rate limit violation:', violation);

  // Send alert to monitoring service
  await sendToMonitoring({
    type: 'rate_limit_violation',
    identifier: violation.key.identifier,
    config: violation.config.identifier
  });
});
```

## Testing

### Unit Tests

```typescript
import { MemoryRateLimitStore } from '@/lib/rate-limit/memory-store';
import { RateLimiter } from '@/lib/rate-limit/limiter';

describe('Rate Limiter', () => {
  it('should allow requests within limit', async () => {
    const store = new MemoryRateLimitStore();
    const limiter = new RateLimiter(store);

    const config = { maxRequests: 5, windowSeconds: 60 };
    const key = { type: 'ip', identifier: '127.0.0.1' };

    for (let i = 0; i < 5; i++) {
      const result = await limiter.check(key, config);
      expect(result.allowed).toBe(true);
    }

    const result = await limiter.check(key, config);
    expect(result.allowed).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { POST } from '@/app/api/auth/login/route';

describe('POST /api/auth/login', () => {
  it('should rate limit after 10 attempts', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' }),
      headers: { 'x-forwarded-for': '127.0.0.1' }
    });

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      await POST(request);
    }

    // 11th request should be rate limited
    const response = await POST(request);
    expect(response.status).toBe(429);
  });
});
```

### Load Testing

Use tools like `autocannon` or `k6` to test rate limiting under load:

```bash
# Install autocannon
npm install -g autocannon

# Test login endpoint (should rate limit at 10 req/15min)
autocannon -c 10 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -b '{"email":"test@example.com","password":"test"}' \
  http://localhost:3000/api/auth/login
```

## Security Best Practices

### 1. IP Spoofing Prevention

- Always use `X-Forwarded-For` from trusted proxies only
- Configure proxy to set proper forwarding headers
- Validate IP addresses before using for rate limiting

### 2. Distributed Attacks

- Use both IP and user-based rate limiting
- Monitor for patterns across multiple IPs
- Implement progressive penalties for repeat offenders

### 3. Bypass Attempts

- Log all rate limit violations
- Create security alerts for persistent violators
- Consider temporary IP bans for severe abuse

### 4. False Positives

- Set reasonable limits based on actual usage patterns
- Provide clear error messages with retry information
- Allow admins to reset rate limits for legitimate users

## Troubleshooting

### Rate Limiting Not Working

1. Check if rate limiting is disabled: `RATE_LIMIT_DISABLED=true`
2. Verify middleware is applied to the endpoint
3. Check logs for rate limiter initialization
4. Ensure Redis connection if using production store

### High Memory Usage (In-Memory Store)

1. Switch to Redis store for production
2. Reduce `windowSeconds` for rate limit configs
3. Monitor store size: `memoryStore.getSize()`
4. Enable more frequent cleanup

### Redis Connection Errors

1. Verify `REDIS_URL` is correct
2. Check Redis server is running
3. Ensure network connectivity
4. Falls back to in-memory store on error

### Rate Limits Too Strict

1. Adjust via environment variables
2. Monitor actual usage patterns
3. Consider different limits for different user tiers
4. Implement skip conditions for trusted users

## Migration from Existing System

The download rate limiting system (`/api/library/download`) already exists with entitlement-based limits. The new system integrates seamlessly:

**Before**:
```typescript
// Manual rate limit check in download handler
if (downloadsSinceReset < 1 && entitlement.downloadCount >= 10) {
  return NextResponse.json({ error: 'Download limit exceeded' }, { status: 429 });
}
```

**After**:
```typescript
// Automatic rate limiting via middleware
const limitResult = await applyRateLimit(request, {
  config: RATE_LIMIT_CONFIGS.DOWNLOAD_FILE,
  keyIdentifier: entitlementId,
  byUser: false,
  byIp: false,
});
```

Both systems can coexist during migration. The new system provides:
- Consistent headers across all endpoints
- Centralized violation logging
- Easier testing and monitoring

## Performance Considerations

### In-Memory Store

- **Overhead**: ~50μs per request
- **Memory**: ~100 bytes per unique key
- **Cleanup**: Every 60 seconds

### Redis Store

- **Overhead**: ~2-5ms per request (network latency)
- **Memory**: Managed by Redis with TTL
- **Scalability**: Unlimited horizontal scaling

### Recommendations

1. Use in-memory for development and small deployments
2. Use Redis for production and distributed systems
3. Monitor rate limiter performance in production
4. Cache user authentication to avoid database queries

## Future Enhancements

- [ ] Rate limit tiers based on user subscription
- [ ] Geolocation-based rate limiting
- [ ] Advanced bot detection
- [ ] Rate limit analytics dashboard
- [ ] Automatic IP blacklisting
- [ ] GraphQL rate limiting support
- [ ] WebSocket connection rate limiting

## Support

For issues or questions:
1. Check this documentation
2. Review audit logs for violations
3. Check environment variables
4. Contact security team for persistent issues

---

**Last Updated**: 2026-01-31
**Version**: 1.0.0
