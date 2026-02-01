/**
 * Rate Limiter Core
 *
 * Central rate limiting logic with support for multiple storage backends
 * and comprehensive violation tracking
 */

import { db } from '@/lib/db';
import {
  RateLimitConfig,
  RateLimitKey,
  RateLimitResult,
  RateLimitStore,
  RateLimitViolation,
} from './types';
import { memoryStore } from './memory-store';
import { createRedisStore } from './redis-store';

export class RateLimiter {
  private store: RateLimitStore;
  private violationCallbacks: ((violation: RateLimitViolation) => void)[] = [];

  constructor(store?: RateLimitStore) {
    // Try Redis first, fall back to memory
    const redisStore = createRedisStore();
    this.store = store || redisStore || memoryStore;

    if (this.store === memoryStore) {
      console.log('[Rate Limiter] Using in-memory store (development mode)');
    } else {
      console.log('[Rate Limiter] Using Redis store (production mode)');
    }
  }

  /**
   * Generate a unique key for rate limiting
   */
  private generateKey(key: RateLimitKey, config: RateLimitConfig): string {
    const parts = [key.type, key.identifier];

    if (key.scope) {
      parts.push(key.scope);
    }

    if (config.identifier) {
      parts.push(config.identifier);
    }

    return parts.join(':');
  }

  /**
   * Check if a request should be rate limited
   */
  async check(key: RateLimitKey, config: RateLimitConfig): Promise<RateLimitResult> {
    const storeKey = this.generateKey(key, config);

    try {
      // Increment and get count
      const { count, ttl } = await this.store.increment(storeKey, config.windowSeconds);

      const remaining = Math.max(0, config.maxRequests - count);
      const allowed = count <= config.maxRequests;

      // Calculate reset time
      const reset = Math.floor(Date.now() / 1000) + ttl;

      return {
        allowed,
        limit: config.maxRequests,
        remaining,
        reset,
        retryAfter: allowed ? undefined : ttl,
      };
    } catch (error) {
      console.error('[Rate Limiter] Check error:', error);

      // On error, allow the request but log it
      // This ensures rate limiting failures don't break the application
      return {
        allowed: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        reset: Math.floor(Date.now() / 1000) + config.windowSeconds,
      };
    }
  }

  /**
   * Check and enforce rate limit, calling violation callbacks if exceeded
   */
  async enforce(
    key: RateLimitKey,
    config: RateLimitConfig,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      userId?: string;
      path?: string;
    }
  ): Promise<RateLimitResult> {
    const result = await this.check(key, config);

    // If rate limit exceeded, record violation
    if (!result.allowed) {
      const violation: RateLimitViolation = {
        key,
        timestamp: new Date(),
        config,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        userId: context?.userId,
        path: context?.path,
        excessRequests: config.maxRequests - result.remaining + 1,
      };

      // Call violation callbacks
      this.handleViolation(violation);
    }

    return result;
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: RateLimitKey, config: RateLimitConfig): Promise<void> {
    const storeKey = this.generateKey(key, config);
    await this.store.reset(storeKey);
  }

  /**
   * Register a violation callback
   */
  onViolation(callback: (violation: RateLimitViolation) => void): void {
    this.violationCallbacks.push(callback);
  }

  /**
   * Handle rate limit violation
   */
  private handleViolation(violation: RateLimitViolation): void {
    // Log to console
    console.warn('[Rate Limiter] Violation:', {
      type: violation.key.type,
      identifier: violation.key.identifier,
      scope: violation.key.scope,
      limit: violation.config.maxRequests,
      window: violation.config.windowSeconds,
      excess: violation.excessRequests,
    });

    // Call registered callbacks
    for (const callback of this.violationCallbacks) {
      try {
        callback(violation);
      } catch (error) {
        console.error('[Rate Limiter] Violation callback error:', error);
      }
    }
  }

  /**
   * Create audit log entry for rate limit violation
   */
  async logViolationToAudit(violation: RateLimitViolation): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId: violation.userId,
          action: 'RATE_LIMIT_EXCEEDED',
          entityType: violation.key.type,
          entityId: violation.key.identifier,
          metadata: JSON.stringify({
            scope: violation.key.scope,
            limit: violation.config.maxRequests,
            window: violation.config.windowSeconds,
            excessRequests: violation.excessRequests,
            path: violation.path,
          }),
          ipAddress: violation.ipAddress,
          userAgent: violation.userAgent,
        },
      });
    } catch (error) {
      console.error('[Rate Limiter] Failed to log violation to audit:', error);
    }
  }

  /**
   * Create security alert for persistent violators
   * @param threshold Number of violations before creating alert
   */
  async createSecurityAlert(
    key: RateLimitKey,
    violations: number,
    context?: {
      ipAddress?: string;
      userAgent?: string;
      userId?: string;
    }
  ): Promise<void> {
    try {
      await db.auditLog.create({
        data: {
          userId: context?.userId,
          action: 'SECURITY_ALERT',
          entityType: 'rate_limit_abuse',
          entityId: `${key.type}:${key.identifier}`,
          metadata: JSON.stringify({
            violationCount: violations,
            scope: key.scope,
            message: `Persistent rate limit violations detected`,
          }),
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
      });

      console.error('[Rate Limiter] Security alert created:', {
        type: key.type,
        identifier: key.identifier,
        violations,
      });
    } catch (error) {
      console.error('[Rate Limiter] Failed to create security alert:', error);
    }
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

// Register default violation handler to log to audit
rateLimiter.onViolation((violation) => {
  rateLimiter.logViolationToAudit(violation).catch(console.error);
});
