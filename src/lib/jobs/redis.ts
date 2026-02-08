/**
 * Redis Connection Management
 * Handles Redis connections for BullMQ with fallback support
 */

import Redis, { RedisOptions } from 'ioredis';

// ============================================
// REDIS CONNECTION CONFIGURATION
// ============================================

const REDIS_URL = process.env.REDIS_URL || '';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_TLS = process.env.REDIS_TLS === 'true';

// ============================================
// REDIS OPTIONS
// ============================================

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

// Parse Redis URL if provided
if (REDIS_URL) {
  // URL format: redis://[:password@]host[:port][/db]
  // or rediss:// for TLS
  const url = new URL(REDIS_URL);
  redisOptions.host = url.hostname;
  redisOptions.port = parseInt(url.port || '6379', 10);

  if (url.password) {
    redisOptions.password = url.password;
  }

  if (url.protocol === 'rediss:') {
    redisOptions.tls = {};
  }

  // Extract database number from path
  const dbMatch = url.pathname.match(/\/(\d+)/);
  if (dbMatch) {
    redisOptions.db = parseInt(dbMatch[1], 10);
  }
} else {
  // Use individual config values
  redisOptions.host = REDIS_HOST;
  redisOptions.port = REDIS_PORT;

  if (REDIS_PASSWORD) {
    redisOptions.password = REDIS_PASSWORD;
  }

  if (REDIS_TLS) {
    redisOptions.tls = {};
  }
}

// ============================================
// CONNECTION SINGLETON
// ============================================

let redisConnection: Redis | null = null;
let isRedisAvailable = true;

/**
 * Get or create Redis connection
 */
export function getRedisConnection(): Redis | null {
  // If Redis is not available, return null (will use in-memory fallback)
  if (!isRedisAvailable) {
    console.warn('Redis is not available, jobs will not persist');
    return null;
  }

  if (!redisConnection) {
    try {
      redisConnection = new Redis(redisOptions);

      redisConnection.on('connect', () => {
        console.log('✓ Redis connected successfully');
        isRedisAvailable = true;
      });

      redisConnection.on('error', (err) => {
        console.error('Redis connection error:', err.message);

        // Don't mark as unavailable for transient errors
        if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
          isRedisAvailable = false;
          console.warn('Redis unavailable - background jobs will not persist');
        }
      });

      redisConnection.on('close', () => {
        console.warn('Redis connection closed');
      });

      redisConnection.on('reconnecting', () => {
        console.log('Redis reconnecting...');
      });

    } catch (error) {
      console.error('Failed to create Redis connection:', error);
      isRedisAvailable = false;
      return null;
    }
  }

  return redisConnection;
}

/**
 * Create a new Redis connection (for workers)
 * Each worker should have its own connection
 */
export function createRedisConnection(): Redis | null {
  if (!isRedisAvailable) {
    return null;
  }

  try {
    const connection = new Redis(redisOptions);

    connection.on('error', (err) => {
      console.error('Worker Redis connection error:', err.message);
    });

    return connection;
  } catch (error) {
    console.error('Failed to create worker Redis connection:', error);
    return null;
  }
}

/**
 * Check if Redis is available
 */
export async function checkRedisHealth(): Promise<boolean> {
  const redis = getRedisConnection();

  if (!redis) {
    return false;
  }

  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Get Redis info for monitoring
 */
export async function getRedisInfo(): Promise<Record<string, any>> {
  const redis = getRedisConnection();

  if (!redis) {
    return {
      available: false,
      error: 'Redis not connected',
    };
  }

  try {
    const info = await redis.info();
    const memoryInfo = await redis.info('memory');
    const statsInfo = await redis.info('stats');

    return {
      available: true,
      connected: redis.status === 'ready',
      version: info.match(/redis_version:([^\r\n]+)/)?.[1],
      uptime: info.match(/uptime_in_seconds:([^\r\n]+)/)?.[1],
      memory: memoryInfo.match(/used_memory_human:([^\r\n]+)/)?.[1],
      connections: statsInfo.match(/total_connections_received:([^\r\n]+)/)?.[1],
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisEnabled(): boolean {
  return isRedisAvailable;
}

// ============================================
// FALLBACK WARNING
// ============================================

if (!REDIS_URL && !process.env.REDIS_HOST) {
  console.warn('⚠️  No Redis configuration found (REDIS_URL or REDIS_HOST)');
  console.warn('⚠️  Background jobs will not persist across server restarts');
  console.warn('⚠️  For production, configure Redis for reliable job processing');
}

// ============================================
// EXPORTS
// ============================================

export default {
  getRedisConnection,
  createRedisConnection,
  checkRedisHealth,
  getRedisInfo,
  closeRedisConnection,
  isRedisEnabled,
};
