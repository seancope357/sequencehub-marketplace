# RLS (Row Level Security) Setup Instructions

## What is RLS?
Row Level Security ensures users can only access data they're allowed to see. Without it, anyone with your database URL could read/modify ALL data.

## 🔴 CRITICAL: Add JWT_SECRET to Vercel First!

Before setting up RLS, add this to Vercel environment variables:

```
JWT_SECRET=your-jwt-secret-key-change-in-production
```

**Without this, login will continue to fail!**

## How to Apply RLS Policies

### Option 1: Supabase SQL Editor (Recommended)

1. Go to: https://app.supabase.com/project/fhrregyvsmwpfkpnkocy/sql
2. Click "New Query"
3. Open `/migrations/005_setup_rls_policies.sql` from this project
4. Copy the ENTIRE file contents
5. Paste into Supabase SQL Editor
6. Click "Run" (bottom right)
7. Wait for success message

### Option 2: Command Line (if you have psql)

```bash
psql "postgresql://postgres:Sm@rt0329808$@db.fhrregyvsmwpfkpnkocy.supabase.co:5432/postgres" -f migrations/005_setup_rls_policies.sql
```

## What the RLS Policies Do

### Security Rules:

1. **Users** - Can only see/edit their own profile
2. **Products** - Anyone sees published products, creators manage their own
3. **Orders** - Users only see their own purchases
4. **Entitlements** - Users only see their own download access
5. **Reviews** - Users can create/edit own reviews, public sees approved reviews
6. **Files** - Public sees published product files, creators manage their own
7. **Admin Actions** - Checked in API layer (creating orders, moderating reviews)

### Why This Matters:

**Without RLS:**
- Anyone could query your database and see all user emails
- Users could download files they didn't purchase
- Users could modify other users' products
- Competitors could scrape all your data

**With RLS:**
- Database enforces access control at the row level
- Even if someone gets database credentials, they can't access other users' data
- Your API is the only way to bypass RLS (with proper auth checks)

## Verification

After running the migration, verify with this query in Supabase SQL Editor:

```sql
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

You should see policies for all 21 tables.

## Next Steps

1. ✅ Add `JWT_SECRET` to Vercel
2. ✅ Run RLS migration SQL
3. ✅ Verify policies exist
4. ✅ Test login works
5. ✅ Test that users can't access other users' data
