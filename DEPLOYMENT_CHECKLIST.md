# SequenceHUB - Vercel Deployment Checklist
**Last Updated**: February 1, 2026

---

## Pre-Deployment Checklist

### Code Quality & Testing

- [ ] **Build succeeds locally**
  ```bash
  bun run build
  # Should complete without errors
  ```

- [ ] **Linting passes**
  ```bash
  bun run lint
  # Should have no errors (warnings are acceptable)
  ```

- [ ] **All critical features tested**
  - [ ] User registration works
  - [ ] Login/logout works
  - [ ] Dashboard loads
  - [ ] Product creation works (at least saves draft)
  - [ ] Marketplace homepage displays
  - [ ] Product detail pages load

- [ ] **Environment variables documented**
  - [ ] `.env.example` is up to date
  - [ ] All required vars listed
  - [ ] Documentation includes where to get each value

- [ ] **Git status clean**
  ```bash
  git status
  # Should show "nothing to commit, working tree clean"
  ```

- [ ] **All changes committed and pushed**
  ```bash
  git log origin/main..HEAD
  # Should show no commits (all pushed)
  ```

### Database & Supabase

- [ ] **Supabase project created** (if deploying new instance)
  - Create project at https://supabase.com/dashboard
  - Note project URL and keys
  - Project region selected (choose closest to users)

- [ ] **Database migrations applied**
  - [ ] All migrations exist in `/supabase/migrations/`
  - [ ] Migrations applied to Supabase project
  - [ ] Verify in Supabase SQL Editor:
    ```sql
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public';
    -- Should show all 18 tables
    ```

- [ ] **Row Level Security enabled**
  - Check RLS is ON for all tables
  - Verify policies exist
  - Test with non-admin user (should only see own data)

- [ ] **Storage buckets created**
  - [ ] `product-files` bucket exists
  - [ ] `product-media` bucket exists
  - [ ] `user-avatars` bucket exists
  - [ ] Bucket policies configured (see migration 002)
  - [ ] Test file upload/download

- [ ] **Database credentials secured**
  - Service role key never committed to git
  - Anon key is safe to expose (public)
  - Connection string includes password

### Stripe Configuration

- [ ] **Stripe account created**
  - Sign up at https://dashboard.stripe.com

- [ ] **Test mode vs Live mode decision**
  - Test mode: Use `sk_test_*` and `pk_test_*` keys
  - Live mode: Use `sk_live_*` and `pk_live_*` keys
  - **Recommendation**: Deploy with test mode first, then switch to live

- [ ] **API keys obtained**
  - [ ] Secret key (`STRIPE_SECRET_KEY`)
  - [ ] Publishable key (`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
  - From: Dashboard → Developers → API keys

- [ ] **Webhook endpoint will be configured post-deployment**
  - Note: Cannot configure until you have production URL
  - Will configure in post-deployment section

### Secrets & Environment Variables

- [ ] **All secrets generated**
  ```bash
  # Generate DOWNLOAD_SECRET
  openssl rand -hex 32

  # Note: JWT_SECRET not needed (using Supabase Auth)
  ```

- [ ] **Environment variables prepared** (you'll paste these into Vercel)

  **Required**:
  ```env
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

  # Database
  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

  # Security
  DOWNLOAD_SECRET=your-generated-secret-here

  # Stripe
  STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
  STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx  # Will get after deployment

  # App
  NEXT_PUBLIC_BASE_URL=https://yourdomain.vercel.app  # Will update after deployment
  NODE_ENV=production
  ```

  **Optional** (for later):
  ```env
  # Email (if using Resend)
  RESEND_API_KEY=re_xxxxxxxxxxxxx

  # Rate limiting (if using Redis)
  REDIS_URL=redis://localhost:6379
  ```

---

## Deployment Steps

### 1. Create Vercel Project

- [ ] **Sign in to Vercel**
  - Go to https://vercel.com
  - Sign in with GitHub account

- [ ] **Import repository**
  - Click "Add New..." → "Project"
  - Select GitHub repository: `seancope357/sequencehub-marketplace`
  - Click "Import"

- [ ] **Configure project settings**
  - **Framework Preset**: Next.js (should auto-detect)
  - **Root Directory**: `./` (leave default)
  - **Build Command**: `bun run build` (or leave default `next build`)
  - **Output Directory**: `.next` (should auto-fill)
  - **Install Command**: `bun install` (or leave default)

### 2. Configure Environment Variables

- [ ] **Add environment variables in Vercel dashboard**
  - In project settings → Environment Variables
  - Add each variable from your prepared list above
  - Select environments: Production, Preview, Development (all checked)

  **Critical Variables** (add these first):
  ```
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY
  DATABASE_URL
  DOWNLOAD_SECRET
  STRIPE_SECRET_KEY
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  NEXT_PUBLIC_BASE_URL  # Use temporary value, will update
  NODE_ENV=production
  ```

  **Placeholder for now** (will update after deployment):
  ```
  STRIPE_WEBHOOK_SECRET=placeholder  # Will replace after configuring webhook
  ```

### 3. Deploy

- [ ] **Trigger first deployment**
  - Click "Deploy" button
  - Wait for build to complete (usually 2-5 minutes)

- [ ] **Monitor build logs**
  - Watch for errors in build output
  - Common issues:
    - Missing environment variables
    - Build errors (fix and redeploy)
    - Dependencies not installing

- [ ] **Deployment succeeds**
  - Green checkmark appears
  - Deployment URL is generated (e.g., `sequencehub-marketplace.vercel.app`)

### 4. Initial Testing

- [ ] **Visit deployed site**
  - Click "Visit" button or open deployment URL
  - Verify homepage loads

- [ ] **Test critical paths**
  - [ ] Homepage loads without errors
  - [ ] Registration page loads (`/auth/register`)
  - [ ] Can create account
  - [ ] Can login (`/auth/login`)
  - [ ] Dashboard loads (`/dashboard`)
  - [ ] Settings page loads (`/dashboard/settings`)

- [ ] **Check browser console**
  - Open DevTools → Console
  - Should have no critical errors
  - Note any warnings for later

- [ ] **Test database connection**
  - Create test account
  - Verify user appears in Supabase dashboard
  - Check that RLS works (user can only see own data)

---

## Post-Deployment Configuration

### 1. Update Environment Variables

- [ ] **Update `NEXT_PUBLIC_BASE_URL`**
  - In Vercel dashboard → Settings → Environment Variables
  - Edit `NEXT_PUBLIC_BASE_URL`
  - Set to your production URL: `https://sequencehub-marketplace.vercel.app`
  - Click "Save"
  - **Trigger redeployment** (Settings → Deployments → Redeploy)

### 2. Configure Stripe Webhook

This is critical for payments to work.

- [ ] **Get webhook endpoint URL**
  - Your webhook URL is: `https://[YOUR-DOMAIN].vercel.app/api/webhooks/stripe`
  - Example: `https://sequencehub-marketplace.vercel.app/api/webhooks/stripe`

- [ ] **Add webhook in Stripe Dashboard**
  - Go to https://dashboard.stripe.com/test/webhooks
  - Click "Add endpoint"
  - **Endpoint URL**: `https://[YOUR-DOMAIN].vercel.app/api/webhooks/stripe`
  - **Events to send**:
    - `checkout.session.completed`
    - `payment_intent.succeeded`
    - `charge.refunded`
    - `account.updated` (for Stripe Connect)
    - `account.application.deauthorized`
    - `capability.updated`
  - Click "Add endpoint"

- [ ] **Get webhook signing secret**
  - After creating webhook, click on it
  - Click "Reveal" under "Signing secret"
  - Copy the secret (starts with `whsec_`)

- [ ] **Update `STRIPE_WEBHOOK_SECRET` in Vercel**
  - Vercel dashboard → Settings → Environment Variables
  - Edit `STRIPE_WEBHOOK_SECRET`
  - Paste the webhook signing secret
  - Save and redeploy

- [ ] **Test webhook**
  - In Stripe dashboard, click "Send test webhook"
  - Select `checkout.session.completed` event
  - Click "Send test webhook"
  - Check Vercel logs to verify receipt
  - Should see: "Webhook received: checkout.session.completed"

### 3. Custom Domain (Optional)

- [ ] **Add custom domain** (if you have one)
  - Vercel dashboard → Settings → Domains
  - Add your domain (e.g., `sequencehub.com`)
  - Follow DNS configuration instructions
  - Wait for DNS propagation (can take 24-48 hours)

- [ ] **Update environment variables with new domain**
  - Update `NEXT_PUBLIC_BASE_URL` to custom domain
  - Update Stripe webhook URL to use custom domain
  - Redeploy

### 4. Monitoring & Logging

- [ ] **Set up error tracking** (recommended)
  - Options:
    - Sentry: https://sentry.io
    - LogRocket: https://logrocket.com
    - Vercel Analytics (built-in)
  - Install package and configure

- [ ] **Enable Vercel Analytics**
  - In Vercel dashboard → Analytics
  - Enable Web Analytics
  - Add `<Analytics />` component to layout (already included in Next.js 16)

- [ ] **Set up uptime monitoring** (optional)
  - Use: UptimeRobot, Pingdom, or Better Uptime
  - Monitor main pages: `/`, `/auth/login`, `/dashboard`
  - Set up email alerts

---

## Production Verification

### Functional Testing

- [ ] **Authentication**
  - [ ] New user can register
  - [ ] User can login
  - [ ] User can logout
  - [ ] Protected routes redirect to login
  - [ ] Sessions persist across page refreshes

- [ ] **Database**
  - [ ] User data saves to Supabase
  - [ ] RLS policies enforce data isolation
  - [ ] Queries perform acceptably (< 1s response)

- [ ] **File Storage**
  - [ ] Can upload files (if implemented)
  - [ ] Files appear in Supabase Storage
  - [ ] Download URLs work
  - [ ] Bucket policies enforce access control

- [ ] **Stripe (if testing payments)**
  - [ ] Checkout creates session
  - [ ] Redirects to Stripe
  - [ ] Test payment succeeds
  - [ ] Webhook processes event
  - [ ] Order created in database
  - [ ] Entitlement granted

### Performance Testing

- [ ] **Page Load Speed**
  - Run Lighthouse audit: https://pagespeed.web.dev/
  - Target scores:
    - Performance: > 90
    - Accessibility: > 90
    - Best Practices: > 90
    - SEO: > 90

- [ ] **Database Query Performance**
  - Check Vercel logs for slow queries
  - Queries should complete in < 500ms
  - If slow, add indexes or optimize queries

- [ ] **Asset Loading**
  - Images optimized (Next.js Image component)
  - CSS/JS bundled and minified
  - CDN serving static assets

### Security Verification

- [ ] **HTTPS enabled**
  - Vercel provides this automatically
  - Verify padlock icon in browser

- [ ] **Environment variables secure**
  - No secrets in client-side code
  - Check browser DevTools → Network → Response bodies
  - Service role key should never appear

- [ ] **RLS enforced**
  - Test with different users
  - Verify users cannot access others' data
  - Try direct API calls to test authorization

- [ ] **Rate limiting** (if implemented)
  - Test hitting rate limits
  - Verify 429 responses
  - Check that legitimate traffic not blocked

---

## Rollback Plan

If deployment has critical issues:

### Option 1: Rollback to Previous Deployment

- [ ] **In Vercel dashboard**
  - Go to Deployments
  - Find last working deployment
  - Click "..." menu → "Promote to Production"

### Option 2: Revert Git Commit

- [ ] **Revert problematic commit**
  ```bash
  git revert HEAD
  git push origin main
  # Vercel will auto-deploy the reverted code
  ```

### Option 3: Emergency Maintenance Mode

- [ ] **Temporarily disable site**
  - Create `/maintenance.html` in `public/`
  - Deploy
  - Use middleware to redirect all traffic to maintenance page

---

## Post-Launch Checklist

### Day 1 After Launch

- [ ] **Monitor error logs**
  - Check Vercel logs every hour
  - Look for 500 errors
  - Check Sentry/error tracker

- [ ] **Monitor database**
  - Check Supabase dashboard for query performance
  - Look for slow queries
  - Monitor database size

- [ ] **Check webhook delivery**
  - Stripe dashboard → Webhooks → View logs
  - Verify all webhooks processed successfully
  - No 4xx or 5xx responses

- [ ] **Test critical paths**
  - Register new account
  - Create product (if Stripe set up)
  - Complete purchase (test payment)
  - Download purchased product

### Week 1 After Launch

- [ ] **Performance review**
  - Run Lighthouse audits
  - Check Core Web Vitals
  - Optimize if needed

- [ ] **Security audit**
  - Review audit logs
  - Check for suspicious activity
  - Verify no unauthorized access

- [ ] **User feedback**
  - Collect user reports
  - Document issues
  - Prioritize fixes

- [ ] **Monitoring setup complete**
  - Error tracking configured
  - Uptime monitoring active
  - Analytics tracking users

---

## Switching from Test Mode to Live Mode

When ready to accept real payments:

### 1. Get Live Stripe Keys

- [ ] **Activate Stripe account**
  - Complete business verification in Stripe dashboard
  - Provide tax information
  - Link bank account

- [ ] **Get live API keys**
  - Stripe dashboard → Developers → API keys
  - Toggle to "Live mode" (vs "Test mode")
  - Copy live secret key (`sk_live_*`)
  - Copy live publishable key (`pk_live_*`)

### 2. Update Environment Variables

- [ ] **Update Stripe keys in Vercel**
  - `STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx`

### 3. Update Webhook for Live Mode

- [ ] **Create live webhook endpoint**
  - Stripe dashboard → Live mode → Webhooks
  - Add same endpoint URL
  - Add same events
  - Get new webhook secret (`whsec_*`)

- [ ] **Update webhook secret**
  - `STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx` (live secret)

### 4. Test Live Mode

- [ ] **Make test purchase with real card**
  - Use your own card
  - Complete full checkout flow
  - Verify order created
  - Request refund (test refund flow)

- [ ] **Verify payout schedule**
  - Stripe dashboard → Balance
  - Check payout schedule (usually 2-7 days)
  - Verify bank account linked

---

## Common Issues & Solutions

### Build Fails

**Issue**: Build fails with module not found error

**Solution**:
```bash
# Verify dependencies locally
bun install
bun run build

# If build succeeds locally, clear Vercel cache:
# Vercel dashboard → Settings → Clear cache → Redeploy
```

### 500 Errors on Deployed Site

**Issue**: Pages load locally but return 500 in production

**Solutions**:
- Check Vercel logs for error details
- Verify all environment variables set
- Check database connection string is correct
- Verify Supabase service role key is correct

### Database Connection Fails

**Issue**: "Connection terminated unexpectedly"

**Solutions**:
- Verify `DATABASE_URL` is correct
- Check Supabase project is not paused (free tier auto-pauses after 7 days inactivity)
- Verify Supabase project is in same region (reduces latency)
- Check database connection limit (increase if needed)

### Webhooks Not Received

**Issue**: Stripe webhooks not triggering orders

**Solutions**:
- Verify webhook URL is correct (https, not http)
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Check endpoint is publicly accessible (test with curl)
- Look for errors in Stripe dashboard → Webhooks → Logs
- Verify Vercel function timeout is long enough (default 10s should be fine)

### Authentication Not Working

**Issue**: Users can't login or register

**Solutions**:
- Verify Supabase keys are correct
- Check `NEXT_PUBLIC_SUPABASE_URL` is set
- Verify RLS policies allow user creation
- Check browser console for errors
- Test API endpoint directly: `curl https://yourdomain.vercel.app/api/auth/me`

---

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## Checklist Summary

**Pre-Deployment**: 15 items
**Deployment**: 12 items
**Post-Deployment**: 18 items
**Production Verification**: 15 items
**Total**: 60+ verification points

---

**Status**: Ready for Deployment
**Last Updated**: February 1, 2026
**Estimated Time to Deploy**: 2-3 hours (first time)

---

## Final Note

Take your time with each step. It's better to deploy slowly and correctly than rush and have to debug production issues.

Good luck! 🚀
