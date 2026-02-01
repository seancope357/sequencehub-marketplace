# Supabase Migration Plan for SequenceHUB

## Executive Summary

This document outlines the complete migration from custom JWT authentication + SQLite/PostgreSQL + Cloudflare R2 to a full Supabase stack (Supabase Auth + PostgreSQL + Storage) for the SequenceHUB marketplace platform.

**Migration Scope:**
- Authentication: Custom JWT → Supabase Auth
- Database: SQLite/Prisma → Supabase PostgreSQL + Prisma (recommended) or Supabase client
- Storage: Cloudflare R2/Local → Supabase Storage
- Payments: Stripe Connect integration update for Supabase user IDs

**Critical Requirements:**
- Zero data loss
- Minimal downtime (< 5 minutes)
- Password security maintained
- Role-based access control preserved
- All 17 database models migrated
- Stripe webhooks continue functioning
- Full rollback capability

---

## Architecture Overview

### Current State
```
┌─────────────────────────────────────────────────────────┐
│ Current Architecture                                    │
├─────────────────────────────────────────────────────────┤
│ Auth:      Custom JWT (bcrypt, HTTP-only cookies)      │
│ Database:  SQLite (dev) / PostgreSQL (prod) + Prisma   │
│ Storage:   Local filesystem (dev) / Cloudflare R2      │
│ Payments:  Stripe Connect Express (unchanged)          │
└─────────────────────────────────────────────────────────┘
```

### Target State
```
┌─────────────────────────────────────────────────────────┐
│ Supabase Architecture                                   │
├─────────────────────────────────────────────────────────┤
│ Auth:      Supabase Auth (built-in session mgmt)       │
│ Database:  Supabase PostgreSQL + Prisma ORM            │
│ Storage:   Supabase Storage (with RLS policies)        │
│ Payments:  Stripe Connect Express (user ID mapping)    │
│ Security:  Row Level Security (RLS) on all tables      │
└─────────────────────────────────────────────────────────┘
```

---

## Migration Strategy

### Phase 1: Preparation (Week 1)
1. **Supabase Project Setup**
   - Create Supabase project
   - Configure authentication settings
   - Create storage buckets
   - Set up development/staging environments

2. **Code Preparation**
   - Install Supabase dependencies
   - Create Supabase client wrapper
   - Create migration scripts
   - Update environment variables

3. **Testing Environment**
   - Set up staging environment
   - Create test data migration
   - Validate RLS policies

### Phase 2: Database Migration (Week 2)
1. **Schema Migration**
   - Run Supabase SQL schema migration
   - Apply RLS policies
   - Create indexes and constraints

2. **Data Migration**
   - Export production data
   - Transform user passwords (see security section)
   - Import to Supabase PostgreSQL
   - Validate data integrity

### Phase 3: Code Updates (Week 2-3)
1. **Authentication Layer**
   - Replace JWT auth with Supabase Auth
   - Update auth context
   - Update all API routes
   - Implement custom claims for roles

2. **Storage Layer**
   - Replace R2 client with Supabase Storage
   - Update upload API
   - Migrate existing files
   - Update download signed URLs

3. **Stripe Integration**
   - Update checkout to use Supabase user IDs
   - Update webhook handlers
   - Validate payment flows

### Phase 4: Testing & Deployment (Week 4)
1. **Comprehensive Testing**
   - Authentication flows
   - Authorization checks
   - File upload/download
   - Payment processing
   - Webhook handling

2. **Production Deployment**
   - Deploy to Vercel
   - Run production migration
   - Monitor for issues
   - Verify all systems operational

---

## Security Considerations

### Password Migration Strategy

**CRITICAL**: Supabase Auth manages its own password hashing. We **cannot** directly migrate bcrypt hashes.

**Options:**

#### Option 1: Force Password Reset (Recommended for Security)
1. Migrate user accounts WITHOUT passwords
2. Mark accounts as `email_confirmed = false`
3. Send password reset emails via Supabase
4. Users set new passwords on first login

**Pros:**
- Most secure (fresh passwords)
- No password hash compatibility issues
- Clean slate for authentication

**Cons:**
- User friction (must reset password)
- Requires email infrastructure

#### Option 2: Temporary Bridge Authentication
1. Keep custom JWT auth for 30 days
2. On successful login, create Supabase account with same password
3. Migrate user to Supabase Auth
4. After 30 days, disable custom auth

**Pros:**
- Seamless user experience
- Gradual migration

**Cons:**
- Complex implementation
- Maintains two auth systems temporarily
- Security risk if not managed properly

#### Option 3: Supabase Auth Hooks (Advanced)
1. Use Supabase Auth Hooks to verify bcrypt passwords
2. Create custom hook endpoint that validates against old hashes
3. Migrate passwords on first successful login

**Pros:**
- No user friction
- Secure password verification

**Cons:**
- Complex custom implementation
- Requires Supabase Pro plan ($25/month)

**RECOMMENDATION**: Use Option 1 (Force Password Reset) for clean, secure migration.

### Role-Based Access Control (RBAC)

Supabase Auth doesn't have built-in roles. Implementation strategy:

**Solution: Custom Claims + RLS Policies**

1. Store roles in `user_roles` table
2. Use Supabase custom claims (app_metadata)
3. Create PostgreSQL functions for role checks
4. Apply RLS policies using role functions

Example:
```sql
-- Function to check user role
CREATE OR REPLACE FUNCTION auth.has_role(role_name text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policy example
CREATE POLICY "Creators can update their own products"
ON products FOR UPDATE
USING (creator_id = auth.uid() OR auth.has_role('ADMIN'));
```

### Audit Logging

**Strategy**: Maintain existing AuditLog model + Supabase triggers

1. Keep Prisma AuditLog model
2. Add PostgreSQL triggers for automatic audit logging
3. Use Supabase Realtime for live audit monitoring
4. Preserve all existing audit actions

### Download Security

**Transition from Custom Signed URLs to Supabase Storage Signed URLs**

Current:
```typescript
// Custom HMAC signature
const signature = HMAC(data, DOWNLOAD_SECRET);
const url = `/api/media/${key}?expires=${time}&signature=${sig}`;
```

New:
```typescript
// Supabase Storage signed URLs
const { data } = await supabase.storage
  .from('product-files')
  .createSignedUrl(storageKey, 300); // 5 min TTL
```

**Migration Steps:**
1. Update `DownloadToken` model to use Supabase signed URLs
2. Keep entitlement checks in API layer
3. Maintain rate limiting (10/day)
4. Preserve AccessLog tracking

---

## Database Migration Details

### Schema Mapping

**17 Prisma Models → Supabase PostgreSQL + RLS**

| Current Model | Supabase Strategy | RLS Policy |
|---------------|-------------------|------------|
| User | Supabase auth.users + public.users | Users can read/update own data |
| Profile | public.profiles | Users can read all, update own |
| UserRole | public.user_roles | Admin only write, users read own |
| CreatorAccount | public.creator_accounts | Users read/update own |
| Product | public.products | Creators CRUD own, all read published |
| ProductVersion | public.product_versions | Creators CRUD via product ownership |
| ProductFile | public.product_files | Creators CRUD via product ownership |
| ProductMedia | public.product_media | Creators CRUD via product ownership |
| Tag | public.tags | All read, admin write |
| ProductTag | public.product_tags | Creators write via product ownership |
| Price | public.prices | Creators CRUD via product ownership |
| CheckoutSession | public.checkout_sessions | Users read own, system write |
| Order | public.orders | Users read own, system write |
| OrderItem | public.order_items | Users read via order ownership |
| Entitlement | public.entitlements | Users read own, system write |
| DownloadToken | public.download_tokens | Users read own, system write |
| AccessLog | public.access_logs | Admin read all, system write |
| AuditLog | public.audit_logs | Admin read all, system write |

### Foreign Key Updates

**Critical**: Replace `userId` foreign keys to point to `auth.uid()`

```sql
-- Before (Prisma)
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  creator_id TEXT REFERENCES users(id)
);

-- After (Supabase)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id),
  -- RLS policy
  CONSTRAINT creator_check CHECK (creator_id = auth.uid())
);
```

### Data Type Migrations

| Prisma Type | PostgreSQL Type | Migration Notes |
|-------------|-----------------|-----------------|
| String @id @default(cuid()) | UUID PRIMARY KEY DEFAULT gen_random_uuid() | CUID → UUID conversion required |
| DateTime | TIMESTAMPTZ | Direct mapping |
| Float | NUMERIC(10,2) | For currency values |
| Int | INTEGER | Direct mapping |
| Boolean | BOOLEAN | Direct mapping |
| String (long text) | TEXT | Direct mapping |
| Json | JSONB | Better indexing in PostgreSQL |

---

## Storage Migration

### Bucket Structure

**Supabase Storage Buckets:**

1. **product-files** (Private)
   - Access: RLS policies based on entitlements
   - File types: FSEQ, XSQ, XML, XMODEL
   - Max size: 500MB per file

2. **product-media** (Public)
   - Access: Public read, creator write
   - File types: Images, videos, previews
   - Max size: 10MB per file

3. **user-avatars** (Public)
   - Access: Public read, user write
   - File types: Images only
   - Max size: 2MB per file

### File Migration Script

**Process:**
1. Download all files from R2/local storage
2. Upload to Supabase Storage buckets
3. Update `ProductFile` and `ProductMedia` records with new storage keys
4. Verify file integrity (SHA-256 hash matching)
5. Delete from old storage after verification

**Estimated Time:**
- 1000 files × 50MB average = ~2 hours (depends on network speed)

### Storage Policies (RLS)

```sql
-- product-files bucket: Only entitled users can read
CREATE POLICY "Users can read entitled files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-files' AND
  EXISTS (
    SELECT 1 FROM entitlements e
    JOIN product_files pf ON pf.version_id = e.version_id
    WHERE pf.storage_key = name
    AND e.user_id = auth.uid()
    AND e.is_active = true
  )
);

-- product-media bucket: Public read, creator write
CREATE POLICY "Public can read media"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-media');

CREATE POLICY "Creators can upload media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-media' AND
  auth.has_role('CREATOR')
);
```

---

## Stripe Integration Updates

### User ID Mapping

**Challenge**: Stripe metadata contains old custom user IDs

**Solution**:
1. Create user ID mapping table during migration
2. Update Stripe webhook handler to map IDs
3. Update Stripe metadata on all future transactions

```typescript
// Migration mapping table
CREATE TABLE user_id_migrations (
  old_user_id TEXT PRIMARY KEY,
  new_user_id UUID REFERENCES auth.users(id),
  migrated_at TIMESTAMPTZ DEFAULT now()
);

// Webhook handler update
async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  let userId = session.metadata?.userId;

  // Map old user ID to new Supabase user ID
  if (userId && !isUUID(userId)) {
    const mapping = await supabase
      .from('user_id_migrations')
      .select('new_user_id')
      .eq('old_user_id', userId)
      .single();
    userId = mapping.data?.new_user_id;
  }

  // Continue with order creation...
}
```

### Checkout Flow Updates

**Before:**
```typescript
const user = await getCurrentUser(); // Custom JWT
const userId = user.id; // CUID
```

**After:**
```typescript
const { data: { user } } = await supabase.auth.getUser();
const userId = user.id; // UUID from Supabase Auth
```

### Creator Onboarding (No Changes)

Stripe Connect integration remains unchanged:
- `stripeAccountId` stored in `creator_accounts` table
- Platform fee calculations remain the same
- Webhook signature verification identical

---

## API Route Migration

### Authentication Middleware

**Before:** `/Users/cope/SHUB-V1/src/lib/auth.ts:62-94`
```typescript
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.userId },
    include: { roles: true, profile: true }
  });

  return user;
}
```

**After:**
```typescript
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createServerClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Fetch user roles from database
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata?.name,
    roles: roles || [],
    profile: user.user_metadata?.profile,
  };
}
```

### Protected Route Pattern

**Before:**
```typescript
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // ... route logic
}
```

**After:**
```typescript
export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // ... route logic
}
```

### Routes Requiring Updates

1. `/api/auth/*` - Complete rewrite using Supabase Auth
2. `/api/products/*` - Update auth checks
3. `/api/dashboard/*` - Update auth checks
4. `/api/library/*` - Update auth checks
5. `/api/checkout/*` - Update user ID handling
6. `/api/webhooks/stripe` - Update user ID mapping
7. `/api/media/*` - Update signed URL generation

---

## Environment Variables

### New Variables (Supabase)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...  # Public, safe for client-side
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...      # Secret, server-side only

# Database (Supabase PostgreSQL with connection pooling)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# For Prisma connection pooling (recommended)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres
```

### Variables to Remove
```bash
# No longer needed with Supabase Auth
JWT_SECRET=...  # Remove

# No longer needed with Supabase Storage
R2_ENDPOINT=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=...
```

### Variables to Keep
```bash
# Stripe (unchanged)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Download security (still needed for entitlement checks)
DOWNLOAD_SECRET=...  # Keep for additional download verification

# Application
NEXT_PUBLIC_BASE_URL=https://sequencehub.com
NODE_ENV=production
```

---

## Deployment Configuration

### Vercel Configuration

**File:** `/vercel.json`
```json
{
  "buildCommand": "prisma generate && next build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-role-key",
    "DATABASE_URL": "@supabase-database-url",
    "DIRECT_URL": "@supabase-direct-url",
    "STRIPE_SECRET_KEY": "@stripe-secret-key",
    "STRIPE_WEBHOOK_SECRET": "@stripe-webhook-secret",
    "DOWNLOAD_SECRET": "@download-secret"
  },
  "functions": {
    "api/**/*": {
      "maxDuration": 30
    },
    "api/webhooks/*": {
      "maxDuration": 60
    }
  }
}
```

### Prisma Configuration

**File:** `/prisma/schema.prisma` (Update datasource)
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Supabase Project Setup Checklist

- [ ] Create Supabase project (Organization: SequenceHUB)
- [ ] Enable Email Auth provider
- [ ] Configure email templates (welcome, reset password)
- [ ] Set up custom SMTP (optional, recommended for production)
- [ ] Create storage buckets: `product-files`, `product-media`, `user-avatars`
- [ ] Configure bucket CORS policies
- [ ] Set up database backups (automatic on Supabase Pro)
- [ ] Enable Realtime (optional, for live updates)
- [ ] Configure rate limiting (Supabase Auth settings)
- [ ] Set up database webhooks (optional, for audit logging)

---

## Testing Checklist

### Pre-Migration Testing (Staging)

#### Authentication
- [ ] User registration creates Supabase Auth account
- [ ] User login returns Supabase session
- [ ] User logout clears Supabase session
- [ ] Password reset flow works
- [ ] Role assignment works (ADMIN, CREATOR, BUYER)
- [ ] Role checks work in API routes

#### Authorization
- [ ] Users can only access their own data
- [ ] Creators can only edit their own products
- [ ] Admins can access all data
- [ ] RLS policies prevent unauthorized access
- [ ] Database queries respect user context

#### Storage
- [ ] File upload to Supabase Storage works
- [ ] File download with signed URLs works
- [ ] Entitlement checks work before download
- [ ] Rate limiting (10 downloads/day) works
- [ ] File deletion removes from Supabase Storage

#### Payments
- [ ] Checkout session creation works
- [ ] Stripe webhook processing works
- [ ] Order creation works with Supabase user IDs
- [ ] Entitlements grant access correctly
- [ ] Refunds revoke entitlements

#### Database
- [ ] All 17 models accessible
- [ ] Foreign key relationships intact
- [ ] Indexes improve query performance
- [ ] RLS policies enforced on all tables
- [ ] Audit logging captures all actions

### Post-Migration Validation (Production)

- [ ] All users can login (or reset password)
- [ ] All products visible on marketplace
- [ ] All orders accessible in user libraries
- [ ] All entitlements grant download access
- [ ] All creator accounts have Stripe connected
- [ ] All files downloadable
- [ ] All payments process correctly
- [ ] All webhooks process successfully
- [ ] No data loss detected
- [ ] Performance metrics acceptable

---

## Rollback Procedures

### Immediate Rollback (< 1 hour after migration)

**If critical issues detected:**

1. **Restore Vercel deployment**
   ```bash
   vercel rollback
   ```

2. **Restore database** (if schema changed)
   ```bash
   # Restore from pre-migration backup
   pg_restore -d sequencehub sequencehub_pre_migration.dump
   ```

3. **Restore environment variables**
   ```bash
   # Revert to old .env configuration
   cp .env.backup .env
   vercel env rm NEXT_PUBLIC_SUPABASE_URL production
   vercel env add JWT_SECRET production
   ```

4. **Verify old system operational**
   - Test authentication
   - Test payment processing
   - Test file downloads

### Partial Rollback (Keep database, revert auth)

**If only auth issues:**

1. Revert auth code to custom JWT
2. Keep Supabase database (PostgreSQL compatible)
3. Keep Prisma configuration
4. Disable Supabase Auth in project settings

### Data Recovery

**If data loss detected:**

1. **Database**: Restore from Supabase automatic backup (last 7 days)
2. **Files**: Restore from R2 backup (maintain for 30 days post-migration)
3. **Users**: Force password reset for all accounts

---

## Migration Timeline

### Week 1: Preparation
- **Day 1-2**: Supabase project setup, environment configuration
- **Day 3-4**: Create migration scripts, RLS policies
- **Day 5**: Staging environment setup, test migration

### Week 2: Database Migration
- **Day 1-2**: Schema migration to Supabase PostgreSQL
- **Day 3-4**: Data migration, validation
- **Day 5**: RLS policy testing, performance tuning

### Week 3: Code Updates
- **Day 1-2**: Auth layer updates (Supabase Auth integration)
- **Day 3-4**: Storage layer updates (Supabase Storage)
- **Day 5**: Stripe integration updates

### Week 4: Testing & Deployment
- **Day 1-3**: Comprehensive testing (staging)
- **Day 4**: Production deployment (off-peak hours)
- **Day 5**: Monitoring, issue resolution

**Total Duration**: 4 weeks
**Production Downtime**: 5-15 minutes (during deployment)

---

## Success Criteria

Migration is considered successful when:

- [x] Zero data loss (all 17 models migrated)
- [x] All users can authenticate (login or password reset)
- [x] All role-based access controls working
- [x] All file uploads/downloads functional
- [x] All Stripe payments processing correctly
- [x] All RLS policies enforced
- [x] All audit logging preserved
- [x] Performance equal or better than current system
- [x] No critical bugs in production for 7 days
- [x] Rollback capability tested and verified

---

## Risk Mitigation

### High-Risk Areas

1. **Password Migration**
   - **Risk**: User lockout
   - **Mitigation**: Force password reset, email notifications, 24/7 support

2. **User ID Changes (CUID → UUID)**
   - **Risk**: Broken Stripe metadata references
   - **Mitigation**: User ID mapping table, webhook updates

3. **File Migration**
   - **Risk**: File corruption, missing files
   - **Mitigation**: SHA-256 verification, R2 backup retention (30 days)

4. **RLS Policy Bugs**
   - **Risk**: Unauthorized data access
   - **Mitigation**: Comprehensive RLS testing, security audit

5. **Webhook Failures**
   - **Risk**: Lost payments, missing entitlements
   - **Mitigation**: Webhook logging, manual reconciliation process

### Contingency Plans

- **Auth Failure**: Temporary fallback to custom JWT (2-system operation)
- **Database Issues**: Immediate rollback to pre-migration state
- **Storage Issues**: Serve files from R2 backup
- **Payment Issues**: Manual order processing, Stripe dashboard verification

---

## Support & Monitoring

### Post-Migration Monitoring (First 7 Days)

1. **Error Tracking**
   - Sentry/LogRocket for client-side errors
   - Supabase logs for database errors
   - Vercel logs for API errors

2. **Performance Monitoring**
   - Page load times
   - API response times
   - Database query performance
   - Storage download speeds

3. **User Feedback**
   - Support ticket volume
   - User complaints about login issues
   - Payment processing delays

4. **Security Monitoring**
   - Unauthorized access attempts
   - RLS policy violations
   - Unusual download patterns

### Communication Plan

**Pre-Migration (1 week before):**
- Email all users about maintenance window
- Post banner on website
- Update social media

**During Migration:**
- Status page updates every 15 minutes
- Email notification when complete

**Post-Migration:**
- Email users about password reset (if needed)
- Blog post about new features (Supabase benefits)
- Support documentation updates

---

## Next Steps

1. Review this migration plan with team
2. Get approval from stakeholders
3. Create Supabase project in development
4. Run test migration with seed data
5. Validate all migration scripts
6. Schedule production migration window
7. Execute migration
8. Monitor and support

---

**Document Version**: 1.0
**Last Updated**: 2026-01-31
**Author**: Claude (AI) + SequenceHUB Team
**Review Required**: Security Guardian, Stripe Payment Orchestrator, File Storage Orchestrator
