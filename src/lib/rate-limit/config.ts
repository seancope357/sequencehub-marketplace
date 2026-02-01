/**
 * Rate Limiting Configuration
 *
 * Centralized configuration for all rate limits in the application
 * Can be customized via environment variables for different environments
 */

import { RateLimitConfig } from './types';

/**
 * Get rate limit configuration from environment or use defaults
 */
function getConfig(
  envKey: string,
  defaultMax: number,
  defaultWindow: number,
  identifier: string
): RateLimitConfig {
  const maxRequests = process.env[`RATE_LIMIT_${envKey}_MAX`]
    ? parseInt(process.env[`RATE_LIMIT_${envKey}_MAX`]!)
    : defaultMax;

  const windowSeconds = process.env[`RATE_LIMIT_${envKey}_WINDOW`]
    ? parseInt(process.env[`RATE_LIMIT_${envKey}_WINDOW`]!)
    : defaultWindow;

  return {
    maxRequests,
    windowSeconds,
    identifier,
  };
}

/**
 * Rate limit presets for common scenarios
 */
export const RateLimitPresets = {
  /**
   * Authentication endpoints - Strict limits to prevent brute force
   */
  AUTH_LOGIN: getConfig('AUTH_LOGIN', 10, 15 * 60, 'auth:login'),
  AUTH_REGISTER: getConfig('AUTH_REGISTER', 5, 60 * 60, 'auth:register'),
  AUTH_PASSWORD_RESET: getConfig('AUTH_PASSWORD_RESET', 3, 60 * 60, 'auth:password_reset'),

  /**
   * API endpoints - General usage limits
   */
  API_UNAUTHENTICATED: getConfig('API_UNAUTH', 100, 60, 'api:unauth'),
  API_AUTHENTICATED: getConfig('API_AUTH', 300, 60, 'api:auth'),

  /**
   * File operations - Resource-intensive limits
   */
  UPLOAD_FILE: getConfig('UPLOAD', 10, 60 * 60, 'file:upload'),
  DELETE_FILE: getConfig('DELETE', 20, 60 * 60, 'file:delete'),
  DOWNLOAD_FILE: getConfig('DOWNLOAD', 10, 24 * 60 * 60, 'file:download'),

  /**
   * Payment endpoints - Fraud prevention
   */
  CHECKOUT_CREATE: getConfig('CHECKOUT', 10, 60 * 60, 'payment:checkout'),
  WEBHOOK_STRIPE: getConfig('WEBHOOK', 1000, 60, 'webhook:stripe'),

  /**
   * Creator dashboard - Prevent spam and abuse
   */
  PRODUCT_CREATE: getConfig('PRODUCT_CREATE', 10, 60 * 60, 'dashboard:product_create'),
  PRODUCT_UPDATE: getConfig('PRODUCT_UPDATE', 30, 60 * 60, 'dashboard:product_update'),
  STATS_QUERY: getConfig('STATS', 60, 60 * 60, 'dashboard:stats'),
} as const;

/**
 * Environment-based configuration
 */
export const RateLimitEnvironment = {
  /**
   * Use Redis for distributed rate limiting in production
   */
  USE_REDIS: process.env.REDIS_URL !== undefined,

  /**
   * Redis connection URL
   */
  REDIS_URL: process.env.REDIS_URL,

  /**
   * Key prefix for Redis storage
   */
  REDIS_KEY_PREFIX: process.env.RATE_LIMIT_REDIS_PREFIX || 'rate_limit:',

  /**
   * Enable detailed logging of rate limit violations
   */
  LOG_VIOLATIONS: process.env.RATE_LIMIT_LOG_VIOLATIONS !== 'false',

  /**
   * Create security alerts after N violations from same source
   */
  ALERT_THRESHOLD: parseInt(process.env.RATE_LIMIT_ALERT_THRESHOLD || '5'),

  /**
   * Disable rate limiting (for testing only)
   */
  DISABLED: process.env.RATE_LIMIT_DISABLED === 'true',
} as const;

/**
 * Get user-friendly rate limit message
 */
export function getRateLimitMessage(config: RateLimitConfig): string {
  const windowMinutes = Math.floor(config.windowSeconds / 60);
  const windowHours = Math.floor(config.windowSeconds / 3600);

  let windowText: string;
  if (windowHours >= 1) {
    windowText = `${windowHours} hour${windowHours > 1 ? 's' : ''}`;
  } else if (windowMinutes >= 1) {
    windowText = `${windowMinutes} minute${windowMinutes > 1 ? 's' : ''}`;
  } else {
    windowText = `${config.windowSeconds} second${config.windowSeconds > 1 ? 's' : ''}`;
  }

  return `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${windowText}. Please try again later.`;
}
