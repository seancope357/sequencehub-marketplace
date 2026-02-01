/**
 * Rate Limit Middleware
 *
 * Next.js Route Handler middleware for applying rate limits
 * Supports IP-based and user-based rate limiting with proper headers
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { rateLimiter } from './limiter';
import { RateLimitConfig, RateLimitKey } from './types';

/**
 * Extract IP address from Next.js request
 */
export function getClientIp(request: NextRequest): string {
  // Check X-Forwarded-For header (from proxy/load balancer)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Check X-Real-IP header
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to unknown (should not happen in production with proper proxy setup)
  return 'unknown';
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: { limit: number; remaining: number; reset: number; retryAfter?: number }
): NextResponse {
  response.headers.set('X-RateLimit-Limit', result.limit.toString());
  response.headers.set('X-RateLimit-Remaining', Math.max(0, result.remaining).toString());
  response.headers.set('X-RateLimit-Reset', result.reset.toString());

  if (result.retryAfter !== undefined) {
    response.headers.set('Retry-After', result.retryAfter.toString());
  }

  return response;
}

/**
 * Create rate limit exceeded response
 */
export function createRateLimitResponse(
  result: { limit: number; remaining: number; reset: number; retryAfter?: number },
  message?: string
): NextResponse {
  const response = NextResponse.json(
    {
      error: message || 'Too many requests. Please try again later.',
      retryAfter: result.retryAfter,
      limit: result.limit,
      reset: result.reset,
    },
    { status: 429 }
  );

  return addRateLimitHeaders(response, result);
}

/**
 * Rate limit middleware options
 */
export interface RateLimitOptions {
  /**
   * Rate limit configuration
   */
  config: RateLimitConfig;

  /**
   * Rate limit by IP address (default: true for unauthenticated)
   */
  byIp?: boolean;

  /**
   * Rate limit by user ID (default: true for authenticated)
   */
  byUser?: boolean;

  /**
   * Custom key identifier (overrides IP/user detection)
   */
  keyIdentifier?: string;

  /**
   * Scope for namespacing (e.g., endpoint name)
   */
  scope?: string;

  /**
   * Skip rate limiting if this function returns true
   */
  skip?: (request: NextRequest, user: any | null) => boolean | Promise<boolean>;

  /**
   * Custom error message
   */
  message?: string;
}

/**
 * Apply rate limiting to a Next.js route handler
 *
 * @example
 * ```typescript
 * export async function POST(request: NextRequest) {
 *   const limitResult = await applyRateLimit(request, {
 *     config: RATE_LIMIT_CONFIGS.AUTH_LOGIN,
 *     byIp: true,
 *   });
 *
 *   if (!limitResult.allowed) {
 *     return limitResult.response;
 *   }
 *
 *   // ... rest of handler
 * }
 * ```
 */
export async function applyRateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<
  | { allowed: true; response?: never }
  | { allowed: false; response: NextResponse }
> {
  const { config, byIp = true, byUser = true, keyIdentifier, scope, skip, message } = options;

  // Get user if authenticated
  const user = await getCurrentUser();

  // Check if we should skip rate limiting
  if (skip && (await skip(request, user))) {
    return { allowed: true };
  }

  // Get client info for logging
  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || undefined;
  const path = request.nextUrl.pathname;

  // Determine rate limit key
  let key: RateLimitKey;

  if (keyIdentifier) {
    // Custom identifier provided
    key = {
      type: 'resource',
      identifier: keyIdentifier,
      scope,
    };
  } else if (user && byUser) {
    // Rate limit by user ID (authenticated)
    key = {
      type: 'user',
      identifier: user.id,
      scope,
    };
  } else if (byIp) {
    // Rate limit by IP address (unauthenticated or fallback)
    key = {
      type: 'ip',
      identifier: ipAddress,
      scope,
    };
  } else {
    // No rate limiting applied
    return { allowed: true };
  }

  // Check rate limit
  const result = await rateLimiter.enforce(key, config, {
    ipAddress,
    userAgent,
    userId: user?.id,
    path,
  });

  if (!result.allowed) {
    return {
      allowed: false,
      response: createRateLimitResponse(result, message),
    };
  }

  return { allowed: true };
}

/**
 * Higher-order function to wrap a route handler with rate limiting
 *
 * @example
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request: NextRequest) => {
 *     // Handler logic
 *     return NextResponse.json({ success: true });
 *   },
 *   {
 *     config: RATE_LIMIT_CONFIGS.AUTH_LOGIN,
 *     byIp: true,
 *   }
 * );
 * ```
 */
export function withRateLimit(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>,
  options: RateLimitOptions
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const limitResult = await applyRateLimit(request, options);

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    // Call original handler
    const response = await handler(request, ...args);

    // Add rate limit headers to successful responses
    const result = await rateLimiter.check(
      limitResult.allowed
        ? {
            type: options.keyIdentifier ? 'resource' : 'ip',
            identifier: options.keyIdentifier || getClientIp(request),
            scope: options.scope,
          }
        : { type: 'ip', identifier: getClientIp(request) },
      options.config
    );

    return addRateLimitHeaders(response, result);
  };
}

/**
 * Utility to check if IP is in allowlist (for webhooks)
 */
export function isIpAllowed(ip: string, allowlist: string[]): boolean {
  return allowlist.includes(ip);
}

/**
 * Stripe webhook IP ranges
 * Source: https://stripe.com/docs/ips
 */
export const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  '13.235.122.149',
  '18.211.135.69',
  '35.154.171.200',
  '52.15.183.38',
  '54.88.130.119',
  '54.88.130.237',
  '54.187.174.169',
  '54.187.205.235',
  '54.187.216.72',
];
