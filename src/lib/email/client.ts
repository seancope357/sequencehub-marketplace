/**
 * Resend Email Client
 * Handles email sending for SequenceHUB using Resend API
 */

import { Resend } from 'resend';

// ============================================
// CONFIGURATION VALIDATION
// ============================================

const emailFeatureEnabled = process.env.EMAIL_ENABLED !== 'false';
const isProduction = process.env.NODE_ENV === 'production';

if (emailFeatureEnabled && !process.env.RESEND_API_KEY && !isProduction) {
  console.warn(
    '⚠️  RESEND_API_KEY not configured. Email functionality will be disabled.\n' +
    '   To enable emails:\n' +
    '   1. Sign up at https://resend.com\n' +
    '   2. Get your API key from the dashboard\n' +
    '   3. Add to .env.local: RESEND_API_KEY=re_xxxxxxxxxxxx'
  );
}

// Initialize Resend client
export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// ============================================
// EMAIL CONFIGURATION
// ============================================

export const EMAIL_CONFIG = {
  // From address - use your verified domain in production
  from: process.env.RESEND_FROM_EMAIL || 'SequenceHUB <onboarding@resend.dev>',

  // Reply-to address for support
  replyTo: process.env.RESEND_REPLY_TO || 'support@sequencehub.com',

  // Feature flag - disable emails in development if needed
  enabled: emailFeatureEnabled && !!process.env.RESEND_API_KEY,

  // Delay between emails (rate limiting)
  sendDelay: parseInt(process.env.EMAIL_SEND_DELAY_MS || '0', 10),
} as const;

/**
 * Check if email system is configured and ready
 */
export function isEmailConfigured(): boolean {
  return EMAIL_CONFIG.enabled && !!resend;
}

/**
 * Test the Resend API connection
 * Useful for health checks
 */
export async function testEmailConnection(): Promise<boolean> {
  if (!resend) {
    return false;
  }

  try {
    // Resend doesn't have a ping endpoint, but we can verify the API key format
    return process.env.RESEND_API_KEY?.startsWith('re_') ?? false;
  } catch (error) {
    console.error('Email connection test failed:', error);
    return false;
  }
}
