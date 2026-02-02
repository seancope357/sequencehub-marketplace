/**
 * Email Sending Utility
 * Handles all email sending operations with proper error handling and logging
 */

import { render } from '@react-email/render';
import { resend, EMAIL_CONFIG, isEmailConfigured } from './client';
import type {
  EmailTemplate,
  BaseEmailData,
  WelcomeEmailData,
  PurchaseConfirmationEmailData,
  SaleNotificationEmailData,
  DownloadReadyEmailData,
  StripeSetupReminderEmailData,
  ProductPublishedEmailData,
  EmailSendOptions,
  EmailSendResult,
} from './types';

// Import templates (will create these next)
import { WelcomeEmail } from './templates/WelcomeEmail';
import { PurchaseConfirmationEmail } from './templates/PurchaseConfirmationEmail';
import { SaleNotificationEmail } from './templates/SaleNotificationEmail';
import { DownloadReadyEmail } from './templates/DownloadReadyEmail';
import { StripeSetupReminderEmail } from './templates/StripeSetupReminderEmail';
import { ProductPublishedEmail } from './templates/ProductPublishedEmail';

// ============================================
// TEMPLATE REGISTRY
// ============================================

type EmailTemplateComponent = (props: any) => JSX.Element;

interface TemplateConfig {
  component: EmailTemplateComponent;
  subject: (data: any) => string;
}

const TEMPLATE_REGISTRY: Record<EmailTemplate, TemplateConfig> = {
  welcome: {
    component: WelcomeEmail,
    subject: (data: WelcomeEmailData) => `Welcome to SequenceHUB, ${data.userName}!`,
  },
  'purchase-confirmation': {
    component: PurchaseConfirmationEmail,
    subject: (data: PurchaseConfirmationEmailData) =>
      `Your purchase of "${data.productName}" is confirmed!`,
  },
  'sale-notification': {
    component: SaleNotificationEmail,
    subject: (data: SaleNotificationEmailData) =>
      `You made a sale! "${data.productName}" (${data.currency} ${data.netEarnings.toFixed(2)})`,
  },
  'download-ready': {
    component: DownloadReadyEmail,
    subject: (data: DownloadReadyEmailData) => `Your download is ready: ${data.productName}`,
  },
  'stripe-setup-reminder': {
    component: StripeSetupReminderEmail,
    subject: () => 'Complete your Stripe setup to start selling',
  },
  'product-published': {
    component: ProductPublishedEmail,
    subject: (data: ProductPublishedEmailData) =>
      `Your product "${data.productName}" is now live!`,
  },
  'refund-notification-buyer': {
    component: PurchaseConfirmationEmail, // Reuse for now, customize later
    subject: (data: PurchaseConfirmationEmailData) => `Refund processed for "${data.productName}"`,
  },
  'refund-notification-seller': {
    component: SaleNotificationEmail, // Reuse for now, customize later
    subject: (data: SaleNotificationEmailData) => `Refund issued for "${data.productName}"`,
  },
};

// ============================================
// MAIN SEND FUNCTION
// ============================================

/**
 * Send an email using a template
 *
 * @param template - Template identifier
 * @param data - Template-specific data
 * @param options - Additional sending options
 * @returns Result with success status and email ID
 */
export async function sendEmail<T extends BaseEmailData>(
  template: EmailTemplate,
  data: T,
  options: EmailSendOptions = {}
): Promise<EmailSendResult> {
  // Check if email system is configured
  if (!isEmailConfigured()) {
    console.warn(`[Email] Email system not configured. Would have sent ${template} to ${data.recipientEmail}`);
    return {
      success: false,
      error: 'Email system not configured',
    };
  }

  if (!resend) {
    return {
      success: false,
      error: 'Resend client not initialized',
    };
  }

  try {
    // Get template configuration
    const templateConfig = TEMPLATE_REGISTRY[template];
    if (!templateConfig) {
      throw new Error(`Unknown email template: ${template}`);
    }

    // Render email component to HTML
    const html = render(templateConfig.component(data));

    // Generate subject line
    const subject = templateConfig.subject(data);

    // Apply rate limiting delay if configured
    if (EMAIL_CONFIG.sendDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, EMAIL_CONFIG.sendDelay));
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: data.recipientEmail,
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html,
      tags: options.tags,
      headers: options.headers,
      scheduledAt: options.scheduledFor?.toISOString(),
    });

    if (result.error) {
      console.error('[Email] Send failed:', result.error);
      return {
        success: false,
        error: result.error.message,
      };
    }

    console.log(`[Email] Sent ${template} to ${data.recipientEmail} (ID: ${result.data?.id})`);

    return {
      success: true,
      emailId: result.data?.id,
    };
  } catch (error) {
    console.error('[Email] Send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================
// BULK SEND FUNCTION
// ============================================

/**
 * Send multiple emails (with rate limiting)
 *
 * @param emails - Array of email configurations
 * @returns Array of results
 */
export async function sendBulkEmails(
  emails: Array<{
    template: EmailTemplate;
    data: BaseEmailData;
    options?: EmailSendOptions;
  }>
): Promise<EmailSendResult[]> {
  const results: EmailSendResult[] = [];

  for (const email of emails) {
    const result = await sendEmail(email.template, email.data, email.options);
    results.push(result);

    // Respect rate limiting between sends
    if (EMAIL_CONFIG.sendDelay > 0 && emails.indexOf(email) < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, EMAIL_CONFIG.sendDelay));
    }
  }

  return results;
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailSendResult> {
  return sendEmail('welcome', data);
}

/**
 * Send purchase confirmation to buyers
 */
export async function sendPurchaseConfirmation(
  data: PurchaseConfirmationEmailData
): Promise<EmailSendResult> {
  return sendEmail('purchase-confirmation', data);
}

/**
 * Send sale notification to sellers
 */
export async function sendSaleNotification(
  data: SaleNotificationEmailData
): Promise<EmailSendResult> {
  return sendEmail('sale-notification', data);
}

/**
 * Send download ready notification
 */
export async function sendDownloadReady(
  data: DownloadReadyEmailData
): Promise<EmailSendResult> {
  return sendEmail('download-ready', data);
}

/**
 * Send Stripe setup reminder to creators
 */
export async function sendStripeSetupReminder(
  data: StripeSetupReminderEmailData
): Promise<EmailSendResult> {
  return sendEmail('stripe-setup-reminder', data);
}

/**
 * Send product published notification
 */
export async function sendProductPublished(
  data: ProductPublishedEmailData
): Promise<EmailSendResult> {
  return sendEmail('product-published', data);
}
