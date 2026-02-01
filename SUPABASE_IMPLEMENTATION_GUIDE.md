# Supabase Implementation Guide

## Quick Start

This guide provides step-by-step instructions for implementing the Supabase migration for SequenceHUB.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation & Dependencies](#installation--dependencies)
3. [Supabase Project Setup](#supabase-project-setup)
4. [Database Migration](#database-migration)
5. [Code Implementation](#code-implementation)
6. [File Migration](#file-migration)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Rollback Procedure](#rollback-procedure)

---

## Prerequisites

- [ ] Supabase account created
- [ ] Existing database backup created
- [ ] R2/Local storage backup created
- [ ] Vercel project access
- [ ] Node.js 18+ and Bun installed
- [ ] Access to production environment variables

---

## Installation & Dependencies

### 1. Install Supabase packages

```bash
bun add @supabase/supabase-js @supabase/ssr
```

### 2. Update Prisma schema

**File: `/Users/cope/SHUB-V1/prisma/schema.prisma`**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 3. Create environment file for migration

**File: `.env.migration`**

```bash
# Old database (source)
OLD_DATABASE_URL="file:./db/prod.db"  # or your production PostgreSQL URL

# Supabase (target)
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..."

# Database URLs (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"

# Storage (if migrating from R2)
R2_ENDPOINT="https://[account].r2.cloudflarestorage.com"
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="sequencehub-files"

# Application
NEXT_PUBLIC_BASE_URL="https://sequencehub.com"

# Send password reset emails (set to false for dry run)
SEND_PASSWORD_RESETS="false"
```

---

## Supabase Project Setup

### 1. Create Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Organization: `SequenceHUB`
4. Project Name: `sequencehub-production`
5. Database Password: Generate strong password (save in 1Password)
6. Region: `East US (North Virginia)` (closest to Vercel `iad1`)
7. Plan: `Pro` ($25/month - required for custom SMTP and auth hooks)

### 2. Configure Authentication

1. Navigate to **Authentication > Providers**
2. Enable Email provider
3. Disable email confirmation (we'll handle this in migration)
4. Set Site URL: `https://sequencehub.com`
5. Set Redirect URLs:
   - `https://sequencehub.com/auth/callback`
   - `https://sequencehub.com/auth/reset-password`
   - `http://localhost:3000/auth/callback` (dev)

### 3. Configure Email Templates

Navigate to **Authentication > Email Templates**

**Confirm Signup Template:**
```html
<h2>Welcome to SequenceHUB!</h2>
<p>Please verify your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email</a></p>
```

**Reset Password Template:**
```html
<h2>Reset your SequenceHUB password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

### 4. Create Storage Buckets

Navigate to **Storage > Buckets**

Create three buckets:

| Bucket Name | Public | File Size Limit | Allowed MIME Types |
|-------------|--------|-----------------|-------------------|
| `product-files` | Private | 500MB | `application/octet-stream`, `text/xml`, `audio/*`, `video/*` |
| `product-media` | Public | 10MB | `image/*`, `video/mp4`, `video/webm` |
| `user-avatars` | Public | 2MB | `image/jpeg`, `image/png`, `image/webp` |

### 5. Get API Keys

Navigate to **Project Settings > API**

Copy these values to `.env.migration`:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

Navigate to **Project Settings > Database**

Copy **Connection String** (Session pooler) → `DATABASE_URL`
Copy **Connection String** (Direct connection) → `DIRECT_URL`

---

## Database Migration

### 1. Apply Schema Migrations

Run the schema migration SQL in Supabase SQL Editor:

```bash
# Copy migration file content
cat supabase/migrations/001_initial_schema.sql

# In Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Click "New query"
# 3. Paste the entire migration file
# 4. Click "Run"
# 5. Verify: "Supabase schema migration completed successfully!"
```

### 2. Apply Storage Policies

```bash
# Copy storage policies
cat supabase/migrations/002_storage_policies.sql

# In Supabase Dashboard > SQL Editor:
# 1. New query
# 2. Paste storage policies
# 3. Run
# 4. Verify: "Supabase Storage policies configured successfully!"
```

### 3. Verify Schema

Check that all tables were created:

```sql
-- Run in SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Expected tables (17):
- access_logs
- audit_logs
- checkout_sessions
- creator_accounts
- download_tokens
- entitlements
- order_items
- orders
- prices
- product_files
- product_media
- product_tags
- product_versions
- products
- profiles
- tags
- user_id_migrations
- user_roles
- users

### 4. Run Data Migration

**IMPORTANT: Run in staging/development first!**

```bash
# Load migration environment
source .env.migration

# Run migration script
bun run scripts/migrate-to-supabase.ts

# Expected output:
# ✅ Migrated X users, Y profiles, Z roles
# ✅ Migrated X creator accounts
# ✅ Migrated X products, Y versions, Z files
# ✅ Migrated X orders, Y entitlements
# ✅ Migrated X audit logs
```

### 5. Verify Data Migration

In Supabase Dashboard > Table Editor, verify:

- [ ] Users table populated
- [ ] User roles assigned (check `user_roles` table)
- [ ] Creator accounts migrated with Stripe IDs
- [ ] Products migrated with correct creator ownership
- [ ] Orders and entitlements preserved
- [ ] User ID mappings created

```sql
-- Check migration statistics
SELECT 'users' AS table_name, COUNT(*) FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'entitlements', COUNT(*) FROM entitlements;
```

---

## Code Implementation

### 1. Update Package Dependencies

All Supabase packages already added (see Installation section).

### 2. Created Files Reference

The following files have been created for Supabase integration:

**Supabase Client & Auth:**
- `/Users/cope/SHUB-V1/src/lib/supabase/client.ts` - Client creation for browser/server
- `/Users/cope/SHUB-V1/src/lib/supabase/auth.ts` - Auth wrapper (replaces `src/lib/auth.ts`)
- `/Users/cope/SHUB-V1/src/lib/supabase/storage.ts` - Storage wrapper (replaces `src/lib/storage/`)

**Migration Scripts:**
- `/Users/cope/SHUB-V1/scripts/migrate-to-supabase.ts` - Data migration script
- `/Users/cope/SHUB-V1/scripts/migrate-files-to-supabase-storage.ts` - File migration script

**Database Migrations:**
- `/Users/cope/SHUB-V1/supabase/migrations/001_initial_schema.sql` - Schema + RLS policies
- `/Users/cope/SHUB-V1/supabase/migrations/002_storage_policies.sql` - Storage bucket policies

### 3. Update Auth Context

**File: `/Users/cope/SHUB-V1/src/contexts/auth-context.tsx`**

Replace imports:
```typescript
// OLD
import { getCurrentUser, AuthUser } from '@/lib/auth';

// NEW
import { getCurrentUser, AuthUser } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/client';
```

Update refresh logic:
```typescript
async function refreshUser() {
  setIsLoading(true);
  try {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  } catch (error) {
    console.error('Failed to refresh user:', error);
    setUser(null);
  } finally {
    setIsLoading(false);
  }
}
```

Add Supabase auth state listener:
```typescript
useEffect(() => {
  const supabase = createClient();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### 4. Update Auth Hooks

**File: `/Users/cope/SHUB-V1/src/hooks/use-auth.ts`**

Replace imports:
```typescript
// OLD
import { hasRole, isAdmin, isCreator, isCreatorOrAdmin } from '@/lib/auth';

// NEW
import { hasRole, isAdmin, isCreator, isCreatorOrAdmin } from '@/lib/supabase/auth';
```

### 5. Update API Routes

**Pattern for all API routes:**

```typescript
// OLD
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ...
}

// NEW
import { createServerClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  // ... rest remains the same
}
```

**Routes to update:**
- `/Users/cope/SHUB-V1/src/app/api/auth/*` - Replace with Supabase Auth
- `/Users/cope/SHUB-V1/src/app/api/products/*` - Update auth checks
- `/Users/cope/SHUB-V1/src/app/api/dashboard/*` - Update auth checks
- `/Users/cope/SHUB-V1/src/app/api/library/*` - Update auth checks
- `/Users/cope/SHUB-V1/src/app/api/checkout/create/route.ts` - Update user ID handling
- `/Users/cope/SHUB-V1/src/app/api/webhooks/stripe/route.ts` - Add user ID mapping

### 6. Update Auth API Routes

**Create new Supabase auth routes:**

**File: `/Users/cope/SHUB-V1/src/app/api/auth/register/route.ts`**
```typescript
import { NextRequest } from 'next/server';
import { registerUser } from '@/lib/supabase/auth';

export async function POST(request: NextRequest) {
  const { email, password, name } = await request.json();

  const { user, error } = await registerUser(email, password, name);

  if (error) {
    return Response.json({ error }, { status: 400 });
  }

  return Response.json({ user }, { status: 201 });
}
```

**File: `/Users/cope/SHUB-V1/src/app/api/auth/login/route.ts`**
```typescript
import { NextRequest } from 'next/server';
import { loginUser } from '@/lib/supabase/auth';

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  const { user, error } = await loginUser(email, password);

  if (error) {
    return Response.json({ error }, { status: 401 });
  }

  return Response.json({ user }, { status: 200 });
}
```

**File: `/Users/cope/SHUB-V1/src/app/api/auth/logout/route.ts`**
```typescript
import { logoutUser } from '@/lib/supabase/auth';

export async function POST() {
  const { error } = await logoutUser();

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}
```

### 7. Update Stripe Webhook Handler

**File: `/Users/cope/SHUB-V1/src/app/api/webhooks/stripe/route.ts`**

Add user ID mapping:
```typescript
import { createAdminClient } from '@/lib/supabase/client';

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  let userId = session.metadata?.userId;

  // Map old user ID to new Supabase user ID
  if (userId && !isUUID(userId)) {
    const supabase = createAdminClient();
    const { data: mapping } = await supabase
      .from('user_id_migrations')
      .select('new_user_id')
      .eq('old_user_id', userId)
      .single();

    if (mapping) {
      userId = mapping.new_user_id;
    } else {
      console.error('User ID mapping not found:', userId);
      throw new Error('User not found');
    }
  }

  // Continue with order creation using mapped userId...
}

function isUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}
```

---

## File Migration

### 1. Run File Migration Script

```bash
# Load environment
source .env.migration

# Run file migration
bun run scripts/migrate-files-to-supabase-storage.ts

# This will:
# - Download all files from R2/local storage
# - Verify SHA-256 hashes
# - Upload to Supabase Storage buckets
# - Skip already migrated files
```

### 2. Verify Files

In Supabase Dashboard > Storage:

1. Check `product-files` bucket:
   - Files organized by type (fseq/, xsq/, etc.)
   - File sizes match originals

2. Check `product-media` bucket:
   - Product images uploaded
   - Preview videos uploaded

3. Check `user-avatars` bucket:
   - User avatars organized by user ID

### 3. Test File Downloads

```bash
# Test signed URL generation
curl "https://your-app.com/api/library/download?fileId=xxx"

# Should return:
# { "downloadUrl": "https://xxxxx.supabase.co/storage/v1/object/sign/..." }

# Test actual download
curl -L "<downloadUrl>"
# Should download the file
```

---

## Testing

### Pre-Deployment Checklist

#### Authentication
- [ ] User registration creates account
- [ ] User login works
- [ ] User logout works
- [ ] Password reset email received
- [ ] Password reset works
- [ ] JWT session persists across page reloads
- [ ] Session expires after timeout

#### Authorization
- [ ] Users can only access their own data
- [ ] Creators can only edit their own products
- [ ] Admins can access all data
- [ ] RLS policies prevent unauthorized access
- [ ] Role checks work (ADMIN, CREATOR, BUYER)

#### File Operations
- [ ] File upload works (product files)
- [ ] Media upload works (images, videos)
- [ ] File download requires entitlement
- [ ] Signed URLs expire after 5 minutes
- [ ] Rate limiting works (10 downloads/day)
- [ ] File hash verification works

#### Payments
- [ ] Checkout session creation works
- [ ] Stripe webhook processes successfully
- [ ] Order created with Supabase user ID
- [ ] Entitlement granted after payment
- [ ] Refunds revoke entitlements
- [ ] User ID mapping works for old customers

#### Database
- [ ] All queries work
- [ ] RLS policies enforced
- [ ] Indexes improve performance
- [ ] No N+1 query issues
- [ ] Audit logging works

---

## Deployment

### 1. Update Environment Variables in Vercel

```bash
# Delete old variables
vercel env rm JWT_SECRET production
vercel env rm R2_ENDPOINT production
vercel env rm R2_ACCESS_KEY_ID production
vercel env rm R2_SECRET_ACCESS_KEY production
vercel env rm R2_BUCKET_NAME production

# Add new variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add DATABASE_URL production
vercel env add DIRECT_URL production

# Keep these
# STRIPE_SECRET_KEY (already set)
# STRIPE_WEBHOOK_SECRET (already set)
# DOWNLOAD_SECRET (keep for additional verification)
# NEXT_PUBLIC_BASE_URL (already set)
```

### 2. Update Prisma Configuration

Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### 3. Create Vercel Configuration

**File: `/vercel.json`**
```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "api/**/*": {
      "maxDuration": 30
    },
    "api/webhooks/*": {
      "maxDuration": 60
    }
  }
}
```

### 4. Deploy to Vercel

```bash
# Generate Prisma client with new schema
bunx prisma generate

# Build application
bun run build

# Deploy to Vercel (production)
vercel --prod

# Or via Git push
git add .
git commit -m "Migrate to Supabase"
git push origin main
```

### 5. Post-Deployment Verification

1. **Check deployment logs** in Vercel Dashboard
2. **Test authentication** on production
3. **Test file download** on production
4. **Test payment flow** with Stripe test mode
5. **Monitor errors** in Sentry/LogRocket
6. **Check Supabase logs** for any RLS policy violations

---

## Rollback Procedure

### Immediate Rollback (< 1 hour)

If critical issues detected:

```bash
# 1. Rollback Vercel deployment
vercel rollback

# 2. Restore environment variables
# In Vercel Dashboard, restore old .env values

# 3. Verify old system operational
# Test login, payments, downloads
```

### Database Rollback

If database corruption detected:

```sql
-- In Supabase SQL Editor, restore from backup
-- Supabase Pro includes point-in-time recovery

-- Or export data and reimport to old database
pg_dump -h db.xxxxx.supabase.co -U postgres -d postgres > backup.sql
psql -h old-db-host -U postgres -d sequencehub < backup.sql
```

### File Storage Rollback

Files remain in R2 for 30 days post-migration:

```typescript
// Temporarily revert storage backend
// Update src/lib/storage/index.ts
export function getStorageBackend(): 'r2' | 'local' {
  return 'r2'; // Revert to R2
}
```

---

## Post-Migration

### 1. Send User Communications

**Email all users:**
```
Subject: SequenceHUB Platform Upgrade Complete

Hi [name],

We've completed our platform upgrade to improve security and performance.

Action Required:
- Reset your password: https://sequencehub.com/auth/reset-password

Your purchases and downloads remain accessible.

Questions? Reply to this email or visit our help center.

Thanks,
The SequenceHUB Team
```

### 2. Monitor for 7 Days

- Daily error log reviews
- User support ticket monitoring
- Payment processing verification
- File download success rates
- RLS policy violations (should be 0)

### 3. Cleanup (After 30 Days)

Once stable:
- Delete R2 bucket files
- Remove old JWT auth code
- Archive migration scripts
- Update documentation

---

## Support

### Troubleshooting

**Issue: Users can't login**
- Check Supabase Auth logs
- Verify email confirmation settings
- Check RLS policies on user_roles table

**Issue: Files not downloading**
- Check entitlement records
- Verify storage policies
- Check signed URL expiration

**Issue: Payments failing**
- Check user ID mapping table
- Verify Stripe webhook signature
- Check order creation logs

### Getting Help

- Supabase Support: https://supabase.com/support
- Supabase Discord: https://discord.supabase.com
- Internal: Check `/Users/cope/SHUB-V1/SUPABASE_MIGRATION.md`

---

**Document Version**: 1.0
**Last Updated**: 2026-01-31
**Author**: SequenceHUB Team + Claude AI
