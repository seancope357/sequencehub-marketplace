-- Supabase Storage Policies
-- Row Level Security policies for file storage buckets
-- Date: 2026-01-31

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-files', 'product-files', false),
  ('product-media', 'product-media', true),
  ('user-avatars', 'user-avatars', true);

-- ============================================
-- PRODUCT FILES BUCKET (Private)
-- ============================================

-- Users can SELECT (download) files they have entitlements for
CREATE POLICY "Entitled users can read product files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-files' AND
  (
    -- Check if user has active entitlement
    EXISTS (
      SELECT 1 FROM public.entitlements e
      JOIN public.product_files pf ON pf.version_id = e.version_id
      WHERE pf.storage_key = name
      AND e.user_id = auth.uid()
      AND e.is_active = true
    )
    OR
    -- Or is the creator of the product
    EXISTS (
      SELECT 1 FROM public.product_files pf
      JOIN public.product_versions pv ON pv.id = pf.version_id
      JOIN public.products p ON p.id = pv.product_id
      WHERE pf.storage_key = name
      AND p.creator_id = auth.uid()
    )
    OR
    -- Or is admin
    auth.has_role('ADMIN')
  )
);

-- Creators can INSERT (upload) product files for their products
CREATE POLICY "Creators can upload product files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-files' AND
  (
    auth.has_role('CREATOR') OR
    auth.has_role('ADMIN')
  )
);

-- Creators can UPDATE product files for their products
CREATE POLICY "Creators can update product files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-files' AND
  (
    EXISTS (
      SELECT 1 FROM public.product_files pf
      JOIN public.product_versions pv ON pv.id = pf.version_id
      JOIN public.products p ON p.id = pv.product_id
      WHERE pf.storage_key = name
      AND p.creator_id = auth.uid()
    )
    OR
    auth.has_role('ADMIN')
  )
);

-- Creators can DELETE product files for their products
CREATE POLICY "Creators can delete product files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-files' AND
  (
    EXISTS (
      SELECT 1 FROM public.product_files pf
      JOIN public.product_versions pv ON pv.id = pf.version_id
      JOIN public.products p ON p.id = pv.product_id
      WHERE pf.storage_key = name
      AND p.creator_id = auth.uid()
    )
    OR
    auth.has_role('ADMIN')
  )
);

-- ============================================
-- PRODUCT MEDIA BUCKET (Public read)
-- ============================================

-- Anyone can SELECT (view) product media
CREATE POLICY "Public can read product media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

-- Creators can INSERT product media for their products
CREATE POLICY "Creators can upload product media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-media' AND
  (
    auth.has_role('CREATOR') OR
    auth.has_role('ADMIN')
  )
);

-- Creators can UPDATE product media for their products
CREATE POLICY "Creators can update product media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.product_media pm
      JOIN public.products p ON p.id = pm.product_id
      WHERE pm.storage_key = name
      AND p.creator_id = auth.uid()
    )
    OR
    auth.has_role('ADMIN')
  )
);

-- Creators can DELETE product media for their products
CREATE POLICY "Creators can delete product media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.product_media pm
      JOIN public.products p ON p.id = pm.product_id
      WHERE pm.storage_key = name
      AND p.creator_id = auth.uid()
    )
    OR
    auth.has_role('ADMIN')
  )
);

-- ============================================
-- USER AVATARS BUCKET (Public read)
-- ============================================

-- Anyone can SELECT (view) user avatars
CREATE POLICY "Public can read user avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');

-- Users can INSERT their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can UPDATE their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can DELETE their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- BUCKET CONFIGURATION
-- ============================================

-- Set file size limits
UPDATE storage.buckets
SET file_size_limit = 524288000  -- 500MB
WHERE id = 'product-files';

UPDATE storage.buckets
SET file_size_limit = 10485760   -- 10MB
WHERE id = 'product-media';

UPDATE storage.buckets
SET file_size_limit = 2097152    -- 2MB
WHERE id = 'user-avatars';

-- Set allowed MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/octet-stream',
  'application/x-fseq',
  'text/xml',
  'application/xml',
  'application/x-xsq',
  'audio/mpeg',
  'audio/wav',
  'video/mp4'
]
WHERE id = 'product-files';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm'
]
WHERE id = 'product-media';

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/png',
  'image/webp'
]
WHERE id = 'user-avatars';

-- Storage policies complete
SELECT 'Supabase Storage policies configured successfully!' AS status;
