# Supabase Storage Buckets Setup Guide

This guide will help you set up the required storage buckets for SHUB-V1 in your Supabase project.

## Overview

SHUB-V1 requires 3 storage buckets:

| Bucket | Type | Size Limit | Purpose |
|--------|------|------------|---------|
| `product-files` | Private | 500MB | FSEQ/XSQ sequence files (downloadable only by purchasers) |
| `product-media` | Public | 50MB | Product images, cover photos, previews |
| `user-avatars` | Public | 5MB | User profile pictures |

---

## Option 1: Automatic Setup (SQL Migration) - RECOMMENDED

### Step 1: Open Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select your project: **fhrregyvsmwpfkpnkocy**
3. Click on **SQL Editor** in the left sidebar

### Step 2: Run Migration

1. Click **New query** button
2. Copy the entire contents of `supabase/migrations/create_storage_buckets.sql`
3. Paste into the SQL editor
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Creation

Run this verification query:

```sql
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('product-files', 'product-media', 'user-avatars');
```

You should see 3 rows returned with your bucket configurations.

---

## Option 2: Manual Setup (Dashboard UI)

If you prefer to create buckets manually through the UI:

### Step 1: Access Storage

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click on **Storage** in the left sidebar

### Step 2: Create product-files Bucket

1. Click **Create a new bucket**
2. Fill in the details:
   - **Name**: `product-files`
   - **Public bucket**: ❌ Unchecked (Private)
   - **File size limit**: `524288000` (500MB in bytes)
   - **Allowed MIME types**:
     ```
     application/octet-stream
     application/xml
     text/xml
     video/mp4
     audio/mpeg
     audio/mp3
     ```
3. Click **Create bucket**

### Step 3: Create product-media Bucket

1. Click **Create a new bucket**
2. Fill in the details:
   - **Name**: `product-media`
   - **Public bucket**: ✅ Checked (Public)
   - **File size limit**: `52428800` (50MB in bytes)
   - **Allowed MIME types**:
     ```
     image/jpeg
     image/jpg
     image/png
     image/webp
     image/gif
     video/mp4
     ```
3. Click **Create bucket**

### Step 4: Create user-avatars Bucket

1. Click **Create a new bucket**
2. Fill in the details:
   - **Name**: `user-avatars`
   - **Public bucket**: ✅ Checked (Public)
   - **File size limit**: `5242880` (5MB in bytes)
   - **Allowed MIME types**:
     ```
     image/jpeg
     image/jpg
     image/png
     image/webp
     ```
3. Click **Create bucket**

---

## Step 5: Configure RLS Policies (IMPORTANT)

Row Level Security (RLS) policies control who can access files in each bucket.

### Option A: Use SQL Migration (Recommended)

The SQL migration in `supabase/migrations/create_storage_buckets.sql` includes all necessary RLS policies. If you ran the migration in Option 1, **you're done!**

### Option B: Manual Policy Setup

If you created buckets manually, you'll need to set up RLS policies:

1. Go to **Storage** → Select a bucket → **Policies** tab
2. Click **Create policy**
3. Add policies according to the rules below

#### product-files Policies (Private):

1. **SELECT**: "Buyers can download purchased files"
   - Allowed for: `authenticated`
   - Using expression: Check entitlements

2. **INSERT**: "Creators can upload product files"
   - Allowed for: `authenticated`
   - With check: User owns the product

3. **UPDATE/DELETE**: "Creators can manage their files"
   - Allowed for: `authenticated`
   - Using expression: User owns the product

#### product-media Policies (Public):

1. **SELECT**: "Anyone can view product media"
   - Allowed for: `public`
   - No restrictions

2. **INSERT/UPDATE/DELETE**: "Creators can manage their media"
   - Allowed for: `authenticated`
   - Using expression: User owns the product

#### user-avatars Policies (Public):

1. **SELECT**: "Anyone can view avatars"
   - Allowed for: `public`
   - No restrictions

2. **INSERT/UPDATE/DELETE**: "Users can manage their avatar"
   - Allowed for: `authenticated`
   - Using expression: Folder name matches user ID

**Note**: For exact SQL policy definitions, see `supabase/migrations/create_storage_buckets.sql`

---

## Step 6: Verify Setup

### Test Bucket Access

Run this test to verify buckets are accessible:

```bash
node scripts/test-supabase-storage.js
```

### Check in Dashboard

1. Go to **Storage** in Supabase Dashboard
2. You should see 3 buckets:
   - ✅ product-files (🔒 Private)
   - ✅ product-media (🌐 Public)
   - ✅ user-avatars (🌐 Public)

3. Click on each bucket to verify:
   - Size limits are correct
   - MIME types are configured
   - Policies are active

---

## Troubleshooting

### Issue: "Policies are preventing uploads"

**Solution**: Ensure RLS policies are properly configured. Check the policies tab for each bucket and verify the CREATE POLICY statements ran successfully.

### Issue: "File size exceeded"

**Solution**: Verify the file size limits:
- product-files: 500MB (524288000 bytes)
- product-media: 50MB (52428800 bytes)
- user-avatars: 5MB (5242880 bytes)

### Issue: "Invalid MIME type"

**Solution**: Ensure the file type is in the allowed MIME types list for that bucket. You can update this in the bucket settings.

### Issue: "Cannot access files from application"

**Solution**:
1. Verify Supabase credentials in `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Ensure the Supabase client is initialized correctly
3. Check RLS policies allow the current user to access files

---

## Getting Valid Supabase API Keys

If you need to update your Supabase API keys:

1. Go to https://supabase.com/dashboard
2. Select your project: **fhrregyvsmwpfkpnkocy**
3. Go to **Settings** → **API**
4. Copy the following keys:
   - **Project URL**: → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (keep secret!) → `SUPABASE_SERVICE_ROLE_KEY`
5. Update `.env.local` with the real keys
6. Restart your dev server

**Note**: The service_role key should start with `eyJ...` (JWT format)

---

## Next Steps

After setting up storage buckets:

1. ✅ Test file uploads in your application
2. ✅ Configure Stripe API keys (see STRIPE_SETUP.md)
3. ✅ Deploy to production

---

## File Structure in Buckets

### product-files/
```
{productId}/
  ├── {fileId}.fseq
  ├── {fileId}.xsq
  └── {fileId}.xml
```

### product-media/
```
{productId}/
  ├── cover.jpg
  ├── gallery-1.jpg
  ├── gallery-2.jpg
  └── preview.mp4
```

### user-avatars/
```
{userId}/
  └── avatar.jpg
```

---

## Support

If you encounter issues:

1. Check Supabase Dashboard → Storage → Logs
2. Check browser console for errors
3. Verify RLS policies in Supabase Dashboard
4. Check the application logs in `dev.log`

For more help, see the Supabase Storage documentation:
https://supabase.com/docs/guides/storage

---

**Last Updated**: February 16, 2026
**Status**: Ready for production use
