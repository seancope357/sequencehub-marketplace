/**
 * Rate Limiting Test Utilities
 *
 * Helper functions for testing rate limiting in unit and integration tests
 */

import { NextRequest } from 'next/server';
import { MemoryRateLimitStore } from './memory-store';
import { RateLimiter } from './limiter';
import { RateLimitConfig, RateLimitKey } from './types';

/**
 * Create a test rate limiter with in-memory store
 */
export function createTestRateLimiter(): RateLimiter {
  const store = new MemoryRateLimitStore();
  return new RateLimiter(store);
}

/**
 * Create a mock Next.js request for testing
 */
export function createMockRequest(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: any;
}): NextRequest {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    headers = {},
    body,
  } = options;

  const defaultHeaders = {
    'x-forwarded-for': '127.0.0.1',
    'user-agent': 'test-agent',
    ...headers,
  };

  const requestInit: RequestInit = {
    method,
    headers: defaultHeaders,
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
    defaultHeaders['content-type'] = 'application/json';
  }

  return new NextRequest(url, requestInit);
}

/**
 * Simulate multiple requests to trigger rate limiting
 */
export async function simulateRequests(
  limiter: RateLimiter,
  key: RateLimitKey,
  config: RateLimitConfig,
  count: number
): Promise<{ allowed: number; blocked: number }> {
  let allowed = 0;
  let blocked = 0;

  for (let i = 0; i < count; i++) {
    const result = await limiter.check(key, config);
    if (result.allowed) {
      allowed++;
    } else {
      blocked++;
    }
  }

  return { allowed, blocked };
}

/**
 * Wait for rate limit window to expire
 */
export async function waitForReset(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

/**
 * Assert rate limit response structure
 */
export function assertRateLimitResponse(response: Response): void {
  if (response.status !== 429) {
    throw new Error(`Expected status 429, got ${response.status}`);
  }

  const headers = response.headers;
  if (!headers.has('x-ratelimit-limit')) {
    throw new Error('Missing X-RateLimit-Limit header');
  }
  if (!headers.has('x-ratelimit-remaining')) {
    throw new Error('Missing X-RateLimit-Remaining header');
  }
  if (!headers.has('x-ratelimit-reset')) {
    throw new Error('Missing X-RateLimit-Reset header');
  }
  if (!headers.has('retry-after')) {
    throw new Error('Missing Retry-After header');
  }
}

/**
 * Get rate limit headers from response
 */
export function getRateLimitHeaders(response: Response): {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
} {
  return {
    limit: parseInt(response.headers.get('x-ratelimit-limit') || '0'),
    remaining: parseInt(response.headers.get('x-ratelimit-remaining') || '0'),
    reset: parseInt(response.headers.get('x-ratelimit-reset') || '0'),
    retryAfter: response.headers.has('retry-after')
      ? parseInt(response.headers.get('retry-after')!)
      : undefined,
  };
}

/**
 * Clear all rate limits (for test cleanup)
 */
export async function clearAllRateLimits(store: MemoryRateLimitStore): Promise<void> {
  store.clear();
}

/**
 * Create test configuration with short windows for faster tests
 */
export function createTestConfig(maxRequests = 5, windowSeconds = 1): RateLimitConfig {
  return {
    maxRequests,
    windowSeconds,
    identifier: 'test:config',
  };
}

/**
 * Mock IP addresses for testing
 */
export const MockIPs = {
  LOCALHOST: '127.0.0.1',
  PRIVATE_1: '192.168.1.1',
  PRIVATE_2: '192.168.1.2',
  PUBLIC_1: '203.0.113.1',
  PUBLIC_2: '203.0.113.2',
  CLOUDFLARE: '1.1.1.1',
};

/**
 * Test rate limiting with different IPs
 */
export async function testMultipleIPs(
  limiter: RateLimiter,
  config: RateLimitConfig,
  ips: string[]
): Promise<Record<string, { allowed: number; blocked: number }>> {
  const results: Record<string, { allowed: number; blocked: number }> = {};

  for (const ip of ips) {
    const key: RateLimitKey = { type: 'ip', identifier: ip };
    results[ip] = await simulateRequests(limiter, key, config, config.maxRequests + 5);
  }

  return results;
}

/**
 * Verify rate limit isolation between different keys
 */
export async function verifyKeyIsolation(
  limiter: RateLimiter,
  config: RateLimitConfig
): Promise<boolean> {
  const key1: RateLimitKey = { type: 'ip', identifier: '127.0.0.1' };
  const key2: RateLimitKey = { type: 'ip', identifier: '127.0.0.2' };

  // Exhaust limit for key1
  for (let i = 0; i < config.maxRequests; i++) {
    await limiter.check(key1, config);
  }

  const result1 = await limiter.check(key1, config);
  const result2 = await limiter.check(key2, config);

  // key1 should be blocked, key2 should be allowed
  return !result1.allowed && result2.allowed;
}

/**
 * Test sliding window behavior
 */
export async function testSlidingWindow(
  limiter: RateLimiter,
  config: RateLimitConfig
): Promise<boolean> {
  const key: RateLimitKey = { type: 'ip', identifier: '127.0.0.1' };

  // Make maxRequests requests
  for (let i = 0; i < config.maxRequests; i++) {
    await limiter.check(key, config);
  }

  // Should be blocked
  const blocked = await limiter.check(key, config);
  if (blocked.allowed) return false;

  // Wait for half the window
  await waitForReset(config.windowSeconds / 2);

  // Should still be blocked (sliding window)
  const stillBlocked = await limiter.check(key, config);
  if (stillBlocked.allowed) return false;

  // Wait for remaining time
  await waitForReset(config.windowSeconds / 2 + 1);

  // Should be allowed again
  const allowed = await limiter.check(key, config);
  return allowed.allowed;
}

/**
 * Performance benchmark for rate limiter
 */
export async function benchmarkRateLimiter(
  limiter: RateLimiter,
  config: RateLimitConfig,
  iterations = 1000
): Promise<{ avgMs: number; minMs: number; maxMs: number }> {
  const key: RateLimitKey = { type: 'ip', identifier: '127.0.0.1' };
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await limiter.check(key, config);
    const end = performance.now();
    times.push(end - start);

    // Reset periodically to avoid blocking
    if (i % config.maxRequests === 0) {
      await limiter.reset(key, config);
    }
  }

  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);

  return { avgMs, minMs, maxMs };
}
