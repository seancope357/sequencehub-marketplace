# SequenceHUB Deployment Guide
## Vercel + Supabase Production Deployment

This guide walks you through deploying SequenceHUB to Vercel with Supabase.

---

## Prerequisites

- ✅ GitHub account with repository created
- ✅ Vercel account (sign up at vercel.com)
- ✅ Supabase account (sign up at supabase.com)
- ✅ Stripe account with Connect enabled

---

## Step 1: Create Supabase Project

### 1.1 Create Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in details:
   - **Name**: `sequencehub-production` (or `sequencehub-staging` for testing)
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan**: Free tier for testing, Pro for production
4. Click "Create new project"
5. Wait 2-3 minutes for provisioning

### 1.2 Get Supabase Credentials

Once the project is ready, go to **Settings** → **API**:

1. Copy **Project URL**: `https://xxxxx.supabase.co`
2. Copy **anon public** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. Copy **service_role** key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

Go to **Settings** → **Database**:

4. Copy **Connection string** (URI format): `postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres`

**Save these values** - you'll need them for Vercel environment variables.

---

## Step 2: Configure Supabase Database

### 2.1 Run Schema Migration

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `supabase/migrations/001_initial_schema.sql` from your repo
4. Paste into the query editor
5. Click "Run" (⌘ + Enter)
6. Wait for completion (should see "Success")

### 2.2 Run Storage Policies

1. Create a new query
2. Copy the contents of `supabase/migrations/002_storage_policies.sql`
3. Paste and run
4. Verify success

### 2.3 Verify Schema

1. Go to **Table Editor**
2. You should see all 17 tables:
   - users, profiles, user_roles, creator_accounts
   - products, product_versions, product_files, product_media
   - tags, product_tags, prices
   - checkout_sessions, orders, order_items, entitlements
   - download_tokens, access_logs, audit_logs

---

## Step 3: Configure Supabase Storage

### 3.1 Verify Storage Buckets

1. Go to **Storage** in Supabase Dashboard
2. You should see 3 buckets created by the migration:
   - `product-files` (500MB limit, private)
   - `product-media` (10MB limit, public)
   - `user-avatars` (2MB limit, public)

If not created, create them manually with RLS policies.

---

## Step 4: Configure Supabase Auth

### 4.1 Basic Auth Settings

1. Go to **Authentication** → **Settings**
2. Under **Site URL**, enter your Vercel URL:
   - Staging: `https://sequencehub-staging.vercel.app`
   - Production: `https://sequencehub.com` (or your custom domain)
3. Under **Redirect URLs**, add:
   - `https://your-domain.vercel.app/auth/callback`
   - `https://your-domain.vercel.app/*` (wildcard for all paths)
   - `http://localhost:3000/*` (for local development)

### 4.2 Email Templates (Optional)

1. Go to **Authentication** → **Email Templates**
2. Customize the "Confirm signup" and "Reset password" emails
3. Use your brand colors and logo

### 4.3 Enable OAuth Providers (Optional)

1. Go to **Authentication** → **Providers**
2. Enable desired providers:
   - Google OAuth
   - GitHub OAuth
   - Others as needed
3. Configure redirect URLs for each

---

## Step 5: Deploy to Vercel

### 5.1 Connect GitHub Repository

1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Select your GitHub account
4. Find and select `sequencehub-marketplace`
5. Click "Import"

### 5.2 Configure Project Settings

**Framework Preset**: Next.js (auto-detected)

**Root Directory**: `./` (leave as-is)

**Build Command**: 
```bash
npm run build
```

**Install Command**:
```bash
npm install
```

**Output Directory**: `.next` (auto-detected)

### 5.3 Environment Variables

Click **"Environment Variables"** and add the following:

#### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres
```

#### Stripe Configuration
```
STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe webhook setup)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_...)
```

#### Application Configuration
```
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
DOWNLOAD_SECRET=<generate with: openssl rand -hex 32>
NODE_ENV=production
```

#### Redis (Optional - for background jobs)
```
REDIS_URL=redis://default:[password]@[host]:6379
```

**💡 Tip**: Use Upstash Redis for serverless Redis (free tier available)

### 5.4 Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for build and deployment
3. You'll get a URL like `https://sequencehub-marketplace.vercel.app`

---

## Step 6: Configure Stripe Webhook

### 6.1 Create Webhook Endpoint

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your Vercel URL:
   ```
   https://your-domain.vercel.app/api/webhooks/stripe
   ```
4. Select these events:
   - `checkout.session.completed`
   - `charge.refunded`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `account.updated` (for Stripe Connect)
   - `account.application.deauthorized`
5. Click "Add endpoint"
6. Copy the **Signing Secret** (starts with `whsec_`)

### 6.2 Update Vercel Environment Variable

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Update `STRIPE_WEBHOOK_SECRET` with the new signing secret
3. Redeploy the project (Vercel → Deployments → ⋮ → Redeploy)

---

## Step 7: Verify Deployment

### 7.1 Health Checks

Visit these URLs to verify everything works:

1. **Homepage**: `https://your-domain.vercel.app`
   - Should load without errors
2. **API Health**: `https://your-domain.vercel.app/api`
   - Should return `{"status":"ok"}`
3. **Database Connection**: Check Supabase Dashboard → Database → Logs
   - Should see connection from Vercel IP
4. **Auth**: Try registering a test user
   - Go to `/auth/register`
   - Create account
   - Verify in Supabase Dashboard → Authentication → Users

### 7.2 Test Core Flows

1. **User Registration**: `/auth/register`
2. **User Login**: `/auth/login`
3. **Creator Onboarding**: `/dashboard/creator/onboarding`
4. **Product Creation**: `/dashboard/products/new` (blocked until onboarding complete)
5. **Marketplace Browse**: `/` (homepage)

---

## Step 8: Custom Domain (Optional)

### 8.1 Add Custom Domain in Vercel

1. Go to Vercel → Your Project → Settings → Domains
2. Click "Add"
3. Enter your domain (e.g., `sequencehub.com`)
4. Follow DNS configuration instructions

### 8.2 Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Update Site URL to `https://sequencehub.com`
3. Update redirect URLs to use custom domain

### 8.3 Update Environment Variables

1. Go to Vercel → Settings → Environment Variables
2. Update `NEXT_PUBLIC_BASE_URL` to `https://sequencehub.com`
3. Redeploy

---

## Step 9: Monitoring & Analytics

### 9.1 Vercel Analytics

1. Go to Vercel → Your Project → Analytics
2. Enable Web Analytics (free)
3. Enable Speed Insights (free)

### 9.2 Supabase Logs

1. Go to Supabase Dashboard → Logs
2. Monitor:
   - **Auth Logs**: User signups, logins
   - **Database Logs**: Slow queries, errors
   - **Storage Logs**: File uploads, downloads

### 9.3 Stripe Dashboard

1. Monitor payments in https://dashboard.stripe.com
2. Check webhook delivery status
3. Monitor creator payouts

---

## Troubleshooting

### Build Failures

**Issue**: "Module not found" errors
- **Fix**: Run `npm install` locally, commit `package-lock.json` or `bun.lock`

**Issue**: TypeScript errors
- **Fix**: Run `npm run build` locally first, fix all type errors

### Database Connection Issues

**Issue**: "Connection pool timeout"
- **Fix**: Enable connection pooling in Supabase (Database → Settings → Connection Pool)
- Use pooler connection string in `DATABASE_URL`

### Auth Issues

**Issue**: "Invalid JWT" errors
- **Fix**: Verify `SUPABASE_SERVICE_ROLE_KEY` is correct in Vercel
- Check Supabase JWT secret hasn't changed

**Issue**: Redirect loops
- **Fix**: Verify redirect URLs in Supabase Auth settings
- Check `NEXT_PUBLIC_BASE_URL` matches deployed URL

### Stripe Webhook Failures

**Issue**: Webhooks not received
- **Fix**: Check Stripe webhook URL is correct
- Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel
- Check Vercel function logs for errors

---

## Rollback Plan

If deployment fails:

1. **Revert Vercel Deployment**:
   - Go to Vercel → Deployments
   - Find last working deployment
   - Click ⋮ → Promote to Production

2. **Revert Database** (if needed):
   - Supabase keeps automatic backups (Pro plan)
   - Go to Database → Backups → Restore

3. **Switch to Old System** (if full rollback needed):
   - Keep old SQLite database and JWT auth for 30 days
   - Documented in `SUPABASE_MIGRATION.md`

---

## Next Steps After Deployment

1. **Seed Test Data**: Run seed script or create manually
2. **Create Admin User**: Use Supabase Dashboard → Auth → Users → Add User
3. **Test Full Purchase Flow**: Create product, buy with test Stripe card
4. **Configure Email Provider**: Set up Resend or SendGrid
5. **Set up CI/CD**: GitHub Actions for automatic testing/deployment
6. **Monitor for 7 Days**: Check logs daily for errors
7. **Optimize Performance**: Add caching, CDN for media files

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Project Docs**: See `SUPABASE_MIGRATION.md`, `SUPABASE_IMPLEMENTATION_GUIDE.md`

---

**Deployment Status**: Ready for production ✅

**Estimated Time**: 1-2 hours for first deployment

**Production Readiness**: All critical features implemented and tested
