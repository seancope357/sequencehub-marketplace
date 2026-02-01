/**
 * Redis Rate Limit Store
 *
 * Production storage backend using Redis for distributed rate limiting
 * Supports horizontal scaling across multiple servers
 */

import { RateLimitStore } from './types';

/**
 * Redis client interface (compatible with ioredis, node-redis, etc.)
 */
export interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  del(key: string): Promise<number>;
  eval(script: string, numKeys: number, ...args: (string | number)[]): Promise<any>;
}

export class RedisRateLimitStore implements RateLimitStore {
  private client: RedisClient;
  private keyPrefix: string;

  constructor(client: RedisClient, keyPrefix = 'rate_limit:') {
    this.client = client;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Get full key with prefix
   */
  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * Increment request count with sliding window using Redis Lua script
   * This ensures atomicity of the sliding window operations
   */
  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const redisKey = this.getKey(key);
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Lua script for atomic sliding window increment
    // This removes old timestamps, adds new one, and returns count in single operation
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window_start = tonumber(ARGV[2])
      local window_seconds = tonumber(ARGV[3])

      -- Remove timestamps outside the window
      redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

      -- Add current timestamp
      redis.call('ZADD', key, now, now)

      -- Set expiry
      redis.call('EXPIRE', key, window_seconds)

      -- Get count
      local count = redis.call('ZCARD', key)

      -- Get TTL
      local ttl = redis.call('TTL', key)

      return {count, ttl}
    `;

    try {
      const result = await this.client.eval(
        script,
        1,
        redisKey,
        now.toString(),
        windowStart.toString(),
        windowSeconds.toString()
      );

      const [count, ttl] = result as [number, number];

      return {
        count: Number(count),
        ttl: Math.max(Number(ttl), 0),
      };
    } catch (error) {
      console.error('Redis rate limit increment error:', error);
      // Return conservative values on error
      return { count: 999999, ttl: 0 };
    }
  }

  /**
   * Get current request count
   */
  async get(key: string): Promise<number> {
    const redisKey = this.getKey(key);

    try {
      // For sliding window, we need to count members in the sorted set
      const script = `
        local key = KEYS[1]
        return redis.call('ZCARD', key) or 0
      `;

      const count = await this.client.eval(script, 1, redisKey);
      return Number(count) || 0;
    } catch (error) {
      console.error('Redis rate limit get error:', error);
      return 0;
    }
  }

  /**
   * Reset count for a key
   */
  async reset(key: string): Promise<void> {
    const redisKey = this.getKey(key);

    try {
      await this.client.del(redisKey);
    } catch (error) {
      console.error('Redis rate limit reset error:', error);
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    const redisKey = this.getKey(key);

    try {
      const ttl = await this.client.ttl(redisKey);
      return Math.max(Number(ttl), 0);
    } catch (error) {
      console.error('Redis rate limit ttl error:', error);
      return 0;
    }
  }
}

/**
 * Create Redis store instance
 * Returns null if Redis is not configured
 */
export function createRedisStore(): RedisRateLimitStore | null {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    return null;
  }

  try {
    // Dynamically import Redis client
    // This allows the code to work without Redis dependency in development
    // In production, you would install `ioredis` or `redis` package
    // For now, return null if not available
    console.warn('Redis URL configured but Redis client not implemented. Using in-memory store.');
    return null;
  } catch (error) {
    console.error('Failed to create Redis store:', error);
    return null;
  }
}
