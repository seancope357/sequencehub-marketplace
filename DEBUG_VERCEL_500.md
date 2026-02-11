# How to Debug the 500 Error on Vercel

## The Issue
Your build succeeds, but you get a 500 error when trying to login. This means there's a **runtime error**, not a build error.

## Step 1: Check Vercel Runtime Logs

### Go to Vercel Dashboard:
1. https://vercel.com/dashboard
2. Click your project: `sequencehub-marketplace`
3. Click "Deployments"
4. Click the latest deployment (the one with green checkmark)
5. Click **"Runtime Logs"** tab

### Try to Login:
1. Open your Vercel URL: `https://sequencehub-marketplace-xxx.vercel.app/auth/login`
2. Enter credentials and click login
3. Watch the Runtime Logs in real-time

### What to Look For:
The logs will show the EXACT error, like:
```
[Login] Creating session for: user@example.com
CRITICAL: DATABASE_URL not set
```
or
```
Error: connect ECONNREFUSED
```
or
```
PrismaClientInitializationError: Can't reach database server
```

## Step 2: Verify Environment Variables

### Check These Variables Are Set:
Go to: Project Settings → Environment Variables

**Required for login:**
- ✅ `DATABASE_URL` (PostgreSQL connection string)
- ✅ `JWT_SECRET` (or it will use default)
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`

### Common Issues:

**1. JWT_SECRET not set:**
```bash
# Add this:
JWT_SECRET=your-jwt-secret-key-change-in-production
```

**2. DATABASE_URL has wrong format:**
```bash
# Should be:
postgresql://postgres:PASSWORD@db.xxxxx.supabase.co:5432/postgres

# NOT:
postgres://... (missing 'ql')
```

**3. Environment not selected:**
- Make sure you selected "Production, Preview, Development" when adding variables
- If you only selected "Production", preview deployments will fail

## Step 3: Test Database Connection

### Option A: Use the test endpoint
Visit: `https://your-vercel-url.vercel.app/api/auth/test`

This will test:
- Database connection
- User lookup
- Password hashing

### Option B: Check Prisma
The error might be:
```
PrismaClientInitializationError
```

This means Prisma can't connect to the database.

**Fix:** Verify `DATABASE_URL` is correct and accessible from Vercel.

## Step 4: Common Causes

### Cause 1: Missing JWT_SECRET
**Symptom:** 500 error on login
**Fix:** Add `JWT_SECRET` to Vercel env vars

### Cause 2: Wrong DATABASE_URL
**Symptom:** "Can't reach database server"
**Fix:**
1. Go to Supabase → Settings → Database
2. Copy "Connection string (URI)"
3. Replace PASSWORD with your actual password
4. URL encode special characters (@ = %40, $ = %24)

### Cause 3: Supabase IP Restrictions
**Symptom:** Connection timeout
**Fix:**
1. Go to Supabase → Settings → Database
2. Check "Allow connections from anywhere" or add Vercel IPs

### Cause 4: Rate Limiting
**Symptom:** 429 error (but you're getting 500, so not this)

### Cause 5: Prisma Client Not Generated
**Symptom:** "Cannot find module '@prisma/client'"
**Fix:** This should be automatic, but if not:
```json
// package.json
"scripts": {
  "postinstall": "prisma generate"
}
```

## Step 5: Quick Debug Method

### Add this to see what's failing:

I already added detailed logging to your login endpoint. The logs will show:
```
[Login] Attempting login for: user@example.com
[Login] Creating session...
[Login] Session result: Success
```

If you see one of these messages but not the next, that's where it's failing.

## Step 6: Nuclear Option - Redeploy

If env vars were just added:
1. Go to Vercel Dashboard
2. Go to your latest deployment
3. Click the three dots (...)
4. Click "Redeploy"
5. Check "Use existing build cache" = OFF
6. Click "Redeploy"

## What to Send Me

To help debug, I need to see:

1. **Runtime logs** from Vercel (copy/paste the error)
2. **Screenshot** of your Environment Variables page (blur sensitive values)
3. **The exact error** from browser console

## Most Likely Issue

Based on our conversation, I bet it's one of these:

1. **JWT_SECRET is not actually set in Vercel**
   - You said you added it, but double-check it's there
   - Make sure it's applied to "Production"

2. **DATABASE_URL has special characters not URL encoded**
   - Your password is `Sm@rt0329808$`
   - Should be: `Sm%40rt0329808%24`
   - Check if Vercel has the encoded version

3. **Prisma can't connect**
   - Check Supabase allows connections from Vercel
   - Check DATABASE_URL is exact match from Supabase

## Next Steps

1. Open Vercel Runtime Logs
2. Try to login
3. Copy the error message
4. Send it to me

I'll immediately know what's wrong from the error message! 🔍
