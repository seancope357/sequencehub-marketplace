/**
 * Token Blacklist System
 * Revokes JWT tokens before their natural expiry
 * Uses in-memory storage with optional Redis upgrade path
 */

interface BlacklistEntry {
  tokenId: string;
  expiresAt: number;
}

/**
 * In-memory token blacklist
 * In production, this should be replaced with Redis for distributed systems
 */
class TokenBlacklist {
  private blacklist: Map<string, number> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired tokens every hour
    this.cleanupInterval = setInterval(() => this.cleanup(), 60 * 60 * 1000);
  }

  /**
   * Add a token to the blacklist
   * @param tokenId Unique identifier for the token (e.g., jti claim or token hash)
   * @param expiresAt When the token naturally expires (timestamp in seconds)
   */
  add(tokenId: string, expiresAt: number): void {
    this.blacklist.set(tokenId, expiresAt);
  }

  /**
   * Check if a token is blacklisted
   * @param tokenId Unique identifier for the token
   * @returns true if token is blacklisted, false otherwise
   */
  isBlacklisted(tokenId: string): boolean {
    const expiresAt = this.blacklist.get(tokenId);

    if (!expiresAt) {
      return false;
    }

    // If token has expired naturally, remove it from blacklist
    const now = Math.floor(Date.now() / 1000);
    if (now > expiresAt) {
      this.blacklist.delete(tokenId);
      return false;
    }

    return true;
  }

  /**
   * Remove a token from the blacklist
   * @param tokenId Unique identifier for the token
   */
  remove(tokenId: string): void {
    this.blacklist.delete(tokenId);
  }

  /**
   * Clean up expired tokens from the blacklist
   */
  private cleanup(): void {
    const now = Math.floor(Date.now() / 1000);
    const expiredTokens: string[] = [];

    for (const [tokenId, expiresAt] of this.blacklist.entries()) {
      if (now > expiresAt) {
        expiredTokens.push(tokenId);
      }
    }

    expiredTokens.forEach(tokenId => this.blacklist.delete(tokenId));

    if (expiredTokens.length > 0) {
      console.log(`[TokenBlacklist] Cleaned up ${expiredTokens.length} expired tokens`);
    }
  }

  /**
   * Get the number of blacklisted tokens
   */
  size(): number {
    return this.blacklist.size;
  }

  /**
   * Clear all blacklisted tokens (for testing)
   */
  clear(): void {
    this.blacklist.clear();
  }

  /**
   * Stop cleanup interval (for graceful shutdown)
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Singleton instance
const tokenBlacklist = new TokenBlacklist();

export default tokenBlacklist;

/**
 * Helper to generate a token ID from a JWT token
 * Uses a hash of the token for consistency
 */
export function generateTokenId(token: string): string {
  // Use a simple hash for token ID
  // In production, you might want to use the 'jti' claim if available
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Redis-based token blacklist (for production with Redis)
 * TODO: Implement when REDIS_URL is configured
 */
export class RedisTokenBlacklist {
  // TODO: Implement Redis-based blacklist
  // This would use Redis SETEX to store blacklisted tokens
  // Key: `blacklist:${tokenId}`, Value: '1', TTL: time until token expires
}
