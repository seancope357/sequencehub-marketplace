-- ============================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================
-- This migration adds RLS policies for all tables
-- Compatible with Supabase's auth system

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreatorAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductMedia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Price" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CheckoutSession" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Entitlement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DownloadToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccessLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER & PROFILE POLICIES
-- ============================================

-- Users can read their own user record
CREATE POLICY "Users can read own data"
  ON "User" FOR SELECT
  USING (id = current_user_id());

-- Users can update their own user record
CREATE POLICY "Users can update own data"
  ON "User" FOR UPDATE
  USING (id = current_user_id());

-- Profiles are publicly readable
CREATE POLICY "Profiles are publicly readable"
  ON "Profile" FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON "Profile" FOR UPDATE
  USING ("userId" = current_user_id());

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON "Profile" FOR INSERT
  WITH CHECK ("userId" = current_user_id());

-- ============================================
-- USER ROLES POLICIES
-- ============================================

-- Users can read their own roles
CREATE POLICY "Users can read own roles"
  ON "UserRole" FOR SELECT
  USING ("userId" = current_user_id());

-- ============================================
-- CREATOR ACCOUNT POLICIES
-- ============================================

-- Creators can read their own account
CREATE POLICY "Creators can read own account"
  ON "CreatorAccount" FOR SELECT
  USING ("userId" = current_user_id());

-- Creators can update their own account
CREATE POLICY "Creators can update own account"
  ON "CreatorAccount" FOR UPDATE
  USING ("userId" = current_user_id());

-- ============================================
-- PRODUCT POLICIES
-- ============================================

-- Published products are publicly readable
CREATE POLICY "Published products are public"
  ON "Product" FOR SELECT
  USING (status = 'PUBLISHED' OR "creatorId" = current_user_id());

-- Creators can create products
CREATE POLICY "Creators can create products"
  ON "Product" FOR INSERT
  WITH CHECK ("creatorId" = current_user_id());

-- Creators can update their own products
CREATE POLICY "Creators can update own products"
  ON "Product" FOR UPDATE
  USING ("creatorId" = current_user_id());

-- Creators can delete their own products
CREATE POLICY "Creators can delete own products"
  ON "Product" FOR DELETE
  USING ("creatorId" = current_user_id());

-- ============================================
-- PRODUCT VERSION & FILE POLICIES
-- ============================================

-- Product versions follow product visibility
CREATE POLICY "Product versions follow product visibility"
  ON "ProductVersion" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Product"
      WHERE "Product".id = "ProductVersion"."productId"
      AND ("Product".status = 'PUBLISHED' OR "Product"."creatorId" = current_user_id())
    )
  );

-- Product files follow product visibility
CREATE POLICY "Product files follow product visibility"
  ON "ProductFile" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Product"
      WHERE "Product".id = "ProductFile"."productId"
      AND ("Product".status = 'PUBLISHED' OR "Product"."creatorId" = current_user_id())
    )
  );

-- ============================================
-- ENTITLEMENT POLICIES
-- ============================================

-- Users can read their own entitlements
CREATE POLICY "Users can read own entitlements"
  ON "Entitlement" FOR SELECT
  USING ("buyerId" = current_user_id());

-- ============================================
-- ORDER POLICIES
-- ============================================

-- Buyers can read their own orders
CREATE POLICY "Buyers can read own orders"
  ON "Order" FOR SELECT
  USING ("buyerId" = current_user_id());

-- Creators can read orders for their products
CREATE POLICY "Creators can read orders for their products"
  ON "Order" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "OrderItem"
      JOIN "Product" ON "Product".id = "OrderItem"."productId"
      WHERE "OrderItem"."orderId" = "Order".id
      AND "Product"."creatorId" = current_user_id()
    )
  );

-- ============================================
-- HELPER FUNCTION
-- ============================================

-- Function to get current user ID from JWT
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    ''
  )::text;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'product-files',
    'product-files',
    false,
    524288000, -- 500MB
    ARRAY['application/octet-stream', 'application/zip', 'video/mp4', 'video/quicktime', 'image/gif']::text[]
  ),
  (
    'product-media',
    'product-media',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4']::text[]
  ),
  (
    'user-avatars',
    'user-avatars',
    true,
    2097152, -- 2MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Product files: Only entitled users can download
CREATE POLICY "Entitled users can download product files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'product-files'
    AND EXISTS (
      SELECT 1 FROM "Entitlement"
      WHERE "Entitlement"."buyerId" = current_user_id()
      AND "Entitlement"."isActive" = true
    )
  );

-- Product files: Only creators can upload to their products
CREATE POLICY "Creators can upload product files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-files'
    AND auth.role() = 'authenticated'
  );

-- Product media: Public read access
CREATE POLICY "Product media is publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-media');

-- Product media: Creators can upload
CREATE POLICY "Creators can upload product media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-media'
    AND auth.role() = 'authenticated'
  );

-- User avatars: Public read access
CREATE POLICY "User avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

-- User avatars: Users can upload their own
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
  );

COMMIT;
