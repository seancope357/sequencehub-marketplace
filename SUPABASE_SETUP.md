# Supabase Setup Quick Start Guide

Follow these steps to create your Supabase project and configure SequenceHUB.

---

## Step 1: Create Supabase Project

### 1.1 Sign Up / Login
1. Go to https://supabase.com
2. Click "Start your project" or "Sign in"
3. Sign in with GitHub (recommended) or email

### 1.2 Create New Project
1. Click "New Project" or go to https://supabase.com/dashboard/new
2. Fill in the project details:

```
Organization: [Select or create your organization]
Name: sequencehub-staging
Database Password: [Generate strong password - SAVE THIS!]
Region: us-east-1 (or closest to your users)
Pricing Plan: Free (for testing) or Pro (for production)
```

3. Click "Create new project"
4. **Wait 2-3 minutes** for the project to provision

---

## Step 2: Get Your Credentials

Once your project is ready, navigate to **Settings** → **API**:

### Copy These Values:

1. **Project URL**
   ```
   Example: https://xxxxxxxxxxxxx.supabase.co
   ```

2. **API Keys - anon/public** (under "Project API keys")
   ```
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdX...
   ```

3. **API Keys - service_role** (click "Reveal" to see it)
   ```
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdX...
   ```
   ⚠️ **Keep this secret! Never commit to git!**

Now navigate to **Settings** → **Database**:

4. **Connection string** (under "Connection string" → URI)
   ```
   Example: postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
   Replace `[YOUR-PASSWORD]` with the database password you created earlier.

---

## Step 3: Update Your .env File

Create a `.env.local` file in your project root:

```bash
# Copy .env.example to .env.local
cp .env.example .env.local
```

Edit `.env.local` and add your Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Stripe (keep your existing keys or add test keys)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
DOWNLOAD_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=development
```

---

## Step 4: Run Database Migrations

### Option A: Using Supabase Dashboard (Recommended for first time)

1. Go to your Supabase project
2. Click **SQL Editor** in the left sidebar
3. Click "New Query"
4. Open `supabase/migrations/001_initial_schema.sql` from your project
5. Copy the entire contents
6. Paste into the SQL Editor
7. Click "Run" (or press ⌘ + Enter)
8. Wait for completion - you should see "Success. No rows returned"

9. Repeat for `supabase/migrations/002_storage_policies.sql`
   - Click "New Query"
   - Copy/paste the storage policies SQL
   - Click "Run"

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref xxxxxxxxxxxxx

# Push migrations
supabase db push
```

### Verify Migration Success

1. Go to **Table Editor** in Supabase Dashboard
2. You should see 17 tables:
   - users
   - profiles
   - user_roles
   - creator_accounts
   - products
   - product_versions
   - product_files
   - product_media
   - tags
   - product_tags
   - prices
   - checkout_sessions
   - orders
   - order_items
   - entitlements
   - download_tokens
   - access_logs
   - audit_logs

3. Go to **Storage** in Supabase Dashboard
4. You should see 3 buckets:
   - product-files
   - product-media
   - user-avatars

---

## Step 5: Configure Auth Settings

### 5.1 Site URL Configuration

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   ```
   http://localhost:3000
   ```
   (Change to your production URL when deploying)

3. Add **Redirect URLs**:
   ```
   http://localhost:3000/**
   https://your-domain.vercel.app/**
   ```

### 5.2 Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize templates for your brand:
   - Confirm signup
   - Magic Link
   - Reset password

### 5.3 Enable OAuth Providers (Optional)

1. Go to **Authentication** → **Providers**
2. Enable providers you want:
   - Google
   - GitHub
   - Others

---

## Step 6: Test Local Development

### 6.1 Start Development Server

```bash
npm run dev
```

Server should start on http://localhost:3000

### 6.2 Test Authentication

1. Go to http://localhost:3000/auth/register
2. Create a test account
3. Check Supabase Dashboard → Authentication → Users
4. You should see your new user!

### 6.3 Test Database Connection

Open the browser console and check for any connection errors.

---

## Step 7: Seed Test Data (Optional)

Create a test user with specific roles:

1. Go to Supabase Dashboard → Authentication → Users
2. Click on your test user
3. Note the UUID (e.g., `123e4567-e89b-12d3-a456-426614174000`)

4. Go to SQL Editor and run:

```sql
-- Make user a CREATOR
INSERT INTO user_roles (id, user_id, role)
VALUES (gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', 'CREATOR');

-- Create profile
INSERT INTO profiles (id, user_id, display_name, bio)
VALUES (gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', 'Test Creator', 'This is a test creator account');

-- Create creator account
INSERT INTO creator_accounts (id, user_id, is_verified)
VALUES (gen_random_uuid(), '123e4567-e89b-12d3-a456-426614174000', true);
```

Replace the UUID with your actual user ID.

---

## Step 8: Next Steps

Now you're ready to:

1. ✅ Test the full application locally
2. ✅ Create products as a creator
3. ✅ Test Stripe integration (when configured)
4. ✅ Deploy to Vercel (follow DEPLOYMENT_GUIDE.md)

---

## Troubleshooting

### "Connection pool timeout"
- Enable connection pooling: Settings → Database → Connection Pooling (Supavisor)
- Use the pooler connection string in `DATABASE_URL`

### "Row level security policy"
- RLS policies are enforced by default
- Check `supabase/migrations/001_initial_schema.sql` for policy definitions
- Policies allow users to see only their own data (multi-tenant security)

### "Invalid API key"
- Verify you copied the correct anon key (not service role key for public usage)
- Check for extra spaces or line breaks when copying

### Can't see tables in Table Editor
- Migration might have failed
- Check SQL Editor for error messages
- Verify you ran both migration files

---

## Security Checklist

Before going to production:

- [ ] Database password is strong (20+ characters)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` only (not committed to git)
- [ ] `.env.local` is in `.gitignore`
- [ ] RLS policies are enabled on all tables (default from migration)
- [ ] Auth redirect URLs include only your domains
- [ ] Row-level security is working (test by trying to access other users' data)

---

## Support

If you encounter issues:

1. Check Supabase Logs: Dashboard → Logs
2. Check browser console for errors
3. Review migration SQL files for syntax errors
4. See full docs in `SUPABASE_MIGRATION.md`

---

**Setup Status**: Follow steps 1-6 to complete local setup ✅

**Next**: See `DEPLOYMENT_GUIDE.md` for production deployment
