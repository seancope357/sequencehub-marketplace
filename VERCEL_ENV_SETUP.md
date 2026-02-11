# Vercel Environment Variables Setup

Your login is failing because Vercel doesn't have the required environment variables.

## Quick Fix - Add These to Vercel Dashboard:

1. Go to: https://vercel.com/sean-copes-projects-fdc95e67/sequencehub-marketplace-l4l2pcmw4/settings/environment-variables

2. Add these variables (one at a time):

### Required Variables:

**DATABASE_URL**
```
postgresql://postgres:Sm%40rt0329808%24@db.fhrregyvsmwpfkpnkocy.supabase.co:5432/postgres
```

**JWT_SECRET**
```
your-jwt-secret-key-change-in-production
```

**DOWNLOAD_SECRET**
```
49b3ebb3f6f02e09dede279c1a4d85b10e436071d67a7ca45a34fe5a4de928b5
```

**NEXT_PUBLIC_SUPABASE_URL**
```
https://fhrregyvsmwpfkpnkocy.supabase.co
```

**NEXT_PUBLIC_SUPABASE_ANON_KEY**
```
sb_publishable_R5DqHFs8qH1eZuI0EsE9Qw_qos6oJMD
```

**SUPABASE_SERVICE_ROLE_KEY**
```
AySznYGkJBVKHUTxWiDA3hjtQk7QC5wtkgzwySLmhkPHlfTN9LAKLLrxJFi2uQr9+yi/JGFQOn/ti5SSDJnmkw==
```

3. Set all variables to apply to: **Production, Preview, and Development**

4. Click "Save" after each one

5. Redeploy (or it will auto-redeploy after you save all variables)

## After Adding Variables:
Login should work with any user credentials from your database.
