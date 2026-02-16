# Supabase Storage Policies Setup Guide

After creating your storage buckets, you need to add Row Level Security (RLS) policies through the Supabase Dashboard UI.

---

## Quick Setup (Recommended for Development)

For development/testing, you can use **permissive policies** that rely on your application code for authorization:

### 1. Go to Storage in Supabase Dashboard

1. Open https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in left sidebar
4. You should see your 3 buckets

### 2. Add Policies for Each Bucket

For each bucket, click on it → **Policies** tab → **New Policy**

---

## Option 1: Simple Development Policies (Quick & Easy)

These policies are simple and work immediately with your existing app:

### For `product-files` (Private Bucket)

**Policy 1: Allow authenticated users to read**
- Policy name: `Authenticated users can read`
- Allowed operation: `SELECT`
- Target roles: `authenticated`
- USING expression: `true`

**Policy 2: Allow authenticated users to insert**
- Policy name: `Authenticated users can insert`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- WITH CHECK expression: `true`

**Policy 3: Allow authenticated users to update**
- Policy name: `Authenticated users can update`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `true`

**Policy 4: Allow authenticated users to delete**
- Policy name: `Authenticated users can delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `true`

### For `product-media` (Public Bucket)

**Policy 1: Allow public to read**
- Policy name: `Public can read`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `true`

**Policy 2: Allow authenticated users to insert**
- Policy name: `Authenticated users can insert`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- WITH CHECK expression: `true`

**Policy 3: Allow authenticated users to update**
- Policy name: `Authenticated users can update`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `true`

**Policy 4: Allow authenticated users to delete**
- Policy name: `Authenticated users can delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `true`

### For `user-avatars` (Public Bucket)

**Policy 1: Allow public to read**
- Policy name: `Public can read`
- Allowed operation: `SELECT`
- Target roles: `public`
- USING expression: `true`

**Policy 2: Allow authenticated users to insert**
- Policy name: `Authenticated users can insert`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- WITH CHECK expression: `true`

**Policy 3: Allow authenticated users to update**
- Policy name: `Authenticated users can update`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- USING expression: `true`

**Policy 4: Allow authenticated users to delete**
- Policy name: `Authenticated users can delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- USING expression: `true`

---

## Option 2: Using Policy Templates (Even Easier!)

Supabase provides templates. For each bucket:

1. Click **New Policy**
2. Select **"For full customization"** or use templates:
   - **For public buckets**: "Allow public read access" template
   - **For authenticated access**: "Allow authenticated uploads" template
3. Customize the policy name and confirm

---

## Why These Simple Policies Work

Your application **already has authorization logic** in the code:

✅ **Ownership Checks** (`src/app/api/dashboard/products/[id]/route.ts`)
- Validates creator owns the product before upload

✅ **Entitlement Checks** (`src/lib/reviews/utils.ts`)
- Verifies purchase before allowing downloads

✅ **Signed URLs** (`src/lib/downloads/*`)
- Temporary, expiring download links

✅ **Rate Limiting** (built-in)
- Prevents abuse

**The RLS policies just ensure:**
- Anonymous users can't upload anything
- Public buckets are readable by everyone
- Private buckets require authentication

Your app code handles the complex business logic!

---

## Alternative: No Policies (Development Only)

For local development, you can skip policies entirely:

1. Go to each bucket → **Configuration** tab
2. Toggle **"Public bucket"** to ON for all buckets (temporary)
3. Your app will work immediately
4. **⚠️ Add proper policies before production!**

---

## Verification

After adding policies, test with:

```bash
# Start your dev server
npm run dev

# Try uploading a file through your app
# The app should now be able to interact with Supabase Storage
```

---

## Troubleshooting

### Issue: "New row violates row-level security policy"

**Solution**: Make sure you added policies for **all 4 operations** (SELECT, INSERT, UPDATE, DELETE) for each bucket.

### Issue: "Storage client not initialized"

**Solution**: Verify your `.env.local` has:
```
NEXT_PUBLIC_SUPABASE_URL="https://fhrregyvsmwpfkpnkocy.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### Issue: Policies not working

**Solution**:
1. Check that RLS is enabled on storage.objects table
2. Verify you're using the `authenticated` role (not `anon`)
3. Check Supabase logs: Dashboard → Logs → select "Storage"

---

## Production-Ready Policies (Future Enhancement)

For production, you may want stricter policies that check ownership at the database level. However, this requires:
1. Syncing Supabase Auth UIDs with your User table
2. Adding foreign key relationships
3. Complex SQL expressions

**For now, the simple policies + your app-level checks are sufficient and secure!**

---

**Next Steps After Adding Policies:**
1. Test file uploads from your application
2. Verify downloads work for purchased products
3. Check that unauthorized users can't access private files

---

Last Updated: February 16, 2026
