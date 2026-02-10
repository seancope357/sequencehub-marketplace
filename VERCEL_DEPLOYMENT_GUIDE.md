# Vercel Deployment Guide - SequenceHub V1

**Last Updated**: February 10, 2026
**Build Status**: ✅ Passing (commit: 36a7e0e)

---

## ✅ Pre-Deployment Checklist

### Code Status
- ✅ All critical bugs fixed
- ✅ Build passing locally (`npm run build` succeeds)
- ✅ All changes committed and pushed to GitHub
- ✅ Main branch up to date

### Database Status
- ✅ Supabase project created
- ✅ Database schema applied (18 tables)
- ✅ RLS policies configured
- ✅ Storage buckets created (3 buckets)
- ⚠️ Need to verify migrations are applied in production

---

## 🚀 Deployment Steps

### Step 1: Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import your GitHub repository: `seancope357/sequencehub-marketplace`
4. Select the `main` branch

### Step 2: Configure Project Settings

**Framework Preset**: Next.js (should auto-detect)
**Root Directory**: `./` (default)
**Build Command**: `npm run build` (default)
**Output Directory**: `.next` (default)
**Install Command**: `npm install` (default)

### Step 3: Configure Environment Variables

Add these environment variables in Vercel dashboard:

#### **Required - Database**
```bash
# Supabase Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.fhrregyvsmwpfkpnkocy.supabase.co:5432/postgres

# Supabase API
NEXT_PUBLIC_SUPABASE_URL=https://fhrregyvsmwpfkpnkocy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### **Required - Security**
```bash
# JWT Secret (generate new for production)
JWT_SECRET=<generate-with-openssl-rand-hex-32>

# Download URL Signing
DOWNLOAD_SECRET=<generate-with-openssl-rand-hex-32>
```

#### **Required - Stripe**
```bash
# Stripe API Keys (use PRODUCTION keys for production)
STRIPE_SECRET_KEY=sk_live_... # or sk_test_... for testing
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...

# Stripe Webhook Secret (get from Stripe Dashboard after creating webhook)
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Connect
STRIPE_CONNECT_CLIENT_ID=ca_...
```

#### **Required - Application**
```bash
# Base URL (will be your-app.vercel.app or custom domain)
NEXT_PUBLIC_BASE_URL=https://your-app-name.vercel.app

# Node Environment
NODE_ENV=production
```

#### **Optional - Email**
```bash
# Resend (for email notifications - not required for MVP)
RESEND_API_KEY=re_...
```

---

## 🔑 Generating Production Secrets

Run these commands locally to generate secure secrets:

```bash
# JWT Secret
openssl rand -hex 32

# Download Secret
openssl rand -hex 32
```

**Important**: Use DIFFERENT secrets for production than development!

---

## 🪝 Configure Stripe Webhook

After deployment, you need to configure the Stripe webhook:

### Step 1: Create Webhook in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Developers** → **Webhooks**
3. Click "Add endpoint"
4. Enter your webhook URL:
   ```
   https://your-app-name.vercel.app/api/webhooks/stripe
   ```

### Step 2: Select Events

Select these events to listen for:
- ✅ `checkout.session.completed`
- ✅ `checkout.session.expired`
- ✅ `charge.refunded`
- ✅ `account.updated` (for Stripe Connect)

### Step 3: Copy Webhook Secret

1. After creating the webhook, Stripe will show you the webhook signing secret
2. It looks like: `whsec_...`
3. Add it to Vercel environment variables as `STRIPE_WEBHOOK_SECRET`
4. Redeploy after adding this variable

---

## 📊 Post-Deployment Verification

After deployment completes, test these critical flows:

### 1. Basic Functionality
- [ ] Homepage loads (https://your-app.vercel.app)
- [ ] Browse page loads with products
- [ ] Product images display correctly
- [ ] Search functionality works

### 2. Authentication
- [ ] Register new account
- [ ] Login with credentials
- [ ] JWT token set correctly
- [ ] Dashboard accessible after login

### 3. Creator Flow
- [ ] Stripe Connect onboarding starts
- [ ] Can create draft products
- [ ] Can edit products
- [ ] Can delete products

### 4. Buyer Flow
- [ ] Can view product details
- [ ] Checkout redirects to Stripe
- [ ] After purchase, product appears in library
- [ ] Can download purchased files

### 5. Database & Storage
- [ ] New users created in database
- [ ] Products saved correctly
- [ ] Images upload and display
- [ ] Files upload successfully

### 6. Webhooks
- [ ] Complete a test purchase
- [ ] Check webhook logs in Stripe Dashboard
- [ ] Verify order created in database
- [ ] Verify entitlement created

---

## 🐛 Common Deployment Issues

### Issue 1: Build Fails with "uploadFile doesn't exist"
**Status**: ✅ FIXED (commit 36a7e0e)
**Solution**: Already resolved in latest commit

### Issue 2: Environment Variables Not Set
**Symptom**: 500 errors, "JWT_SECRET is not defined"
**Solution**: Add all required environment variables in Vercel dashboard

### Issue 3: Database Connection Fails
**Symptom**: "Connection refused" or timeout errors
**Solution**:
- Verify DATABASE_URL is correct
- Check Supabase project is active
- Verify connection pooling settings

### Issue 4: Images Don't Display
**Symptom**: Broken image icons everywhere
**Solution**:
- Verify SUPABASE_SERVICE_ROLE_KEY is set
- Check storage buckets exist in Supabase
- Verify bucket policies are configured

### Issue 5: Stripe Checkout Doesn't Complete
**Symptom**: Payment succeeds but no order created
**Solution**:
- Verify STRIPE_WEBHOOK_SECRET is set correctly
- Check webhook endpoint is accessible (not blocked)
- Check webhook logs in Stripe Dashboard

### Issue 6: Stripe Connect Onboarding Fails
**Symptom**: Error when clicking "Connect with Stripe"
**Solution**:
- Verify STRIPE_CONNECT_CLIENT_ID is set
- Verify NEXT_PUBLIC_BASE_URL is correct (for OAuth redirect)
- Check Stripe Connect settings in Stripe Dashboard

---

## 🔄 Redeploying After Changes

When you make code changes:

1. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Your changes"
   git push origin main
   ```

2. Vercel will automatically redeploy (if auto-deploy is enabled)

3. Or manually redeploy from Vercel dashboard:
   - Go to your project
   - Click "Deployments"
   - Click "..." → "Redeploy"

---

## 📈 Monitoring & Logs

### Vercel Dashboard
- **Deployments**: View build logs and deployment history
- **Analytics**: Track page views and performance
- **Logs**: Real-time function logs (API routes)

### Supabase Dashboard
- **Database**: View tables, run queries, check data
- **Storage**: View uploaded files, check bucket usage
- **Logs**: Database queries and storage operations

### Stripe Dashboard
- **Payments**: Track all transactions
- **Webhooks**: View webhook delivery logs
- **Connect**: Monitor connected accounts (creators)

---

## 🎯 Production Optimizations (Optional)

### Performance
- [ ] Enable Vercel Analytics
- [ ] Configure caching headers
- [ ] Optimize images with Next.js Image component
- [ ] Enable Redis for rate limiting (instead of in-memory)

### Security
- [ ] Add custom domain with SSL
- [ ] Configure CORS if needed
- [ ] Set up security headers in vercel.json
- [ ] Enable Vercel Web Application Firewall (WAF)

### Monitoring
- [ ] Set up Sentry for error tracking
- [ ] Configure uptime monitoring
- [ ] Set up email alerts for critical errors
- [ ] Monitor Supabase quotas

---

## 📝 Environment Variables Quick Reference

| Variable | Required | Source | Notes |
|----------|----------|--------|-------|
| `DATABASE_URL` | ✅ | Supabase | Connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase | Anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase | Service role key (secret!) |
| `JWT_SECRET` | ✅ | Generate | `openssl rand -hex 32` |
| `DOWNLOAD_SECRET` | ✅ | Generate | `openssl rand -hex 32` |
| `STRIPE_SECRET_KEY` | ✅ | Stripe | Use live key for production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe | Public key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Stripe | After creating webhook |
| `STRIPE_CONNECT_CLIENT_ID` | ✅ | Stripe | For Connect OAuth |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Your URL | https://your-app.vercel.app |
| `NODE_ENV` | ✅ | Set to `production` | Auto-set by Vercel |
| `RESEND_API_KEY` | ❌ | Resend | Optional, for emails |

---

## 🚨 Critical Security Notes

1. **Never commit secrets to Git**
   - All secrets are in `.env.local` (gitignored)
   - Set secrets in Vercel dashboard only

2. **Use production keys for production**
   - Don't use Stripe test keys in production
   - Generate new JWT_SECRET for production
   - Generate new DOWNLOAD_SECRET for production

3. **Keep service role key secret**
   - `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS
   - Never expose in client-side code
   - Only use in server-side API routes

4. **Verify webhook signatures**
   - Already implemented in `/api/webhooks/stripe`
   - Prevents webhook spoofing attacks

5. **Review Supabase RLS policies**
   - Ensure row-level security is enabled
   - Test with different user roles
   - Verify users can only access their own data

---

## 📞 Support & Resources

### Vercel
- **Docs**: https://vercel.com/docs
- **Support**: https://vercel.com/support
- **Status**: https://www.vercel-status.com

### Supabase
- **Dashboard**: https://supabase.com/dashboard
- **Docs**: https://supabase.com/docs
- **Support**: https://supabase.com/support

### Stripe
- **Dashboard**: https://dashboard.stripe.com
- **Docs**: https://stripe.com/docs
- **Support**: https://support.stripe.com

---

## ✅ Deployment Complete Checklist

After deployment is live and tested:

- [ ] All environment variables configured
- [ ] Stripe webhook created and tested
- [ ] Test user registration works
- [ ] Test product creation works
- [ ] Test purchase flow end-to-end
- [ ] Test file downloads work
- [ ] Verify images display correctly
- [ ] Check error logs for issues
- [ ] Set up monitoring/alerts
- [ ] Document production URL
- [ ] Share with beta testers

---

## 🎉 You're Ready to Deploy!

Your application is production-ready:
- ✅ Build passing
- ✅ All critical bugs fixed
- ✅ Database configured
- ✅ File storage working
- ✅ Payment system integrated

**Next Step**: Go to [vercel.com](https://vercel.com) and click "New Project"!

---

**Last Updated**: February 10, 2026
**Project**: SequenceHub V1 (SHUB-V1)
**Status**: Ready for Production Deployment
