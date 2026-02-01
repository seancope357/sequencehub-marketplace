# SequenceHUB Quick Start Guide
## Get Up and Running in 10 Minutes

This guide will help you get SequenceHUB running locally with Supabase in just a few steps.

---

## Prerequisites

✅ You've created a Supabase project
✅ You have your Supabase credentials ready
✅ Node.js and npm are installed

---

## Step 1: Run the Automated Setup Script (2 minutes)

We've created an interactive script that will configure your `.env.local` file automatically.

```bash
node scripts/setup-supabase-env.js
```

### What You'll Need:

The script will prompt you for:

1. **Supabase Project URL** 
   - Find it in: Supabase Dashboard → Settings → API
   - Format: `https://xxxxxxxxxxxxx.supabase.co`
   - Your URL: `https://fhrregyvsmwpfkpnkocy.supabase.co` (pre-filled)

2. **Anon/Public Key**
   - Find it in: Supabase Dashboard → Settings → API → "Project API keys"
   - Starts with `eyJ...`
   - This is safe to use in client-side code

3. **Service Role Key**
   - Find it in: Supabase Dashboard → Settings → API → Click "Reveal" next to service_role
   - Starts with `eyJ...`
   - ⚠️ **Keep this secret!** Server-side only

4. **Database Password**
   - The password you created when setting up the Supabase project
   - If you forgot it, you can reset it in Supabase Dashboard → Settings → Database

### What the Script Does:

- ✅ Creates `.env.local` file from `.env.example`
- ✅ Adds all your Supabase credentials
- ✅ Builds the correct PostgreSQL `DATABASE_URL` connection string
- ✅ Auto-generates a secure `DOWNLOAD_SECRET`
- ✅ Validates credential formats

---

## Step 2: Verify Your Connection (1 minute)

Test that everything is configured correctly:

```bash
node scripts/verify-supabase-connection.js
```

### What It Checks:

- ✅ All environment variables are present
- ✅ Supabase URL is reachable
- ✅ Supabase client can initialize
- ✅ Database connection works
- ✅ Packages are installed

If any test fails, the script will tell you exactly what's wrong and how to fix it.

---

## Step 3: Run Database Migrations (3 minutes)

Now you need to create your database tables in Supabase.

### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://fhrregyvsmwpfkpnkocy.supabase.co

2. Click **SQL Editor** in the left sidebar

3. Click **New Query**

4. Open `supabase/migrations/001_initial_schema.sql` in your code editor

5. Copy the entire contents (735 lines)

6. Paste into the SQL Editor

7. Click **Run** (or press ⌘ + Enter)

8. Wait for "Success. No rows returned" message

9. Repeat for `supabase/migrations/002_storage_policies.sql`

### Option B: Using Supabase CLI (Advanced)

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref fhrregyvsmwpfkpnkocy

# Push migrations
supabase db push
```

### Verify Migration Success:

1. Go to **Table Editor** in Supabase Dashboard
2. You should see 17 tables:
   - users, profiles, user_roles, creator_accounts
   - products, product_versions, product_files, product_media
   - tags, product_tags, prices
   - checkout_sessions, orders, order_items, entitlements
   - download_tokens, access_logs, audit_logs

3. Go to **Storage** in Supabase Dashboard
4. You should see 3 buckets:
   - product-files (500MB limit, private)
   - product-media (10MB limit, public)
   - user-avatars (2MB limit, public)

---

## Step 4: Start Development Server (1 minute)

```bash
npm run dev
```

Visit: http://localhost:3000

---

## Step 5: Test the Application (3 minutes)

### Create Your First User

1. Go to http://localhost:3000/auth/register

2. Fill in the registration form:
   - Email
   - Password
   - Name (optional)

3. Click "Sign Up"

4. You should be redirected to the homepage

5. Verify in Supabase Dashboard:
   - Go to **Authentication** → **Users**
   - Your user should appear in the list!

### Test Creator Onboarding

1. Go to http://localhost:3000/dashboard/creator/onboarding

2. You'll see the Stripe Connect onboarding status

3. (Stripe Connect will work after you add Stripe keys)

---

## Common Issues & Solutions

### "Module not found: @supabase/supabase-js"

```bash
npm install
```

### ".env.local file not found"

Run the setup script again:

```bash
node scripts/setup-supabase-env.js
```

### "Database connection failed"

1. Check your database password is correct
2. Ensure migrations were run successfully
3. Check Supabase Dashboard → Database → Connection pooling is enabled

### "Invalid anon key format"

- Anon keys should start with `eyJ`
- Make sure you copied the full key (no line breaks)
- Get it from: Supabase Dashboard → Settings → API

### "Row level security policy violation"

This means RLS policies are working! Users can only access their own data.
- Make sure migrations ran successfully (includes RLS policies)
- Check you're logged in with the correct user

---

## Next Steps

### Add Stripe Keys (For Payments)

1. Get your Stripe test keys from https://dashboard.stripe.com/test/apikeys

2. Add to `.env.local`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

3. Restart the dev server

4. Test creator onboarding flow

### Deploy to Vercel

See: `DEPLOYMENT_GUIDE.md` for complete Vercel deployment instructions

---

## Useful Commands

```bash
# Start development server
npm run dev

# Run database migrations
npx prisma db push

# View database in GUI
npx prisma studio

# Check database schema
npx prisma db pull

# Generate Prisma client
npx prisma generate

# Build for production
npm run build

# Run linting
npm run lint
```

---

## File Structure

```
sequencehub-marketplace/
├── .env.local                    # Your credentials (created by setup script)
├── .env.example                  # Template
├── scripts/
│   ├── setup-supabase-env.js     # Interactive setup script
│   └── verify-supabase-connection.js  # Connection testing
├── supabase/
│   └── migrations/
│       ├── 001_initial_schema.sql     # Database schema
│       └── 002_storage_policies.sql   # Storage buckets
├── src/
│   ├── lib/supabase/
│   │   ├── client.ts             # Supabase client creation
│   │   ├── auth.ts               # Auth utilities
│   │   └── storage.ts            # Storage utilities
│   └── app/
│       ├── auth/                 # Auth pages
│       ├── dashboard/            # Creator dashboard
│       └── api/                  # API routes
└── docs/
    ├── QUICK_START.md            # This file
    ├── SUPABASE_SETUP.md         # Detailed setup guide
    ├── DEPLOYMENT_GUIDE.md       # Vercel deployment
    └── SETUP_CHECKLIST.md        # Complete checklist
```

---

## Getting Help

### Documentation

- **This Guide**: Quick start
- **SUPABASE_SETUP.md**: Detailed Supabase setup
- **DEPLOYMENT_GUIDE.md**: Production deployment
- **SETUP_CHECKLIST.md**: Complete deployment checklist
- **CLAUDE.md**: Developer guide

### Logs & Monitoring

- **Supabase Logs**: Dashboard → Logs
- **Database Logs**: Dashboard → Database → Logs
- **Auth Logs**: Dashboard → Authentication → Logs
- **Storage Logs**: Dashboard → Storage → Logs

### Support Resources

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Prisma Docs: https://www.prisma.io/docs

---

## Security Checklist

Before deploying to production:

- [ ] `.env.local` is in `.gitignore` ✓ (already configured)
- [ ] Service role key is never exposed to client-side code
- [ ] RLS policies are enabled on all tables ✓ (included in migration)
- [ ] Database password is strong (20+ characters)
- [ ] Supabase project has 2FA enabled
- [ ] Rate limiting is configured ✓ (already implemented)

---

## Summary

You're now ready to develop with SequenceHUB!

**What You've Done:**
- ✅ Configured Supabase credentials
- ✅ Verified database connection
- ✅ Created database tables and storage buckets
- ✅ Started local development server
- ✅ Created your first user

**What's Next:**
- Add Stripe keys for payment testing
- Build features and test locally
- Deploy to Vercel when ready
- Add custom domain (optional)

---

**Total Setup Time**: ~10 minutes

**Status**: Ready for development ✅

---

For deployment to production, see **DEPLOYMENT_GUIDE.md**
