-- Migration: Add Reviews & Ratings System
-- Date: 2026-02-09
-- Description: Adds Review, ReviewVote, and ReviewResponse tables with ratings aggregation

-- Create ReviewStatus enum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED', 'HIDDEN');

-- Create Review table
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "entitlementId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "moderatedBy" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "moderationNote" TEXT,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "unhelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "verifiedPurchase" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- Create ReviewVote table
CREATE TABLE "ReviewVote" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isHelpful" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewVote_pkey" PRIMARY KEY ("id")
);

-- Create ReviewResponse table
CREATE TABLE "ReviewResponse" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "isOfficial" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewResponse_pkey" PRIMARY KEY ("id")
);

-- Add rating fields to Product table
ALTER TABLE "Product" ADD COLUMN "averageRating" DOUBLE PRECISION DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "reviewCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Product" ADD COLUMN "ratingDistribution" TEXT;

-- Create unique constraints
CREATE UNIQUE INDEX "Review_userId_productId_key" ON "Review"("userId", "productId");
CREATE UNIQUE INDEX "ReviewVote_reviewId_userId_key" ON "ReviewVote"("reviewId", "userId");

-- Create indexes for Review
CREATE INDEX "Review_productId_idx" ON "Review"("productId");
CREATE INDEX "Review_userId_idx" ON "Review"("userId");
CREATE INDEX "Review_status_idx" ON "Review"("status");
CREATE INDEX "Review_rating_idx" ON "Review"("rating");
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- Create indexes for ReviewVote
CREATE INDEX "ReviewVote_reviewId_idx" ON "ReviewVote"("reviewId");
CREATE INDEX "ReviewVote_userId_idx" ON "ReviewVote"("userId");

-- Create indexes for ReviewResponse
CREATE INDEX "ReviewResponse_reviewId_idx" ON "ReviewResponse"("reviewId");
CREATE INDEX "ReviewResponse_userId_idx" ON "ReviewResponse"("userId");

-- Add foreign key constraints
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewVote" ADD CONSTRAINT "ReviewVote_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReviewResponse" ADD CONSTRAINT "ReviewResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add new AuditAction enum values (if using enum type)
-- Note: PostgreSQL doesn't support adding enum values in a transaction, so this needs to be run separately if needed
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_CREATED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_UPDATED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_DELETED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_APPROVED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_REJECTED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_FLAGGED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_HIDDEN';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_RESPONSE_CREATED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_RESPONSE_UPDATED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_RESPONSE_DELETED';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_VOTED_HELPFUL';
-- ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'REVIEW_VOTED_UNHELPFUL';

COMMENT ON TABLE "Review" IS 'Product reviews from verified buyers';
COMMENT ON TABLE "ReviewVote" IS 'Helpful/unhelpful votes on reviews';
COMMENT ON TABLE "ReviewResponse" IS 'Creator responses to reviews';
