/**
 * Email Type Definitions
 * All email templates and data interfaces
 */

// ============================================
// EMAIL TEMPLATE TYPES
// ============================================

export type EmailTemplate =
  | 'welcome'
  | 'purchase-confirmation'
  | 'sale-notification'
  | 'download-ready'
  | 'stripe-setup-reminder'
  | 'product-published'
  | 'refund-notification-buyer'
  | 'refund-notification-seller';

// ============================================
// BASE EMAIL DATA
// ============================================

export interface BaseEmailData {
  recipientName?: string;
  recipientEmail: string;
}

// ============================================
// TEMPLATE-SPECIFIC DATA INTERFACES
// ============================================

export interface WelcomeEmailData extends BaseEmailData {
  userName: string;
  dashboardUrl: string;
  registrationDate: Date;
}

export interface PurchaseConfirmationEmailData extends BaseEmailData {
  orderNumber: string;
  productName: string;
  productSlug: string;
  creatorName: string;
  totalAmount: number;
  currency: string;
  purchaseDate: Date;
  libraryUrl: string;
  licenseType: 'PERSONAL' | 'COMMERCIAL';
  downloadUrl: string;
}

export interface SaleNotificationEmailData extends BaseEmailData {
  orderNumber: string;
  productName: string;
  productSlug: string;
  buyerName?: string;
  saleAmount: number;
  platformFeeAmount: number;
  netEarnings: number;
  currency: string;
  saleDate: Date;
  dashboardUrl: string;
}

export interface DownloadReadyEmailData extends BaseEmailData {
  productName: string;
  files: Array<{
    name: string;
    type: 'SOURCE' | 'RENDERED' | 'ASSET';
    size: number;
  }>;
  downloadUrl: string;
  expirationHours: number;
  rateLimit: number;
}

export interface StripeSetupReminderEmailData extends BaseEmailData {
  creatorName: string;
  onboardingUrl: string;
  draftProductCount: number;
}

export interface ProductPublishedEmailData extends BaseEmailData {
  productName: string;
  productSlug: string;
  productUrl: string;
  price: number;
  currency: string;
  publishDate: Date;
}

// ============================================
// EMAIL SENDING OPTIONS
// ============================================

export interface EmailSendOptions {
  priority?: 'high' | 'normal' | 'low';
  scheduledFor?: Date;
  tags?: string[];
  headers?: Record<string, string>;
}

// ============================================
// EMAIL SEND RESULT
// ============================================

export interface EmailSendResult {
  success: boolean;
  emailId?: string;
  error?: string;
}
