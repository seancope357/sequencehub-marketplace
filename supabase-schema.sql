-- ============================================
-- SEQUENCEHUB DATABASE SCHEMA
-- ============================================
-- Run this in Supabase SQL Editor to set up all tables
-- This creates all tables needed for authentication, products, orders, and payments

-- Drop existing tables (if recreating from scratch - CAREFUL!)
-- Uncomment these lines ONLY if you want to completely reset the database
-- DROP TABLE IF EXISTS "AccessLog" CASCADE;
-- DROP TABLE IF EXISTS "DownloadToken" CASCADE;
-- DROP TABLE IF EXISTS "AuditLog" CASCADE;
-- DROP TABLE IF EXISTS "LegalAcceptance" CASCADE;
-- DROP TABLE IF EXISTS "LegalDocument" CASCADE;
-- DROP TABLE IF EXISTS "Entitlement" CASCADE;
-- DROP TABLE IF EXISTS "OrderItem" CASCADE;
-- DROP TABLE IF EXISTS "Order" CASCADE;
-- DROP TABLE IF EXISTS "CheckoutSession" CASCADE;
-- DROP TABLE IF EXISTS "Price" CASCADE;
-- DROP TABLE IF EXISTS "ProductTag" CASCADE;
-- DROP TABLE IF EXISTS "Tag" CASCADE;
-- DROP TABLE IF EXISTS "ProductMedia" CASCADE;
-- DROP TABLE IF EXISTS "ProductFile" CASCADE;
-- DROP TABLE IF EXISTS "ProductVersion" CASCADE;
-- DROP TABLE IF EXISTS "Product" CASCADE;
-- DROP TABLE IF EXISTS "CreatorAccount" CASCADE;
-- DROP TABLE IF EXISTS "UserRole" CASCADE;
-- DROP TABLE IF EXISTS "Profile" CASCADE;
-- DROP TABLE IF EXISTS "User" CASCADE;
-- DROP TYPE IF EXISTS "Role" CASCADE;
-- DROP TYPE IF EXISTS "OnboardingStatus" CASCADE;
-- DROP TYPE IF EXISTS "ProductStatus" CASCADE;
-- DROP TYPE IF EXISTS "ProductCategory" CASCADE;
-- DROP TYPE IF EXISTS "LicenseType" CASCADE;
-- DROP TYPE IF EXISTS "FileType" CASCADE;
-- DROP TYPE IF EXISTS "CheckoutStatus" CASCADE;
-- DROP TYPE IF EXISTS "OrderStatus" CASCADE;
-- DROP TYPE IF EXISTS "AuditAction" CASCADE;
-- DROP TYPE IF EXISTS "LegalDocType" CASCADE;

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE "Role" AS ENUM ('ADMIN', 'CREATOR', 'BUYER');

CREATE TYPE "OnboardingStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TYPE "ProductStatus" AS ENUM (
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'SUSPENDED'
);

CREATE TYPE "ProductCategory" AS ENUM (
  'CHRISTMAS',
  'HALLOWEEN',
  'PIXEL_TREE',
  'MELODY',
  'MATRIX',
  'ARCH',
  'PROP',
  'FACEBOOK',
  'OTHER'
);

CREATE TYPE "LicenseType" AS ENUM ('PERSONAL', 'COMMERCIAL');

CREATE TYPE "FileType" AS ENUM ('SOURCE', 'RENDERED', 'ASSET', 'PREVIEW');

CREATE TYPE "CheckoutStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

CREATE TYPE "AuditAction" AS ENUM (
  'USER_LOGIN',
  'USER_LOGOUT',
  'USER_CREATED',
  'USER_UPDATED',
  'USER_DELETED',
  'PRODUCT_CREATED',
  'PRODUCT_UPDATED',
  'PRODUCT_DELETED',
  'PRODUCT_PUBLISHED',
  'PRODUCT_UNPUBLISHED',
  'PRODUCT_ARCHIVED',
  'FILE_UPLOADED',
  'FILE_DELETED',
  'ORDER_CREATED',
  'ORDER_UPDATED',
  'ORDER_REFUNDED',
  'ENTITLEMENT_GRANTED',
  'ENTITLEMENT_REVOKED',
  'STRIPE_WEBHOOK_RECEIVED',
  'STRIPE_WEBHOOK_PROCESSED',
  'STRIPE_WEBHOOK_FAILED',
  'STRIPE_ONBOARDING_STARTED',
  'STRIPE_ACCOUNT_UPDATED',
  'STRIPE_CAPABILITY_UPDATED',
  'STRIPE_DASHBOARD_ACCESSED',
  'CHECKOUT_SESSION_CREATED',
  'PAYMENT_RECEIVED',
  'REFUND_INITIATED',
  'PAYOUT_CREATED',
  'ADMIN_ACTION',
  'RATE_LIMIT_EXCEEDED',
  'SECURITY_ALERT',
  'DOWNLOAD_TOKEN_CREATED',
  'DOWNLOAD_ACCESS_DENIED',
  'LEGAL_ACCEPTED',
  'ONBOARDING_STARTED',
  'ONBOARDING_STEP_COMPLETED',
  'ONBOARDING_COMPLETED'
);

CREATE TYPE "LegalDocType" AS ENUM (
  'TERMS_OF_SERVICE',
  'PRIVACY_POLICY',
  'SELLER_AGREEMENT',
  'REFUND_POLICY',
  'COOKIE_POLICY'
);

-- ============================================
-- USER MANAGEMENT & AUTHENTICATION
-- ============================================

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT,
  "emailVerified" BOOLEAN DEFAULT false NOT NULL,
  "avatar" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  -- Onboarding tracking
  "onboardingCompleted" BOOLEAN DEFAULT false NOT NULL,
  "onboardingStep" INTEGER DEFAULT 0 NOT NULL,
  "onboardingData" TEXT,

  -- Legal acceptance tracking
  "tosAcceptedAt" TIMESTAMP,
  "tosVersion" TEXT,
  "privacyAcceptedAt" TIMESTAMP,
  "privacyVersion" TEXT,
  "sellerTermsAcceptedAt" TIMESTAMP,
  "sellerTermsVersion" TEXT
);

CREATE TABLE "Profile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL,
  "displayName" TEXT NOT NULL,
  "bio" TEXT,
  "website" TEXT,
  "socialTwitter" TEXT,
  "socialYouTube" TEXT,
  "socialInstagram" TEXT,
  "location" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "UserRole" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "role")
);

CREATE TABLE "CreatorAccount" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE NOT NULL,
  "stripeAccountId" TEXT UNIQUE,
  "stripeAccountStatus" TEXT,
  "onboardingStatus" "OnboardingStatus" DEFAULT 'PENDING' NOT NULL,
  "platformFeePercent" DOUBLE PRECISION DEFAULT 10.0 NOT NULL,
  "totalRevenue" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "totalSales" INTEGER DEFAULT 0 NOT NULL,
  "payoutSchedule" TEXT DEFAULT 'manual' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- ============================================
-- PRODUCTS & VERSIONING
-- ============================================

CREATE TABLE "Product" (
  "id" TEXT PRIMARY KEY,
  "slug" TEXT UNIQUE NOT NULL,
  "creatorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "ProductCategory" NOT NULL,
  "status" "ProductStatus" DEFAULT 'DRAFT' NOT NULL,
  "licenseType" "LicenseType" DEFAULT 'PERSONAL' NOT NULL,
  "seatCount" INTEGER,

  -- xLights-specific metadata
  "xLightsVersionMin" TEXT,
  "xLightsVersionMax" TEXT,
  "targetUse" TEXT,
  "expectedProps" TEXT,
  "includesFSEQ" BOOLEAN DEFAULT false NOT NULL,
  "includesSource" BOOLEAN DEFAULT false NOT NULL,

  -- SEO
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "metaKeywords" TEXT,

  -- Stats
  "viewCount" INTEGER DEFAULT 0 NOT NULL,
  "saleCount" INTEGER DEFAULT 0 NOT NULL,

  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "ProductVersion" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "versionNumber" INTEGER NOT NULL,
  "versionName" TEXT NOT NULL,
  "changelog" TEXT,
  "isLatest" BOOLEAN DEFAULT false NOT NULL,
  "publishedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  UNIQUE ("productId", "versionNumber")
);

CREATE TABLE "ProductFile" (
  "id" TEXT PRIMARY KEY,
  "versionId" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "fileType" "FileType" NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileHash" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT,
  "metadata" TEXT,

  -- xLights-specific metadata
  "sequenceLength" DOUBLE PRECISION,
  "fps" INTEGER,
  "channelCount" INTEGER,

  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("versionId") REFERENCES "ProductVersion"("id") ON DELETE CASCADE
);

CREATE TABLE "ProductMedia" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "mediaType" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileHash" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "altText" TEXT,
  "displayOrder" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE TABLE "Tag" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT UNIQUE NOT NULL,
  "slug" TEXT UNIQUE NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "ProductTag" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE,
  FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE,
  UNIQUE ("productId", "tagId")
);

-- ============================================
-- PRICING & PAYMENTS
-- ============================================

CREATE TABLE "Price" (
  "id" TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD' NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE TABLE "CheckoutSession" (
  "id" TEXT PRIMARY KEY,
  "sessionId" TEXT UNIQUE NOT NULL,
  "userId" TEXT,
  "productId" TEXT NOT NULL,
  "priceId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "CheckoutStatus" DEFAULT 'PENDING' NOT NULL,
  "successUrl" TEXT,
  "cancelUrl" TEXT,
  "metadata" TEXT,
  "expiresAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- ORDERS & ENTITLEMENTS
-- ============================================

CREATE TABLE "Order" (
  "id" TEXT PRIMARY KEY,
  "orderNumber" TEXT UNIQUE NOT NULL,
  "userId" TEXT NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'USD' NOT NULL,
  "status" "OrderStatus" DEFAULT 'PENDING' NOT NULL,
  "paymentIntentId" TEXT UNIQUE,

  -- Refund tracking
  "refundedAmount" DOUBLE PRECISION DEFAULT 0 NOT NULL,
  "refundedAt" TIMESTAMP,

  -- UTM tracking
  "utmSource" TEXT,
  "utmMedium" TEXT,
  "utmCampaign" TEXT,

  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "OrderItem" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "versionId" TEXT,
  "priceId" TEXT NOT NULL,
  "priceAtPurchase" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE
);

CREATE TABLE "Entitlement" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "licenseType" "LicenseType" NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "expiresAt" TIMESTAMP,
  "lastDownloadAt" TIMESTAMP,
  "downloadCount" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "productId", "versionId")
);

-- ============================================
-- DOWNLOADS & ACCESS CONTROL
-- ============================================

CREATE TABLE "DownloadToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "entitlementId" TEXT NOT NULL,
  "fileId" TEXT,
  "token" TEXT UNIQUE NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "AccessLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "entitlementId" TEXT,
  "fileId" TEXT,
  "token" TEXT,
  "action" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "success" BOOLEAN NOT NULL,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================
-- AUDIT LOGS & SECURITY
-- ============================================

CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "orderId" TEXT,
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT,
  "entityId" TEXT,
  "changes" TEXT,
  "metadata" TEXT,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL,
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL
);

-- ============================================
-- LEGAL DOCUMENTS & ACCEPTANCE
-- ============================================

CREATE TABLE "LegalDocument" (
  "id" TEXT PRIMARY KEY,
  "type" "LegalDocType" NOT NULL,
  "version" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  UNIQUE ("type", "version")
);

CREATE TABLE "LegalAcceptance" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "documentType" "LegalDocType" NOT NULL,
  "documentVersion" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "acceptedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "documentType", "documentVersion")
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- User indexes
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- Profile indexes
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- UserRole indexes
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- CreatorAccount indexes
CREATE INDEX "CreatorAccount_userId_idx" ON "CreatorAccount"("userId");
CREATE INDEX "CreatorAccount_stripeAccountId_idx" ON "CreatorAccount"("stripeAccountId");

-- Product indexes
CREATE INDEX "Product_creatorId_idx" ON "Product"("creatorId");
CREATE INDEX "Product_slug_idx" ON "Product"("slug");
CREATE INDEX "Product_status_idx" ON "Product"("status");
CREATE INDEX "Product_category_idx" ON "Product"("category");
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- ProductVersion indexes
CREATE INDEX "ProductVersion_productId_idx" ON "ProductVersion"("productId");
CREATE INDEX "ProductVersion_isLatest_idx" ON "ProductVersion"("isLatest");

-- ProductFile indexes
CREATE INDEX "ProductFile_versionId_idx" ON "ProductFile"("versionId");
CREATE INDEX "ProductFile_fileHash_idx" ON "ProductFile"("fileHash");

-- ProductMedia indexes
CREATE INDEX "ProductMedia_productId_idx" ON "ProductMedia"("productId");

-- ProductTag indexes
CREATE INDEX "ProductTag_productId_idx" ON "ProductTag"("productId");
CREATE INDEX "ProductTag_tagId_idx" ON "ProductTag"("tagId");

-- Price indexes
CREATE INDEX "Price_productId_idx" ON "Price"("productId");
CREATE INDEX "Price_isActive_idx" ON "Price"("isActive");

-- CheckoutSession indexes
CREATE INDEX "CheckoutSession_sessionId_idx" ON "CheckoutSession"("sessionId");
CREATE INDEX "CheckoutSession_userId_idx" ON "CheckoutSession"("userId");
CREATE INDEX "CheckoutSession_productId_idx" ON "CheckoutSession"("productId");
CREATE INDEX "CheckoutSession_status_idx" ON "CheckoutSession"("status");

-- Order indexes
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
CREATE INDEX "Order_status_idx" ON "Order"("status");
CREATE INDEX "Order_paymentIntentId_idx" ON "Order"("paymentIntentId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- OrderItem indexes
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");

-- Entitlement indexes
CREATE INDEX "Entitlement_userId_idx" ON "Entitlement"("userId");
CREATE INDEX "Entitlement_orderId_idx" ON "Entitlement"("orderId");
CREATE INDEX "Entitlement_productId_idx" ON "Entitlement"("productId");
CREATE INDEX "Entitlement_isActive_idx" ON "Entitlement"("isActive");

-- DownloadToken indexes
CREATE INDEX "DownloadToken_token_idx" ON "DownloadToken"("token");
CREATE INDEX "DownloadToken_userId_idx" ON "DownloadToken"("userId");
CREATE INDEX "DownloadToken_entitlementId_idx" ON "DownloadToken"("entitlementId");
CREATE INDEX "DownloadToken_expiresAt_idx" ON "DownloadToken"("expiresAt");

-- AccessLog indexes
CREATE INDEX "AccessLog_userId_idx" ON "AccessLog"("userId");
CREATE INDEX "AccessLog_entitlementId_idx" ON "AccessLog"("entitlementId");
CREATE INDEX "AccessLog_ipAddress_idx" ON "AccessLog"("ipAddress");
CREATE INDEX "AccessLog_action_idx" ON "AccessLog"("action");
CREATE INDEX "AccessLog_createdAt_idx" ON "AccessLog"("createdAt");

-- AuditLog indexes
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_orderId_idx" ON "AuditLog"("orderId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- LegalDocument indexes
CREATE INDEX "LegalDocument_type_isActive_idx" ON "LegalDocument"("type", "isActive");

-- LegalAcceptance indexes
CREATE INDEX "LegalAcceptance_userId_idx" ON "LegalAcceptance"("userId");
CREATE INDEX "LegalAcceptance_documentType_idx" ON "LegalAcceptance"("documentType");

-- ============================================
-- UPDATE TRIGGERS (for updatedAt fields)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profile_updated_at BEFORE UPDATE ON "Profile"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_account_updated_at BEFORE UPDATE ON "CreatorAccount"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_updated_at BEFORE UPDATE ON "Product"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_updated_at BEFORE UPDATE ON "Price"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkout_session_updated_at BEFORE UPDATE ON "CheckoutSession"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_updated_at BEFORE UPDATE ON "Order"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entitlement_updated_at BEFORE UPDATE ON "Entitlement"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_legal_document_updated_at BEFORE UPDATE ON "LegalDocument"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ SequenceHUB database schema created successfully!';
    RAISE NOTICE '📊 Created 18 tables with full indexes and triggers';
    RAISE NOTICE '🔐 Authentication ready: User, Profile, UserRole tables';
    RAISE NOTICE '🛍️ E-commerce ready: Product, Order, Entitlement tables';
    RAISE NOTICE '💳 Stripe ready: CheckoutSession, CreatorAccount tables';
    RAISE NOTICE '📝 Audit logging ready: AuditLog, AccessLog tables';
END $$;
