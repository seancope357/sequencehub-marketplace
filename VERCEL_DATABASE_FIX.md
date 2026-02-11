# 🔴 URGENT: Fix Vercel Database Connection

## The Error
```
Can't reach database server at `db.fhrregyvsmwpfkpnkocy.supabase.co:5432`
```

## Why This Happens
Vercel is **serverless** - it creates new connections for every request. Supabase has a limited number of direct connections (default: 15-60).

When you use **direct connection (port 5432)**, Vercel exhausts all connections and gets blocked.

## The Solution: Connection Pooler

Supabase provides a **connection pooler** (PgBouncer) that handles thousands of connections.

### ✅ Update DATABASE_URL in Vercel:

**WRONG (what you have now):**
```
postgresql://postgres:Sm%40rt0329808%24@db.fhrregyvsmwpfkpnkocy.supabase.co:5432/postgres
```

**CORRECT (what you need):**
```
postgresql://postgres:Sm%40rt0329808%24@db.fhrregyvsmwpfkpnkocy.supabase.co:6543/postgres?pgbouncer=true
```

**Changes:**
1. Port: `5432` → `6543` (connection pooler port)
2. Added: `?pgbouncer=true` (tells Prisma to use transaction mode)

## How to Update in Vercel

### Step 1: Go to Environment Variables
1. https://vercel.com/dashboard
2. Click your project → Settings → Environment Variables
3. Find `DATABASE_URL`
4. Click "Edit"

### Step 2: Update the Value
Replace the entire value with:
```
postgresql://postgres:Sm%40rt0329808%24@db.fhrregyvsmwpfkpnkocy.supabase.co:6543/postgres?pgbouncer=true
```

### Step 3: Save and Redeploy
1. Click "Save"
2. Go to Deployments
3. Click latest deployment → Three dots → "Redeploy"
4. Uncheck "Use existing build cache"
5. Click "Redeploy"

## How to Get This URL from Supabase

### Option 1: Manual Construction
Your current URL:
```
postgresql://postgres:PASSWORD@db.fhrregyvsmwpfkpnkocy.supabase.co:5432/postgres
```

Change to:
```
postgresql://postgres:PASSWORD@db.fhrregyvsmwpfkpnkocy.supabase.co:6543/postgres?pgbouncer=true
```

### Option 2: From Supabase Dashboard
1. Go to: https://app.supabase.com/project/fhrregyvsmwpfkpnkocy/settings/database
2. Look for **"Connection Pooling"** section (NOT "Connection string")
3. Click "Connection string"
4. Select "Transaction" mode
5. Copy the URI (it will have port 6543)
6. Replace `[YOUR-PASSWORD]` with: `Sm%40rt0329808%24`

## Why Port 6543?

| Port | Type | Use Case | Max Connections |
|------|------|----------|----------------|
| 5432 | Direct PostgreSQL | Local dev, migrations | 15-60 |
| 6543 | PgBouncer Pooler | Production, Vercel | Thousands |

## What is pgbouncer=true?

This tells Prisma to use **transaction mode** instead of **session mode**:
- **Session mode** (default): Holds connection for entire session - BAD for serverless
- **Transaction mode** (pgbouncer=true): Releases connection after each transaction - GOOD for serverless

## After You Update

### Test Login:
1. Wait ~2 minutes for deployment
2. Go to your Vercel URL
3. Try to login
4. Should work! ✅

### If It Still Fails:

**Check Supabase Connection Pooler is Enabled:**
1. Go to: https://app.supabase.com/project/fhrregyvsmwpfkpnkocy/settings/database
2. Scroll to "Connection Pooling"
3. Make sure it says "Enabled" (it should be by default)

**Check Vercel Can Reach Supabase:**
1. Supabase Dashboard → Settings → Database
2. Check "Network Restrictions"
3. Make sure it's NOT blocking Vercel IPs
4. Should say "Allow all IPv4 connections" or have Vercel IPs whitelisted

## Local Development

For local development, you CAN use direct connection (5432) since you only have 1 connection.

Your `.env` file now has both:
```bash
# For Vercel (pooler)
DATABASE_URL="postgresql://postgres:Sm%40rt0329808%24@db.fhrregyvsmwpfkpnkocy.supabase.co:6543/postgres?pgbouncer=true"

# For local dev (direct) - optional
# DATABASE_URL_DIRECT="postgresql://postgres:Sm%40rt0329808%24@db.fhrregyvsmwpfkpnkocy.supabase.co:5432/postgres"
```

## Summary

**Problem:** Vercel can't connect to Supabase (port 5432 direct connection)
**Solution:** Use connection pooler (port 6543) with `?pgbouncer=true`
**Action:** Update `DATABASE_URL` in Vercel environment variables

Once you update and redeploy, login will work! 🚀
