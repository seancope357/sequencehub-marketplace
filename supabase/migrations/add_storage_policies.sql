-- ===================================================================
-- SUPABASE STORAGE POLICIES - AUTO SETUP
-- ===================================================================
-- This script adds all necessary RLS policies for the 3 storage buckets
-- It will skip policies that already exist
-- ===================================================================

-- ===================================================================
-- PRODUCT-FILES BUCKET (Private)
-- ===================================================================

-- Drop existing policies if they exist (to ensure clean state)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Authenticated users can read product files" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can insert product files" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update product files" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete product files" ON storage.objects;
    DROP POLICY IF EXISTS "Service role full access product files" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create policies for product-files
CREATE POLICY "Authenticated users can read product files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'product-files');

CREATE POLICY "Authenticated users can insert product files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-files');

CREATE POLICY "Authenticated users can update product files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-files');

CREATE POLICY "Authenticated users can delete product files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-files');

CREATE POLICY "Service role full access product files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'product-files');

-- ===================================================================
-- PRODUCT-MEDIA BUCKET (Public)
-- ===================================================================

-- Drop existing policies if they exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can read product media" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can insert product media" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update product media" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete product media" ON storage.objects;
    DROP POLICY IF EXISTS "Service role full access product media" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create policies for product-media
CREATE POLICY "Public can read product media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-media');

CREATE POLICY "Authenticated users can insert product media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-media');

CREATE POLICY "Authenticated users can update product media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-media');

CREATE POLICY "Authenticated users can delete product media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-media');

CREATE POLICY "Service role full access product media"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'product-media');

-- ===================================================================
-- USER-AVATARS BUCKET (Public)
-- ===================================================================

-- Drop existing policies if they exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can read user avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can insert user avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can update user avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can delete user avatars" ON storage.objects;
    DROP POLICY IF EXISTS "Service role full access user avatars" ON storage.objects;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Create policies for user-avatars
CREATE POLICY "Public can read user avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users can insert user avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users can update user avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'user-avatars');

CREATE POLICY "Authenticated users can delete user avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'user-avatars');

CREATE POLICY "Service role full access user avatars"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'user-avatars');

-- ===================================================================
-- VERIFICATION
-- ===================================================================

-- Check all policies were created
SELECT
    schemaname,
    tablename,
    policyname,
    CASE
        WHEN roles = '{public}' THEN 'public'
        WHEN roles = '{authenticated}' THEN 'authenticated'
        WHEN roles = '{service_role}' THEN 'service_role'
        ELSE roles::text
    END as target_role,
    cmd as operation
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (
    policyname LIKE '%product files%'
    OR policyname LIKE '%product media%'
    OR policyname LIKE '%user avatars%'
  )
ORDER BY policyname;

-- ===================================================================
-- SUCCESS MESSAGE
-- ===================================================================
-- ✅ All storage policies have been created successfully!
--
-- You should see 15 policies total (5 per bucket):
-- - product-files: 5 policies (4 for authenticated + 1 for service_role)
-- - product-media: 5 policies (4 for authenticated + 1 for public + 1 for service_role)
-- - user-avatars: 5 policies (4 for authenticated + 1 for public + 1 for service_role)
--
-- 📋 NEXT STEP:
-- Test file uploads from your application!
-- ===================================================================
