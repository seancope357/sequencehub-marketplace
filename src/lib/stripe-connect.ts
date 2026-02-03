/**
 * Stripe Connect Utilities
 * Handles all Stripe Connect Express account operations for creator onboarding
 */

import Stripe from 'stripe';
import { db } from '@/lib/db';
import { OnboardingStatus } from '@prisma/client';

const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2024-12-18.acacia';

let stripeClient: Stripe | null = null;
let stripeKeyCached: string | null = null;

export class StripeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripeConfigError';
  }
}

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export function getStripeConfigStatus(): {
  configured: boolean;
  message?: string;
  baseUrl: string;
} {
  if (!process.env.STRIPE_SECRET_KEY) {
    return {
      configured: false,
      message: 'Stripe Connect is not configured for this environment.',
      baseUrl: getBaseUrl(),
    };
  }

  return { configured: true, baseUrl: getBaseUrl() };
}

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new StripeConfigError('Stripe Connect is not configured for this environment.');
  }

  if (!stripeClient || stripeKeyCached !== key) {
    stripeClient = new Stripe(key, { apiVersion: STRIPE_API_VERSION });
    stripeKeyCached = key;
  }

  return stripeClient;
}

/**
 * Create a Stripe Connect Express account for a creator
 * Uses Stripe Connect V2 API with controller pattern
 */
export async function createConnectedAccount(userId: string, email: string): Promise<Stripe.Account> {
  try {
    const stripe = getStripeClient();
    // Create Express account using V2 API format
    // NOTE: Do NOT use top-level 'type' parameter - use controller.stripe_dashboard.type instead
    const account = await stripe.accounts.create({
      controller: {
        stripe_dashboard: {
          type: 'express', // Express dashboard type
        },
        fees: {
          payer: 'application', // Platform pays Stripe fees
        },
        losses: {
          payments: 'application', // Platform liable for payment disputes
        },
        requirement_collection: 'application', // Platform collects onboarding requirements
      },
      country: 'US',
      email: email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId: userId,
        platform: 'sequencehub',
        createdWith: 'stripe-connect-v2',
      },
    });

    return account;
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    throw error;
  }
}

/**
 * Generate an account onboarding link for a creator
 */
export async function createAccountOnboardingLink(stripeAccountId: string): Promise<string> {
  try {
    const stripe = getStripeClient();
    const baseUrl = getBaseUrl();
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${baseUrl}/dashboard/creator/onboarding?refresh=true`,
      return_url: `${baseUrl}/dashboard/creator/onboarding?success=true`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  } catch (error) {
    console.error('Error creating account link:', error);
    throw error;
  }
}

/**
 * Generate a login link to the Stripe Express Dashboard
 */
export async function createExpressDashboardLink(stripeAccountId: string): Promise<string> {
  try {
    const stripe = getStripeClient();
    const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
    return loginLink.url;
  } catch (error) {
    console.error('Error creating dashboard link:', error);
    throw error;
  }
}

/**
 * Retrieve Stripe account details and check onboarding status
 */
export async function getAccountStatus(stripeAccountId: string): Promise<{
  account: Stripe.Account;
  isComplete: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  capabilitiesActive: boolean;
}> {
  try {
    const stripe = getStripeClient();
    const account = await stripe.accounts.retrieve(stripeAccountId);

    const isComplete = Boolean(
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled
    );

    const capabilitiesActive = Boolean(
      account.capabilities?.card_payments === 'active' &&
      account.capabilities?.transfers === 'active'
    );

    return {
      account,
      isComplete,
      chargesEnabled: account.charges_enabled || false,
      detailsSubmitted: account.details_submitted || false,
      capabilitiesActive,
    };
  } catch (error) {
    console.error('Error retrieving account status:', error);
    throw error;
  }
}

/**
 * Update creator account in database based on Stripe account status
 */
export async function updateCreatorAccountStatus(
  stripeAccountId: string,
  account: Stripe.Account
): Promise<void> {
  try {
    const isComplete = Boolean(
      account.details_submitted &&
      account.charges_enabled &&
      account.payouts_enabled
    );

    const onboardingStatus: OnboardingStatus = isComplete
      ? 'COMPLETED'
      : account.details_submitted
      ? 'IN_PROGRESS'
      : 'PENDING';

    await db.creatorAccount.update({
      where: { stripeAccountId },
      data: {
        stripeAccountStatus: account.charges_enabled ? 'active' : 'pending',
        onboardingStatus,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error updating creator account status:', error);
    throw error;
  }
}

/**
 * Initialize creator account with Stripe Connect
 * Creates both the Stripe account and the database record
 */
export async function initializeCreatorAccount(
  userId: string,
  email: string
): Promise<{
  stripeAccountId: string;
  onboardingUrl: string;
}> {
  try {
    // Check if creator account already exists
    const existingAccount = await db.creatorAccount.findUnique({
      where: { userId },
    });

    let stripeAccountId: string;

    if (existingAccount?.stripeAccountId) {
      // Account already exists, just generate new onboarding link
      stripeAccountId = existingAccount.stripeAccountId;
    } else {
      // Create new Stripe account
      const account = await createConnectedAccount(userId, email);
      stripeAccountId = account.id;

      // Create or update database record
      if (existingAccount) {
        await db.creatorAccount.update({
          where: { userId },
          data: {
            stripeAccountId,
            stripeAccountStatus: 'pending',
            onboardingStatus: 'IN_PROGRESS',
          },
        });
      } else {
        await db.creatorAccount.create({
          data: {
            userId,
            stripeAccountId,
            stripeAccountStatus: 'pending',
            onboardingStatus: 'IN_PROGRESS',
            platformFeePercent: 10.0, // Default 10% platform fee
            payoutSchedule: 'manual',
          },
        });
      }
    }

    // Generate onboarding link
    const onboardingUrl = await createAccountOnboardingLink(stripeAccountId);

    return {
      stripeAccountId,
      onboardingUrl,
    };
  } catch (error) {
    console.error('Error initializing creator account:', error);
    throw error;
  }
}

/**
 * Check if a creator account is fully onboarded and ready to receive payments
 */
export async function isAccountReadyForPayments(stripeAccountId: string): Promise<boolean> {
  try {
    const { isComplete, chargesEnabled } = await getAccountStatus(stripeAccountId);
    return isComplete && chargesEnabled;
  } catch (error) {
    console.error('Error checking payment readiness:', error);
    return false;
  }
}

/**
 * Handle account deauthorization (when creator disconnects)
 */
export async function handleAccountDeauthorization(stripeAccountId: string): Promise<void> {
  try {
    await db.creatorAccount.update({
      where: { stripeAccountId },
      data: {
        stripeAccountStatus: 'deauthorized',
        onboardingStatus: 'SUSPENDED',
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error handling account deauthorization:', error);
    throw error;
  }
}
