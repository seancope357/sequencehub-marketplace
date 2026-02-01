# SequenceHUB Setup Checklist

Complete deployment checklist for SequenceHUB marketplace.

---

## ✅ Phase 1: Repository & Dependencies (COMPLETED)

- [x] GitHub repository created: https://github.com/seancope357/sequencehub-marketplace
- [x] Git initialized and code committed (176 files, 39,730 lines)
- [x] Supabase dependencies installed (@supabase/supabase-js, @supabase/ssr)
- [x] .gitignore configured for Next.js/Supabase/Vercel
- [x] All documentation created

---

## 🚀 Phase 2: Supabase Setup (IN PROGRESS)

### Step 1: Create Supabase Project
- [ ] Go to https://supabase.com/dashboard
- [ ] Click "New Project"
- [ ] Name: `sequencehub-staging` (for testing) or `sequencehub-production`
- [ ] Database Password: Generate strong password (SAVE IT!)
- [ ] Region: `us-east-1` (or closest to your users)
- [ ] Wait 2-3 minutes for provisioning

### Step 2: Collect Credentials
Navigate to **Settings** → **API**:
- [ ] Copy Project URL: `https://xxxxx.supabase.co`
- [ ] Copy anon/public key: `eyJhbGci...`
- [ ] Copy service_role key: `eyJhbGci...` (keep secret!)

Navigate to **Settings** → **Database**:
- [ ] Copy Connection string (URI format)

### Step 3: Update Environment Variables
- [ ] Create `.env.local` file: `cp .env.example .env.local`
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Add `DATABASE_URL` (PostgreSQL connection string)
- [ ] Generate `DOWNLOAD_SECRET`: `openssl rand -hex 32`
- [ ] Verify `.env.local` is in `.gitignore` ✓

### Step 4: Run Database Migrations
- [ ] Go to Supabase Dashboard → **SQL Editor**
- [ ] Click "New Query"
- [ ] Copy contents of `supabase/migrations/001_initial_schema.sql`
- [ ] Paste and click "Run"
- [ ] Verify success (no errors)
- [ ] Repeat for `supabase/migrations/002_storage_policies.sql`

### Step 5: Verify Database Setup
- [ ] Go to **Table Editor**
- [ ] Confirm all 17 tables exist:
  - [ ] users, profiles, user_roles, creator_accounts
  - [ ] products, product_versions, product_files, product_media
  - [ ] tags, product_tags, prices
  - [ ] checkout_sessions, orders, order_items, entitlements
  - [ ] download_tokens, access_logs, audit_logs
- [ ] Go to **Storage**
- [ ] Confirm 3 buckets exist:
  - [ ] product-files (500MB limit, private)
  - [ ] product-media (10MB limit, public)
  - [ ] user-avatars (2MB limit, public)

### Step 6: Configure Supabase Auth
- [ ] Go to **Authentication** → **URL Configuration**
- [ ] Set Site URL: `http://localhost:3000` (local) or your domain
- [ ] Add Redirect URLs:
  - [ ] `http://localhost:3000/**`
  - [ ] `https://your-domain.vercel.app/**`
- [ ] (Optional) Customize email templates in **Email Templates**
- [ ] (Optional) Enable OAuth providers (Google, GitHub, etc.)

### Step 7: Test Local Development
- [ ] Run `npm run dev`
- [ ] Visit http://localhost:3000
- [ ] Test registration: http://localhost:3000/auth/register
- [ ] Create test account
- [ ] Verify user appears in Supabase Dashboard → **Authentication** → **Users**
- [ ] Check browser console for errors
- [ ] Test login with created account

---

## 💳 Phase 3: Stripe Setup (REQUIRED)

### Step 1: Stripe Account
- [ ] Sign up at https://stripe.com
- [ ] Complete account verification
- [ ] Enable Stripe Connect in Settings

### Step 2: Get Stripe Keys
Navigate to **Developers** → **API keys**:
- [ ] Copy Publishable key (starts with `pk_test_`)
- [ ] Copy Secret key (starts with `sk_test_`)

### Step 3: Update Environment Variables
Add to `.env.local`:
- [ ] `STRIPE_SECRET_KEY=sk_test_...`
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`

### Step 4: Configure Webhook (After Vercel Deployment)
- [ ] Get Vercel deployment URL
- [ ] Go to Stripe → **Developers** → **Webhooks**
- [ ] Add endpoint: `https://your-domain.vercel.app/api/webhooks/stripe`
- [ ] Select events:
  - [ ] `checkout.session.completed`
  - [ ] `charge.refunded`
  - [ ] `payment_intent.succeeded`
  - [ ] `payment_intent.payment_failed`
  - [ ] `account.updated`
  - [ ] `account.application.deauthorized`
- [ ] Copy webhook signing secret (starts with `whsec_`)
- [ ] Add to Vercel environment variables: `STRIPE_WEBHOOK_SECRET`

---

## 🌐 Phase 4: Vercel Deployment

### Step 1: Connect Repository
- [ ] Go to https://vercel.com/new
- [ ] Click "Import Git Repository"
- [ ] Select GitHub account
- [ ] Find and select `sequencehub-marketplace`
- [ ] Click "Import"

### Step 2: Configure Build Settings
- [ ] Framework: Next.js (auto-detected)
- [ ] Build Command: `npm run build` (default)
- [ ] Install Command: `npm install` (default)
- [ ] Output Directory: `.next` (default)

### Step 3: Add Environment Variables
Click "Environment Variables" and add ALL of these:

**Supabase** (from Phase 2):
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `DATABASE_URL`

**Stripe** (from Phase 3):
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET` (after webhook created)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Application**:
- [ ] `NEXT_PUBLIC_BASE_URL` (your Vercel URL)
- [ ] `DOWNLOAD_SECRET` (generate with `openssl rand -hex 32`)
- [ ] `NODE_ENV=production`

### Step 4: Deploy
- [ ] Click "Deploy"
- [ ] Wait 2-5 minutes for build
- [ ] Note your deployment URL: `https://sequencehub-xxx.vercel.app`

### Step 5: Update Supabase Auth URLs
- [ ] Go to Supabase Dashboard → **Authentication** → **URL Configuration**
- [ ] Update Site URL to your Vercel URL
- [ ] Add Vercel URL to Redirect URLs

---

## 🧪 Phase 5: Testing & Verification

### Local Testing
- [ ] Registration flow works
- [ ] Login flow works
- [ ] Creator onboarding accessible
- [ ] Product creation page loads
- [ ] No console errors

### Production Testing (Vercel)
- [ ] Visit deployment URL
- [ ] Homepage loads correctly
- [ ] Create test account
- [ ] Login works
- [ ] Creator onboarding starts
- [ ] Stripe Connect redirects work
- [ ] No errors in Vercel logs

### Database Testing
- [ ] Check Supabase logs for errors
- [ ] Verify RLS policies work (users can't access others' data)
- [ ] Test queries in SQL Editor

### Stripe Testing
- [ ] Test Stripe Connect onboarding with test account
- [ ] Verify webhook events received in Stripe dashboard
- [ ] Test checkout with test card: `4242 4242 4242 4242`

---

## 🎯 Phase 6: Production Optimization (Optional)

### Custom Domain
- [ ] Purchase domain (e.g., sequencehub.com)
- [ ] Add domain in Vercel → Settings → Domains
- [ ] Configure DNS records
- [ ] Update `NEXT_PUBLIC_BASE_URL`
- [ ] Update Supabase redirect URLs
- [ ] Update Stripe webhook URL

### Email Provider
- [ ] Sign up for Resend or SendGrid
- [ ] Configure SMTP in Supabase
- [ ] Test email delivery

### Redis (For Background Jobs)
- [ ] Sign up for Upstash Redis (free tier)
- [ ] Get Redis URL
- [ ] Add `REDIS_URL` to Vercel env vars
- [ ] Deploy background workers

### Monitoring
- [ ] Enable Vercel Analytics
- [ ] Enable Vercel Speed Insights
- [ ] Set up Sentry for error tracking (optional)
- [ ] Configure alerts in Supabase

### Security
- [ ] Enable 2FA on Supabase account
- [ ] Enable 2FA on Vercel account
- [ ] Enable 2FA on Stripe account
- [ ] Review RLS policies
- [ ] Enable Vercel WAF (Web Application Firewall)

---

## 📊 Success Criteria

Your deployment is successful when:

- [ ] Homepage loads at your Vercel URL
- [ ] Users can register and login
- [ ] Creators can complete Stripe Connect onboarding
- [ ] Creators can create products (after onboarding)
- [ ] Buyers can view products
- [ ] Checkout flow works with test Stripe card
- [ ] Webhooks are received and processed
- [ ] Files can be uploaded (to Supabase Storage)
- [ ] Downloads work with entitlement checks
- [ ] No errors in Vercel logs
- [ ] No errors in Supabase logs
- [ ] Database queries are fast (<100ms)
- [ ] RLS policies prevent unauthorized access

---

## 🆘 Troubleshooting

### Common Issues

**"Module not found" on Vercel**
- Ensure `package-lock.json` is committed
- Check that all dependencies are in `package.json`
- Try `npm install` locally and commit changes

**"Database connection timeout"**
- Enable connection pooling in Supabase
- Use pooler connection string in `DATABASE_URL`
- Check Supabase connection limits

**"Invalid JWT" errors**
- Verify Supabase keys are correct in Vercel
- Check for extra spaces when copying keys
- Ensure keys match the environment (test vs prod)

**Stripe webhooks not working**
- Verify webhook URL is correct
- Check `STRIPE_WEBHOOK_SECRET` is set
- View webhook attempts in Stripe dashboard
- Check Vercel function logs for errors

**Auth redirect loops**
- Verify redirect URLs in Supabase Auth settings
- Check `NEXT_PUBLIC_BASE_URL` matches deployment
- Clear browser cookies and try again

### Getting Help

1. Check documentation:
   - `SUPABASE_SETUP.md` - Setup guide
   - `DEPLOYMENT_GUIDE.md` - Deployment steps
   - `SUPABASE_MIGRATION.md` - Migration details
   - `CLAUDE.md` - Development guide

2. Check logs:
   - Vercel: Deployments → Functions → Logs
   - Supabase: Dashboard → Logs
   - Stripe: Developers → Webhooks → Attempts

3. Review repositories:
   - GitHub: https://github.com/seancope357/sequencehub-marketplace

---

## 📈 Current Status

**Completed**: ✅ Repository, Dependencies, Documentation, Configuration
**In Progress**: 🚧 Supabase Setup
**Next Step**: Create Supabase project and run migrations

---

**Total Estimated Time**: 2-3 hours for first complete deployment
**Recommended**: Do staging deployment first, then production

---

Last Updated: 2026-01-31
