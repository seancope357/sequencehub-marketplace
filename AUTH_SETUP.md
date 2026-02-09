# SequenceHUB Authentication Setup Guide

## 🔐 Overview

SequenceHUB uses a custom JWT-based authentication system with bcrypt password hashing. This guide covers setup, testing, and troubleshooting.

## 📋 Quick Setup Checklist

- [x] Database schema deployed to Supabase
- [x] JWT_SECRET configured in .env.local
- [x] Auth API endpoints implemented
- [ ] Test user registration
- [ ] Test user login
- [ ] Test auth persistence

## 🚀 Step 1: Database Setup

### Run the SQL Migration in Supabase

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: **fhrregyvsmwpfkpnkocy**
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the entire contents of `supabase-schema.sql`
6. Click **Run** (or press Ctrl/Cmd + Enter)

**Expected Result:**
```
✅ SequenceHUB database schema created successfully!
📊 Created 18 tables with full indexes and triggers
🔐 Authentication ready: User, Profile, UserRole tables
🛍️ E-commerce ready: Product, Order, Entitlement tables
💳 Stripe ready: CheckoutSession, CreatorAccount tables
📝 Audit logging ready: AuditLog, AccessLog tables
```

### Verify Tables Created

Run this query to verify:
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see 18 tables:
- AccessLog
- AuditLog
- CheckoutSession
- CreatorAccount
- DownloadToken
- Entitlement
- LegalAcceptance
- LegalDocument
- Order
- OrderItem
- Price
- Product
- ProductFile
- ProductMedia
- ProductTag
- ProductVersion
- Profile
- Tag
- User
- UserRole

## 🔑 Step 2: Environment Variables

### Your Current Configuration

```env
# Database Connection (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres:Sm%40rt0329808%24@db.fhrregyvsmwpfkpnkocy.supabase.co:5432/postgres"

# JWT Secret (Already Set ✅)
JWT_SECRET="07c42d4ede5db2dbb34364a448ddc376d493091e487a4461d44323ec6bbdf2ed"

# Download Security
DOWNLOAD_SECRET="49b3ebb3f6f02e09dede279c1a4d85b10e436071d67a7ca45a34fe5a4de928b5"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://fhrregyvsmwpfkpnkocy.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_R5DqHFs8qH1eZuI0EsE9Qw_qos6oJMD"
SUPABASE_SERVICE_ROLE_KEY="AySznYGkJBVKHUTxWiDA3hjtQk7QC5wtkgzwySLmhkPHlfTN9LAKLLrxJFi2uQr9+yi/JGFQOn/ti5SSDJnmkw=="
```

**Status:** ✅ All authentication environment variables are configured correctly!

## 🏗️ Step 3: Authentication Architecture

### Flow Diagram

```
┌─────────────┐
│  Frontend   │
│   (React)   │
└──────┬──────┘
       │
       │ POST /api/auth/register { email, password, name }
       │ POST /api/auth/login { email, password }
       │ POST /api/auth/logout
       │ GET  /api/auth/me
       │
       ▼
┌─────────────────────────────────────────────────┐
│           API Routes (Next.js)                  │
│  ┌─────────────────────────────────────────┐   │
│  │ 1. Rate Limiting (10 attempts/15 min)   │   │
│  │ 2. Input Validation (email, password)   │   │
│  │ 3. Auth Logic (lib/auth.ts)             │   │
│  │ 4. Audit Logging                        │   │
│  └─────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│              Auth Logic (lib/auth.ts)            │
│  ┌──────────────────────────────────────────┐   │
│  │ • hashPassword() - bcrypt 12 rounds     │   │
│  │ • verifyPassword() - bcrypt compare     │   │
│  │ • generateToken() - JWT signing         │   │
│  │ • verifyToken() - JWT verification      │   │
│  │ • createSession() - Login logic         │   │
│  │ • registerUser() - Registration logic   │   │
│  └──────────────────────────────────────────┘   │
└────────────────┬─────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│          Supabase PostgreSQL Database            │
│  ┌──────────────────────────────────────────┐   │
│  │ User Table:                              │   │
│  │   - id (cuid)                            │   │
│  │   - email (unique)                       │   │
│  │   - passwordHash (bcrypt)                │   │
│  │   - name, avatar, emailVerified          │   │
│  │                                          │   │
│  │ UserRole Table:                          │   │
│  │   - userId → User.id                     │   │
│  │   - role (ADMIN | CREATOR | BUYER)       │   │
│  │                                          │   │
│  │ AuditLog Table:                          │   │
│  │   - action (USER_LOGIN, USER_CREATED)    │   │
│  │   - userId, ipAddress, userAgent         │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────┐
│              HTTP-Only Cookie                    │
│  ┌──────────────────────────────────────────┐   │
│  │ auth_token = JWT(userId, email, roles)   │   │
│  │ httpOnly: true                           │   │
│  │ secure: production only                  │   │
│  │ sameSite: lax                            │   │
│  │ maxAge: 7 days                           │   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

### Key Components

#### 1. **Registration Flow** (`POST /api/auth/register`)
```typescript
// src/app/api/auth/register/route.ts
1. Rate limit check (5 attempts/hour per IP)
2. Validate email format and password length (min 8 chars)
3. Check if user exists
4. Hash password with bcrypt (12 rounds)
5. Create user with BUYER role
6. Generate JWT token
7. Set HTTP-only cookie
8. Create audit log entry
9. Send welcome email (async, non-blocking)
10. Return user data (without passwordHash)
```

#### 2. **Login Flow** (`POST /api/auth/login`)
```typescript
// src/app/api/auth/login/route.ts
1. Rate limit check (10 attempts/15 min per IP)
2. Validate input (email, password required)
3. Find user by email
4. Verify password with bcrypt.compare()
5. Generate JWT token (userId, email, roles)
6. Set HTTP-only cookie
7. Create audit log entry
8. Return user data (without passwordHash)
```

#### 3. **Session Persistence**
```typescript
// src/lib/auth.ts - getCurrentUser()
1. Read 'auth_token' from HTTP-only cookie
2. Verify JWT signature with JWT_SECRET
3. Extract userId from payload
4. Fetch user from database (include roles, profile)
5. Return user data (without passwordHash)
```

#### 4. **Security Features**
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT tokens with 7-day expiry
- ✅ HTTP-only cookies (XSS protection)
- ✅ SameSite=lax (CSRF protection)
- ✅ Rate limiting on auth endpoints
- ✅ Audit logging for all auth events
- ✅ Email verification field (ready for future)
- ✅ IP address and user agent tracking

## 🧪 Step 4: Testing

### Test Registration

#### Using Browser (Recommended)

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Open: http://localhost:3000/auth/register

3. Fill in the form:
   - Name: `Test User`
   - Email: `test@example.com`
   - Password: `password123`
   - Confirm Password: `password123`

4. Click **Create Account**

5. **Expected Result:**
   - ✅ Success toast: "Welcome, Test User!"
   - ✅ Redirect to `/onboarding` or `/dashboard`
   - ✅ User logged in automatically

#### Using cURL

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "name": "Test User"
  }'
```

**Expected Response (201 Created):**
```json
{
  "user": {
    "id": "clxyz123abc...",
    "email": "test@example.com",
    "name": "Test User",
    "roles": [
      {
        "id": "clxyz456def...",
        "role": "BUYER",
        "userId": "clxyz123abc...",
        "createdAt": "2026-02-08T..."
      }
    ]
  }
}
```

### Test Login

#### Using Browser (Recommended)

1. Open: http://localhost:3000/auth/login

2. Fill in the form:
   - Email: `test@example.com`
   - Password: `password123`

3. Click **Sign In**

4. **Expected Result:**
   - ✅ Success toast: "Welcome back, Test User!"
   - ✅ Redirect to `/dashboard`
   - ✅ User logged in

#### Using cURL

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }' \
  -c cookies.txt
```

**Expected Response (200 OK):**
```json
{
  "user": {
    "id": "clxyz123abc...",
    "email": "test@example.com",
    "name": "Test User",
    "roles": [...]
  }
}
```

### Test Session Persistence

```bash
# Use the cookie from login
curl http://localhost:3000/api/auth/me \
  -b cookies.txt
```

**Expected Response (200 OK):**
```json
{
  "user": {
    "id": "clxyz123abc...",
    "email": "test@example.com",
    "name": "Test User",
    "roles": [...],
    "emailVerified": false,
    "createdAt": "2026-02-08T...",
    "updatedAt": "2026-02-08T..."
  }
}
```

### Verify Database

Check the database to confirm user was created:

```sql
-- Check user was created
SELECT id, email, name, "emailVerified", "createdAt"
FROM "User"
WHERE email = 'test@example.com';

-- Check role was assigned
SELECT u.email, ur.role
FROM "User" u
JOIN "UserRole" ur ON u.id = ur."userId"
WHERE u.email = 'test@example.com';

-- Check audit log
SELECT action, "entityType", "ipAddress", "createdAt"
FROM "AuditLog"
WHERE "userId" = (SELECT id FROM "User" WHERE email = 'test@example.com')
ORDER BY "createdAt" DESC;
```

**Expected Results:**
```
User table:
- id: clxyz123abc...
- email: test@example.com
- name: Test User
- emailVerified: false
- passwordHash: $2a$12$... (bcrypt hash)

UserRole table:
- role: BUYER

AuditLog table:
- USER_CREATED
- USER_LOGIN (if you also tested login)
```

## 🐛 Troubleshooting

### Issue: "Invalid email or password"

**Possible Causes:**
1. User doesn't exist in database
2. Password is incorrect
3. Database connection issue

**Debug Steps:**
```sql
-- Check if user exists
SELECT id, email FROM "User" WHERE email = 'test@example.com';

-- Check password hash (should start with $2a$12$)
SELECT "passwordHash" FROM "User" WHERE email = 'test@example.com';
```

### Issue: "Too many login attempts"

**Cause:** Rate limiting triggered (10 attempts per 15 minutes)

**Solution:**
- Wait 15 minutes, or
- Temporarily disable rate limiting:
  ```env
  # Add to .env.local (TESTING ONLY!)
  RATE_LIMIT_DISABLED=true
  ```

### Issue: "User with this email already exists"

**Cause:** User already registered

**Solution:**
- Use a different email, or
- Delete the user from database:
  ```sql
  DELETE FROM "User" WHERE email = 'test@example.com';
  ```

### Issue: "Internal server error"

**Possible Causes:**
1. Database connection failed
2. JWT_SECRET not set
3. bcrypt module error

**Debug Steps:**
1. Check database connection:
   ```bash
   # Test with Prisma CLI
   npx prisma db push
   ```

2. Verify JWT_SECRET is set:
   ```bash
   # Should output your secret
   grep JWT_SECRET .env.local
   ```

3. Check server logs:
   ```bash
   # Look for errors in terminal
   npm run dev
   ```

### Issue: "Cannot find module 'bcryptjs'"

**Cause:** Missing dependency

**Solution:**
```bash
npm install bcryptjs
npm install --save-dev @types/bcryptjs
```

## 🔒 Security Best Practices

### ✅ Current Implementation

1. **Password Hashing:** bcrypt with 12 rounds (industry standard)
2. **JWT Storage:** HTTP-only cookies (XSS protection)
3. **Token Expiry:** 7 days (balance security/UX)
4. **Rate Limiting:** Prevents brute force attacks
5. **Audit Logging:** Tracks all auth events
6. **Input Validation:** Email format, password length

### 🚀 Future Enhancements

1. **Email Verification:**
   - Send verification email after registration
   - Require email verification before full access
   - Already has `emailVerified` field in database

2. **Password Reset:**
   - Add "Forgot Password" flow
   - Send reset token via email
   - Expire tokens after 1 hour

3. **Two-Factor Authentication:**
   - Add TOTP support
   - SMS backup codes
   - Recovery codes

4. **Session Management:**
   - Multiple device support
   - "Log out all devices" feature
   - Session activity tracking

5. **Social Login:**
   - Google OAuth
   - GitHub OAuth
   - Facebook OAuth

## 📊 Database Schema Reference

### User Table
```sql
CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,                    -- cuid() generated
  "email" TEXT UNIQUE NOT NULL,             -- Unique email
  "passwordHash" TEXT NOT NULL,             -- bcrypt hash
  "name" TEXT,                              -- Display name
  "emailVerified" BOOLEAN DEFAULT false,    -- Email verification status
  "avatar" TEXT,                            -- Avatar URL
  "createdAt" TIMESTAMP DEFAULT NOW(),      -- Account creation date
  "updatedAt" TIMESTAMP DEFAULT NOW()       -- Last update
);
```

### UserRole Table
```sql
CREATE TABLE "UserRole" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,                   -- References User.id
  "role" "Role" NOT NULL,                   -- ADMIN | CREATOR | BUYER
  "createdAt" TIMESTAMP DEFAULT NOW(),

  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("userId", "role")                 -- User can have multiple roles
);
```

### AuditLog Table
```sql
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,                            -- References User.id
  "action" "AuditAction" NOT NULL,          -- USER_LOGIN, USER_CREATED, etc.
  "entityType" TEXT,                        -- 'user', 'product', etc.
  "entityId" TEXT,                          -- ID of affected entity
  "ipAddress" TEXT,                         -- Request IP
  "userAgent" TEXT,                         -- Browser/client info
  "createdAt" TIMESTAMP DEFAULT NOW()
);
```

## 🎯 Next Steps

1. [ ] Run SQL migration in Supabase
2. [ ] Test registration in browser
3. [ ] Test login in browser
4. [ ] Verify database records
5. [ ] Test session persistence
6. [ ] Review audit logs
7. [ ] (Optional) Set up email verification
8. [ ] (Optional) Add password reset flow

## 📚 Additional Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **Supabase Docs:** https://supabase.com/docs
- **JWT Docs:** https://jwt.io/introduction
- **bcrypt Docs:** https://www.npmjs.com/package/bcryptjs
- **Next.js Auth:** https://nextjs.org/docs/authentication

## 🆘 Need Help?

If you encounter issues not covered here:

1. Check server logs (`npm run dev` output)
2. Check browser console for errors
3. Verify database connection in Supabase Dashboard
4. Review Prisma schema matches database
5. Test with cURL to isolate frontend vs backend issues

---

**Last Updated:** 2026-02-08
**Auth System Version:** v1.0.0
**Status:** ✅ Ready for Testing
