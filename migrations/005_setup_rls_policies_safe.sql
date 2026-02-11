-- ============================================
-- SUPABASE RLS POLICIES - SAFE VERSION
-- ============================================
-- This version drops existing policies before creating new ones
-- Safe to run multiple times

-- ============================================
-- 1. USER TABLE POLICIES
-- ============================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON "User";
DROP POLICY IF EXISTS "Users can update own profile" ON "User";
DROP POLICY IF EXISTS "Public can read basic user info" ON "User";

CREATE POLICY "Users can read own profile"
ON "User" FOR SELECT
USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile"
ON "User" FOR UPDATE
USING (auth.uid()::text = id)
WITH CHECK (auth.uid()::text = id);

CREATE POLICY "Public can read basic user info"
ON "User" FOR SELECT
USING (true);

-- ============================================
-- 2. PROFILE TABLE POLICIES
-- ============================================

ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON "Profile";
DROP POLICY IF EXISTS "Users can update own profile" ON "Profile";
DROP POLICY IF EXISTS "Users can insert own profile" ON "Profile";
DROP POLICY IF EXISTS "Public can read profiles" ON "Profile";

CREATE POLICY "Users can read own profile"
ON "Profile" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can update own profile"
ON "Profile" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can insert own profile"
ON "Profile" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Public can read profiles"
ON "Profile" FOR SELECT
USING (true);

-- ============================================
-- 3. USER ROLES POLICIES
-- ============================================

ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own roles" ON "UserRole";

CREATE POLICY "Users can read own roles"
ON "UserRole" FOR SELECT
USING (auth.uid()::text = "userId");

-- ============================================
-- 4. PRODUCT POLICIES
-- ============================================

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published products" ON "Product";
DROP POLICY IF EXISTS "Creators can read own products" ON "Product";
DROP POLICY IF EXISTS "Creators can insert own products" ON "Product";
DROP POLICY IF EXISTS "Creators can update own products" ON "Product";
DROP POLICY IF EXISTS "Creators can delete own products" ON "Product";

CREATE POLICY "Public can read published products"
ON "Product" FOR SELECT
USING (status = 'PUBLISHED');

CREATE POLICY "Creators can read own products"
ON "Product" FOR SELECT
USING (auth.uid()::text = "creatorId");

CREATE POLICY "Creators can insert own products"
ON "Product" FOR INSERT
WITH CHECK (auth.uid()::text = "creatorId");

CREATE POLICY "Creators can update own products"
ON "Product" FOR UPDATE
USING (auth.uid()::text = "creatorId")
WITH CHECK (auth.uid()::text = "creatorId");

CREATE POLICY "Creators can delete own products"
ON "Product" FOR DELETE
USING (auth.uid()::text = "creatorId");

-- ============================================
-- 5. ORDER POLICIES
-- ============================================

ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own orders" ON "Order";
DROP POLICY IF EXISTS "Creators can read orders for their products" ON "Order";

CREATE POLICY "Users can read own orders"
ON "Order" FOR SELECT
USING (auth.uid()::text = "buyerId");

CREATE POLICY "Creators can read orders for their products"
ON "Order" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "OrderItem" oi
    JOIN "Product" p ON p.id = oi."productId"
    WHERE oi."orderId" = "Order".id
    AND p."creatorId" = auth.uid()::text
  )
);

-- ============================================
-- 6. ORDER ITEM POLICIES
-- ============================================

ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own order items" ON "OrderItem";

CREATE POLICY "Users can read own order items"
ON "OrderItem" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Order"
    WHERE "Order".id = "OrderItem"."orderId"
    AND "Order"."buyerId" = auth.uid()::text
  )
);

-- ============================================
-- 7. ENTITLEMENT POLICIES
-- ============================================

ALTER TABLE "Entitlement" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own entitlements" ON "Entitlement";

CREATE POLICY "Users can read own entitlements"
ON "Entitlement" FOR SELECT
USING (auth.uid()::text = "userId");

-- ============================================
-- 8. PRODUCT FILES POLICIES
-- ============================================

ALTER TABLE "ProductFile" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published product files" ON "ProductFile";
DROP POLICY IF EXISTS "Creators can manage own product files" ON "ProductFile";

CREATE POLICY "Public can read published product files"
ON "ProductFile" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductFile"."productId"
    AND "Product".status = 'PUBLISHED'
  )
);

CREATE POLICY "Creators can manage own product files"
ON "ProductFile" FOR ALL
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

DROP POLICY IF EXISTS "Public can read published product media" ON "ProductMedia";
DROP POLICY IF EXISTS "Creators can manage own product media" ON "ProductMedia";

CREATE POLICY "Public can read published product media"
ON "ProductMedia" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductMedia"."productId"
    AND "Product".status = 'PUBLISHED'
  )
);

CREATE POLICY "Creators can manage own product media"
ON "ProductMedia" FOR ALL
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

DROP POLICY IF EXISTS "Public can read approved reviews" ON "Review";
DROP POLICY IF EXISTS "Users can read own reviews" ON "Review";
DROP POLICY IF EXISTS "Users can create reviews" ON "Review";
DROP POLICY IF EXISTS "Users can update own reviews" ON "Review";
DROP POLICY IF EXISTS "Users can delete own reviews" ON "Review";

CREATE POLICY "Public can read approved reviews"
ON "Review" FOR SELECT
USING (status = 'APPROVED');

CREATE POLICY "Users can read own reviews"
ON "Review" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create reviews"
ON "Review" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own reviews"
ON "Review" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own reviews"
ON "Review" FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- 11. REVIEW VOTE POLICIES
-- ============================================

ALTER TABLE "ReviewVote" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read review votes" ON "ReviewVote";
DROP POLICY IF EXISTS "Users can vote on reviews" ON "ReviewVote";
DROP POLICY IF EXISTS "Users can update own votes" ON "ReviewVote";
DROP POLICY IF EXISTS "Users can delete own votes" ON "ReviewVote";

CREATE POLICY "Public can read review votes"
ON "ReviewVote" FOR SELECT
USING (true);

CREATE POLICY "Users can vote on reviews"
ON "ReviewVote" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can update own votes"
ON "ReviewVote" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own votes"
ON "ReviewVote" FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- 12. REVIEW RESPONSE POLICIES
-- ============================================

ALTER TABLE "ReviewResponse" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read review responses" ON "ReviewResponse";
DROP POLICY IF EXISTS "Creators can respond to reviews" ON "ReviewResponse";
DROP POLICY IF EXISTS "Users can update own responses" ON "ReviewResponse";
DROP POLICY IF EXISTS "Users can delete own responses" ON "ReviewResponse";

CREATE POLICY "Public can read review responses"
ON "ReviewResponse" FOR SELECT
USING (true);

CREATE POLICY "Creators can respond to reviews"
ON "ReviewResponse" FOR INSERT
WITH CHECK (
  auth.uid()::text = "userId"
  AND EXISTS (
    SELECT 1 FROM "Review" r
    JOIN "Product" p ON p.id = r."productId"
    WHERE r.id = "ReviewResponse"."reviewId"
    AND p."creatorId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update own responses"
ON "ReviewResponse" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can delete own responses"
ON "ReviewResponse" FOR DELETE
USING (auth.uid()::text = "userId");

-- ============================================
-- 13. PRODUCT VERSION POLICIES
-- ============================================

ALTER TABLE "ProductVersion" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published product versions" ON "ProductVersion";
DROP POLICY IF EXISTS "Creators can manage own product versions" ON "ProductVersion";

CREATE POLICY "Public can read published product versions"
ON "ProductVersion" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "ProductVersion"."productId"
    AND "Product".status = 'PUBLISHED'
  )
);

CREATE POLICY "Creators can manage own product versions"
ON "ProductVersion" FOR ALL
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

DROP POLICY IF EXISTS "Public can read active prices" ON "Price";
DROP POLICY IF EXISTS "Creators can manage own product prices" ON "Price";

CREATE POLICY "Public can read active prices"
ON "Price" FOR SELECT
USING (
  "isActive" = true
  AND EXISTS (
    SELECT 1 FROM "Product"
    WHERE "Product".id = "Price"."productId"
    AND "Product".status = 'PUBLISHED'
  )
);

CREATE POLICY "Creators can manage own product prices"
ON "Price" FOR ALL
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

DROP POLICY IF EXISTS "Public can read tags" ON "Tag";

CREATE POLICY "Public can read tags"
ON "Tag" FOR SELECT
USING (true);

-- ============================================
-- 16. PRODUCT TAG POLICIES
-- ============================================

ALTER TABLE "ProductTag" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read product tags" ON "ProductTag";
DROP POLICY IF EXISTS "Creators can manage own product tags" ON "ProductTag";

CREATE POLICY "Public can read product tags"
ON "ProductTag" FOR SELECT
USING (true);

CREATE POLICY "Creators can manage own product tags"
ON "ProductTag" FOR ALL
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

DROP POLICY IF EXISTS "Users can read own checkout sessions" ON "CheckoutSession";
DROP POLICY IF EXISTS "Users can create checkout sessions" ON "CheckoutSession";

CREATE POLICY "Users can read own checkout sessions"
ON "CheckoutSession" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can create checkout sessions"
ON "CheckoutSession" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- 18. CREATOR ACCOUNT POLICIES
-- ============================================

ALTER TABLE "CreatorAccount" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own creator account" ON "CreatorAccount";
DROP POLICY IF EXISTS "Users can update own creator account" ON "CreatorAccount";
DROP POLICY IF EXISTS "Users can create own creator account" ON "CreatorAccount";

CREATE POLICY "Users can read own creator account"
ON "CreatorAccount" FOR SELECT
USING (auth.uid()::text = "userId");

CREATE POLICY "Users can update own creator account"
ON "CreatorAccount" FOR UPDATE
USING (auth.uid()::text = "userId")
WITH CHECK (auth.uid()::text = "userId");

CREATE POLICY "Users can create own creator account"
ON "CreatorAccount" FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

-- ============================================
-- 19. DOWNLOAD TOKEN POLICIES
-- ============================================

ALTER TABLE "DownloadToken" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own download tokens" ON "DownloadToken";

CREATE POLICY "Users can read own download tokens"
ON "DownloadToken" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Entitlement"
    WHERE "Entitlement".id = "DownloadToken"."entitlementId"
    AND "Entitlement"."userId" = auth.uid()::text
  )
);

-- ============================================
-- 20. ACCESS LOG POLICIES
-- ============================================

ALTER TABLE "AccessLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own access logs" ON "AccessLog";

CREATE POLICY "Users can read own access logs"
ON "AccessLog" FOR SELECT
USING (auth.uid()::text = "userId");

-- ============================================
-- 21. AUDIT LOG POLICIES
-- ============================================

ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own audit logs" ON "AuditLog";

CREATE POLICY "Users can read own audit logs"
ON "AuditLog" FOR SELECT
USING (auth.uid()::text = "userId");

-- ============================================
-- VERIFICATION QUERY
-- ============================================

SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
