-- ===================================================================
-- SUPABASE STORAGE BUCKETS MIGRATION
-- ===================================================================
-- Creates 3 storage buckets for SHUB-V1:
-- 1. product-files (private, 500MB) - FSEQ/XSQ sequence files
-- 2. product-media (public, 50MB) - Product images/previews
-- 3. user-avatars (public, 5MB) - User profile pictures
--
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ===================================================================

-- Create product-files bucket (PRIVATE)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-files',
  'product-files',
  false, -- Private bucket
  524288000, -- 500MB in bytes
  ARRAY[
    'application/octet-stream', -- FSEQ files
    'application/xml', -- XSQ files
    'text/xml',
    'video/mp4', -- Preview videos
    'audio/mpeg', -- Audio files
    'audio/mp3'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create product-media bucket (PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  true, -- Public bucket
  52428800, -- 50MB in bytes
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Create user-avatars bucket (PUBLIC)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  true, -- Public bucket
  5242880, -- 5MB in bytes
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ===================================================================
-- RLS POLICIES FOR PRODUCT-FILES (PRIVATE BUCKET)
-- ===================================================================

-- Allow creators to upload files to their own products
CREATE POLICY "Creators can upload product files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Product"
    WHERE "creatorId" = auth.uid()
  )
);

-- Allow creators to update their own product files
CREATE POLICY "Creators can update their product files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Product"
    WHERE "creatorId" = auth.uid()
  )
);

-- Allow creators to delete their own product files
CREATE POLICY "Creators can delete their product files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-files' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Product"
    WHERE "creatorId" = auth.uid()
  )
);

-- Allow buyers to download files they purchased
CREATE POLICY "Buyers can download purchased files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files' AND
  (storage.foldername(name))[1] IN (
    SELECT "productId"::text FROM "Entitlement"
    WHERE "userId" = auth.uid() AND "isActive" = true
  )
);

-- ===================================================================
-- RLS POLICIES FOR PRODUCT-MEDIA (PUBLIC BUCKET)
-- ===================================================================

-- Allow anyone to view product media (public bucket)
CREATE POLICY "Anyone can view product media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'product-media');

-- Allow creators to upload media for their products
CREATE POLICY "Creators can upload product media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-media' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Product"
    WHERE "creatorId" = auth.uid()
  )
);

-- Allow creators to update their product media
CREATE POLICY "Creators can update product media"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-media' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Product"
    WHERE "creatorId" = auth.uid()
  )
);

-- Allow creators to delete their product media
CREATE POLICY "Creators can delete product media"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-media' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM "Product"
    WHERE "creatorId" = auth.uid()
  )
);

-- ===================================================================
-- RLS POLICIES FOR USER-AVATARS (PUBLIC BUCKET)
-- ===================================================================

-- Allow anyone to view user avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

-- Allow users to upload their own avatar
CREATE POLICY "Users can upload their avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own avatar
CREATE POLICY "Users can update their avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ===================================================================
-- VERIFICATION QUERY
-- ===================================================================
-- Run this to verify buckets were created successfully:
--
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id IN ('product-files', 'product-media', 'user-avatars');
-- ===================================================================
