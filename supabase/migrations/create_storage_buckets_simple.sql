-- ===================================================================
-- SUPABASE STORAGE BUCKETS - SIMPLE VERSION
-- ===================================================================
-- Creates 3 storage buckets for SHUB-V1
-- Note: Policies must be added through Supabase Dashboard UI
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
-- VERIFICATION
-- ===================================================================
-- Run this to verify buckets were created successfully:
SELECT
  id,
  name,
  public,
  file_size_limit,
  array_length(allowed_mime_types, 1) as mime_types_count,
  created_at
FROM storage.buckets
WHERE id IN ('product-files', 'product-media', 'user-avatars')
ORDER BY id;

-- ===================================================================
-- SUCCESS!
-- ===================================================================
-- ✅ Buckets created successfully!
--
-- 📋 NEXT STEPS:
-- 1. Add RLS policies through Supabase Dashboard → Storage → [Bucket] → Policies
-- 2. See SUPABASE_STORAGE_POLICIES.md for policy configurations
-- ===================================================================
