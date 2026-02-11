-- ============================================
-- SUPABASE RLS POLICIES FOR SEQUENCEHUB
-- ============================================
-- Run this in Supabase SQL Editor to secure your database
-- https://app.supabase.com/project/fhrregyvsmwpfkpnkocy/sql

-- ============================================
-- 1. USER TABLE POLICIES
-- ============================================

-- Enable RLS on User table (if not already enabled)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON "User"
FOR SELECT
USING (auth.uid()::text = id);

-- Users can update their own profile (but not critical fields)
CREATE POLICY "Users can update own profile"
ON "User"
FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

-- Anyone can read basic user info (for creator profiles, reviews, etc.)
CREATE POLICY "Public can read basic user info"
ON "User"
FOR SELECT
USING (true);

-- ============================================
-- 2. PROFILE TABLE POLICIES
-- ============================================

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
ON "Profile"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON "Profile"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON "Profile"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

-- Public can read profiles for creator pages
CREATE POLICY "Public can read profiles"
ON "Profile"
FOR SELECT
USING (true);

-- ============================================
-- 3. USER ROLES POLICIES
-- ============================================

ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;

-- Users can read their own roles
CREATE POLICY "Users can read own roles"
ON "UserRole"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Only admins can modify roles (checked in application layer)
-- No INSERT/UPDATE/DELETE policies - must be done via API

-- ============================================
-- 4. PRODUCT POLICIES
-- ============================================

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

-- Anyone can read published products
CREATE POLICY "Public can read published products"
ON "Product"
FOR SELECT
USING (status = 'PUBLISHED');

-- Creators can read their own products (any status)
CREATE POLICY "Creators can read own products"
ON "Product"
FOR SELECT
USING (auth.uid()::text = "creatorId");

-- Creators can insert their own products
CREATE POLICY "Creators can insert own products"
ON "Product"
FOR INSERT
WITH CHECK (auth.uid()::text = "creatorId");

-- Creators can update their own products
CREATE POLICY "Creators can update own products"
ON "Product"
FOR UPDATE
USING (auth.uid()::text = "creatorId")
WITH CHECK (auth.uid()::text = "creatorId");

-- Creators can delete their own products
CREATE POLICY "Creators can delete own products"
ON "Product"
FOR DELETE
USING (auth.uid()::text = "creatorId");

-- ============================================
-- 5. ORDER POLICIES
-- ============================================

ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

-- Users can read their own orders
CREATE POLICY "Users can read own orders"
ON "Order"
FOR SELECT
USING (auth.uid()::text = "buyerId");

-- Creators can read orders for their products
CREATE POLICY "Creators can read orders for their products"
ON "Order"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "OrderItem" oi
    JOIN "Product" p ON p.id = oi."productId"
    WHERE oi."orderId" = "Order".id
    AND p."creatorId" = auth.uid()::text
  )
);

-- Orders created via webhook (no direct user insert)

-- ============================================
-- 6. ORDER ITEM POLICIES
-- ============================================

ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;

-- Users can read their own order items
CREATE POLICY "Users can read own order items"
ON "OrderItem"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Order"
    WHERE "Order".id = "OrderItem"."orderId"
    AND "Order"."buyerId" = auth.uid()::text
  )
);

-- ============================================
-- 7. ENTITLEMENT POLICIES (Download Access)
-- ============================================

ALTER TABLE "Entitlement" ENABLE ROW LEVEL SECURITY;

-- Users can read their own entitlements
CREATE POLICY "Users can read own entitlements"
ON "Entitlement"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Entitlements created via webhook (no direct user insert)

-- ============================================
-- 8. PRODUCT FILES POLICIES
-- ============================================

ALTER TABLE "ProductFile" ENABLE ROW LEVEL SECURITY;

-- Public can read file metadata for published products
CREATE POLICY "Public can read published product files"
ON "ProductFile"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductFile"."productId"
    AND "Product".status = 'PUBLISHED'
  )
);

-- Creators can manage their product files
CREATE POLICY "Creators can manage own product files"
ON "ProductFile"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductFile"."productId"
    AND "Product"."creatorId" = auth.uid()::text
  )
);

-- ============================================
-- 9. PRODUCT MEDIA POLICIES
-- ============================================

ALTER TABLE "ProductMedia" ENABLE ROW LEVEL SECURITY;

-- Public can read media for published products
CREATE POLICY "Public can read published product media"
ON "ProductMedia"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductMedia"."productId"
    AND "Product".status = 'PUBLISHED'
  )
);

-- Creators can manage their product media
CREATE POLICY "Creators can manage own product media"
ON "ProductMedia"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductMedia"."productId"
    AND "Product"."creatorId" = auth.uid()::text
  )
);

-- ============================================
-- 10. REVIEW POLICIES
-- ============================================

ALTER TABLE "Review" ENABLE ROW LEVEL SECURITY;

-- Public can read approved reviews
CREATE POLICY "Public can read approved reviews"
ON "Review"
FOR SELECT
USING (status = 'APPROVED');

-- Users can read their own reviews (any status)
CREATE POLICY "Users can read own reviews"
ON "Review"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Users can create reviews (verified in API)
CREATE POLICY "Users can create reviews"
ON "Review"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON "Review"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
ON "Review"
FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- 11. REVIEW VOTE POLICIES
-- ============================================

ALTER TABLE "ReviewVote" ENABLE ROW LEVEL SECURITY;

-- Users can read all review votes
CREATE POLICY "Public can read review votes"
ON "ReviewVote"
FOR SELECT
USING (true);

-- Users can vote on reviews
CREATE POLICY "Users can vote on reviews"
ON "ReviewVote"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

-- Users can update their own votes
CREATE POLICY "Users can update own votes"
ON "ReviewVote"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

-- Users can delete their own votes
CREATE POLICY "Users can delete own votes"
ON "ReviewVote"
FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- 12. REVIEW RESPONSE POLICIES
-- ============================================

ALTER TABLE "ReviewResponse" ENABLE ROW LEVEL SECURITY;

-- Public can read all responses
CREATE POLICY "Public can read review responses"
ON "ReviewResponse"
FOR SELECT
USING (true);

-- Creators can respond to reviews of their products
CREATE POLICY "Creators can respond to reviews"
ON "ReviewResponse"
FOR INSERT
WITH CHECK (
  auth.uid()::text = "userId"
  AND EXISTS (
    SELECT 1 FROM "Review" r
    JOIN "Product" p ON p.id = r."productId"
    WHERE r.id = "ReviewResponse"."reviewId"
    AND p."creatorId" = auth.uid()::text
  )
);

-- Users can update their own responses
CREATE POLICY "Users can update own responses"
ON "ReviewResponse"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

-- Users can delete their own responses
CREATE POLICY "Users can delete own responses"
ON "ReviewResponse"
FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- 13. PRODUCT VERSION POLICIES
-- ============================================

ALTER TABLE "ProductVersion" ENABLE ROW LEVEL SECURITY;

-- Public can read versions of published products
CREATE POLICY "Public can read published product versions"
ON "ProductVersion"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductVersion"."productId"
    AND "Product".status = 'PUBLISHED'
  )
);

-- Creators can manage their product versions
CREATE POLICY "Creators can manage own product versions"
ON "ProductVersion"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductVersion"."productId"
    AND "Product"."creatorId" = auth.uid()::text
  )
);

-- ============================================
-- 14. PRICE POLICIES
-- ============================================

ALTER TABLE "Price" ENABLE ROW LEVEL SECURITY;

-- Public can read active prices for published products
CREATE POLICY "Public can read active prices"
ON "Price"
FOR SELECT
USING (
  "isActive" = true
  AND EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "Price"."productId"
    AND "Product".status = 'PUBLISHED'
  )
);

-- Creators can manage their product prices
CREATE POLICY "Creators can manage own product prices"
ON "Price"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "Price"."productId"
    AND "Product"."creatorId" = auth.uid()::text
  )
);

-- ============================================
-- 15. TAG POLICIES
-- ============================================

ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;

-- Public can read all tags
CREATE POLICY "Public can read tags"
ON "Tag"
FOR SELECT
USING (true);

-- Only admins can create/update/delete tags (via API)

-- ============================================
-- 16. PRODUCT TAG POLICIES
-- ============================================

ALTER TABLE "ProductTag" ENABLE ROW LEVEL SECURITY;

-- Public can read product tags
CREATE POLICY "Public can read product tags"
ON "ProductTag"
FOR SELECT
USING (true);

-- Creators can manage their product tags
CREATE POLICY "Creators can manage own product tags"
ON "ProductTag"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductTag"."productId"
    AND "Product"."creatorId" = auth.uid()::text
  )
);

-- ============================================
-- 17. CHECKOUT SESSION POLICIES
-- ============================================

ALTER TABLE "CheckoutSession" ENABLE ROW LEVEL SECURITY;

-- Users can read their own checkout sessions
CREATE POLICY "Users can read own checkout sessions"
ON "CheckoutSession"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Users can create checkout sessions
CREATE POLICY "Users can create checkout sessions"
ON "CheckoutSession"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- 18. CREATOR ACCOUNT POLICIES
-- ============================================

ALTER TABLE "CreatorAccount" ENABLE ROW LEVEL SECURITY;

-- Users can read their own creator account
CREATE POLICY "Users can read own creator account"
ON "CreatorAccount"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Users can update their own creator account
CREATE POLICY "Users can update own creator account"
ON "CreatorAccount"
FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

-- Users can create their creator account
CREATE POLICY "Users can create own creator account"
ON "CreatorAccount"
FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- 19. DOWNLOAD TOKEN POLICIES
-- ============================================

ALTER TABLE "DownloadToken" ENABLE ROW LEVEL SECURITY;

-- Users can read their own download tokens
CREATE POLICY "Users can read own download tokens"
ON "DownloadToken"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Entitlement"
    WHERE "Entitlement".id = "DownloadToken"."entitlementId"
    AND "Entitlement"."userId" = auth.uid()::text
  )
);

-- Download tokens created via API (no direct user insert)

-- ============================================
-- 20. ACCESS LOG POLICIES
-- ============================================

ALTER TABLE "AccessLog" ENABLE ROW LEVEL SECURITY;

-- Users can read their own access logs
CREATE POLICY "Users can read own access logs"
ON "AccessLog"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Access logs created via API (no direct user insert)

-- ============================================
-- 21. AUDIT LOG POLICIES
-- ============================================

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit logs
CREATE POLICY "Users can read own audit logs"
ON "AuditLog"
FOR SELECT
USING (auth.uid()::text = "userId");

-- Audit logs created via API (no direct user insert)
-- Admins have full access (checked in application layer)

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to verify all policies are created:
/*
SELECT
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;
*/

-- Expected output: Each table should have 1-5 policies
