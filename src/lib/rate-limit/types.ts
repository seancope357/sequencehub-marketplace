/**
 * Rate Limiting Types & Configurations
 *
 * Comprehensive type definitions for multi-tiered rate limiting system
 */

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Optional identifier for this rate limit (for logging)
   */
  identifier?: string;

  /**
   * Whether to use sliding window (default: true)
   * Sliding window is more accurate but slightly more expensive
   */
  slidingWindow?: boolean;
}

export interface RateLimitResult {
  /**
   * Whether the request should be allowed
   */
  allowed: boolean;

  /**
   * Maximum requests allowed in the window
   */
  limit: number;

  /**
   * Remaining requests in current window
   */
  remaining: number;

  /**
   * Unix timestamp when the rate limit will reset
   */
  reset: number;

  /**
   * Seconds until rate limit resets
   */
  retryAfter?: number;
}

export interface RateLimitKey {
  /**
   * Type of rate limit being applied
   */
  type: 'ip' | 'user' | 'endpoint' | 'resource';

  /**
   * Identifier (IP address, user ID, endpoint name, resource ID)
   */
  identifier: string;

  /**
   * Optional scope for namespacing (e.g., endpoint name)
   */
  scope?: string;
}

export interface RateLimitViolation {
  /**
   * Rate limit key that was violated
   */
  key: RateLimitKey;

  /**
   * When the violation occurred
   */
  timestamp: Date;

  /**
   * Configuration that was violated
   */
  config: RateLimitConfig;

  /**
   * IP address of the requester
   */
  ipAddress?: string;

  /**
   * User agent string
   */
  userAgent?: string;

  /**
   * User ID if authenticated
   */
  userId?: string;

  /**
   * Request path
   */
  path?: string;

  /**
   * Number of requests that exceeded the limit
   */
  excessRequests: number;
}

/**
 * Predefined rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  // Authentication endpoints - Strict limits to prevent brute force
  AUTH_LOGIN: {
    maxRequests: 10,
    windowSeconds: 15 * 60, // 15 minutes
    identifier: 'auth:login',
  } as RateLimitConfig,

  AUTH_REGISTER: {
    maxRequests: 5,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'auth:register',
  } as RateLimitConfig,

  AUTH_PASSWORD_RESET: {
    maxRequests: 3,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'auth:password_reset',
  } as RateLimitConfig,

  // API endpoints - General usage limits
  API_UNAUTHENTICATED: {
    maxRequests: 100,
    windowSeconds: 60, // 1 minute
    identifier: 'api:unauth',
  } as RateLimitConfig,

  API_AUTHENTICATED: {
    maxRequests: 300,
    windowSeconds: 60, // 1 minute
    identifier: 'api:auth',
  } as RateLimitConfig,

  // File operations - Resource-intensive limits
  UPLOAD_FILE: {
    maxRequests: 10,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'file:upload',
  } as RateLimitConfig,

  DELETE_FILE: {
    maxRequests: 20,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'file:delete',
  } as RateLimitConfig,

  DOWNLOAD_FILE: {
    maxRequests: 10,
    windowSeconds: 24 * 60 * 60, // 24 hours
    identifier: 'file:download',
  } as RateLimitConfig,

  // Payment endpoints - Fraud prevention
  CHECKOUT_CREATE: {
    maxRequests: 10,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'payment:checkout',
  } as RateLimitConfig,

  // No limit on webhooks from Stripe - handled by IP allowlist instead
  WEBHOOK_STRIPE: {
    maxRequests: 1000,
    windowSeconds: 60, // 1 minute (very high, IP-filtered)
    identifier: 'webhook:stripe',
  } as RateLimitConfig,

  // Creator dashboard - Prevent spam and abuse
  PRODUCT_CREATE: {
    maxRequests: 10,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'dashboard:product_create',
  } as RateLimitConfig,

  PRODUCT_UPDATE: {
    maxRequests: 30,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'dashboard:product_update',
  } as RateLimitConfig,

  STATS_QUERY: {
    maxRequests: 60,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'dashboard:stats',
  } as RateLimitConfig,

  // Review system - Prevent spam and abuse
  REVIEW_CREATE: {
    maxRequests: 5,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'review:create',
  } as RateLimitConfig,

  REVIEW_UPDATE: {
    maxRequests: 10,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'review:update',
  } as RateLimitConfig,

  REVIEW_VOTE: {
    maxRequests: 20,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'review:vote',
  } as RateLimitConfig,

  REVIEW_MODERATE: {
    maxRequests: 50,
    windowSeconds: 60 * 60, // 1 hour
    identifier: 'review:moderate',
  } as RateLimitConfig,
} as const;

/**
 * Storage backend interface for rate limiting
 */
export interface RateLimitStore {
  /**
   * Increment the request count for a key
   * @returns Current count after increment and expiry time
   */
  increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }>;

  /**
   * Get the current count for a key
   */
  get(key: string): Promise<number>;

  /**
   * Reset the count for a key
   */
  reset(key: string): Promise<void>;

  /**
   * Get time-to-live for a key in seconds
   */
  ttl(key: string): Promise<number>;

  /**
   * Clean up expired keys (for in-memory stores)
   */
  cleanup?(): Promise<void>;
}
