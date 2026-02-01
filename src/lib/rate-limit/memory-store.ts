/**
 * In-Memory Rate Limit Store
 *
 * Development/fallback storage backend using Map with automatic cleanup
 * Uses sliding window algorithm for accurate rate limiting
 */

import { RateLimitStore } from './types';

interface StoredEntry {
  /**
   * Request timestamps in the current window (sliding window)
   */
  timestamps: number[];

  /**
   * When this entry expires (for cleanup)
   */
  expiresAt: number;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, StoredEntry>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-cleanup every 60 seconds
    this.startCleanup();
  }

  /**
   * Increment request count using sliding window
   */
  async increment(key: string, windowSeconds: number): Promise<{ count: number; ttl: number }> {
    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;
    const expiresAt = now + windowSeconds * 1000;

    // Get or create entry
    let entry = this.store.get(key);
    if (!entry) {
      entry = { timestamps: [], expiresAt };
      this.store.set(key, entry);
    }

    // Remove timestamps outside the sliding window
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

    // Add current timestamp
    entry.timestamps.push(now);
    entry.expiresAt = expiresAt;

    // Calculate TTL
    const oldestTimestamp = entry.timestamps[0] || now;
    const ttl = Math.ceil((oldestTimestamp + windowSeconds * 1000 - now) / 1000);

    return {
      count: entry.timestamps.length,
      ttl: Math.max(ttl, 0),
    };
  }

  /**
   * Get current request count in sliding window
   */
  async get(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }

    const now = Date.now();
    // Don't calculate window here - just return count
    // Window filtering happens in increment()
    return entry.timestamps.filter((ts) => ts > now - 60 * 1000).length;
  }

  /**
   * Reset count for a key
   */
  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }

    const now = Date.now();
    const ttl = Math.ceil((entry.expiresAt - now) / 1000);
    return Math.max(ttl, 0);
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }

  /**
   * Start automatic cleanup
   */
  private startCleanup(): void {
    // Run cleanup every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(console.error);
    }, 60 * 1000);
  }

  /**
   * Stop automatic cleanup (for testing)
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get store size (for monitoring)
   */
  getSize(): number {
    return this.store.size;
  }

  /**
   * Clear all entries (for testing)
   */
  clear(): void {
    this.store.clear();
  }
}

// Export singleton instance
export const memoryStore = new MemoryRateLimitStore();
