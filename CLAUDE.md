# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SequenceHUB.com is a production-ready marketplace for xLights sequence creators, similar to Gumroad but purpose-built for the xLights community. The platform enables creators to sell both editable project files (XSQ/XML) and rendered playback files (FSEQ) with comprehensive versioning, secure downloads, and Stripe payment processing.

**Current Status**: Core MVP features complete. File upload system and Stripe Connect integration are in progress.

## Specialized AI Agents

This project has three super-powered specialized agents for domain-specific tasks. They are automatically invoked based on the work you're doing:

### 🛡️ Security Guardian Agent
**Expertise**: Security audits, access control, threat mitigation, compliance (PCI-DSS, GDPR)
**Auto-invoked for**: Security reviews, auth/authz changes, API endpoints, webhooks, downloads
**Location**: `.claude/agents/security-guardian.md`

### 🎄 xLights Specialist Agent
**Expertise**: xLights file formats (FSEQ, XSQ), metadata extraction, product validation
**Auto-invoked for**: Product creation, file uploads, xLights-specific features, sequence validation
**Location**: `.claude/agents/xlights-specialist.md`

### 💳 Stripe Payment Orchestrator Agent
**Expertise**: Stripe Connect, checkout, webhooks, refunds, creator onboarding
**Auto-invoked for**: Payment integration, Stripe Connect, webhooks, order processing
**Location**: `.claude/agents/stripe-payment-orchestrator.md`

**Agent System Documentation**: See `.claude/README.md` for details on how agents work and when they're invoked.

## Essential Commands

### Development
```bash
bun run dev              # Start dev server on port 3000 (auto-restart enabled)
bun run build            # Production build
bun run start            # Start production server
bun run lint             # ESLint code quality checks
```

### Database Operations
```bash
bun run db:push          # Push schema changes to database
bun run db:generate      # Generate Prisma client
bun run db:migrate       # Create and apply migrations
bun run db:reset         # Reset database (WARNING: destructive)
bun run db:seed          # Seed database with test data
```

### Seeded Test Credentials
- Admin/Creator: `admin@sequencehub.com` / `admin123`
- Demo products: 8 sample xLights sequences with full metadata

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 16 (App Router), TypeScript 5, Tailwind CSS 4, shadcn/ui
- **Backend**: Next.js Route Handlers, Prisma ORM + SQLite (production: PostgreSQL)
- **Auth**: JWT-based with bcrypt (12 rounds), HTTP-only cookies, 7-day expiry
- **Payments**: Stripe SDK with Connect Express for multi-seller marketplace
- **State**: Zustand for auth state, React Hook Form + Zod for forms
- **Runtime**: Bun

### Database Schema (17 Models)

**User Management**:
- `User` - Core user accounts with passwordHash
- `Profile` - Public display info (bio, social links)
- `UserRole` - RBAC (ADMIN, CREATOR, BUYER)
- `CreatorAccount` - Stripe Connect integration fields

**Products & Content**:
- `Product` - Listings with xLights metadata (versions, category, license)
- `ProductVersion` - Version control with changelogs
- `ProductFile` - Files with type (SOURCE, RENDERED, ASSET, PREVIEW), hash, metadata
- `ProductMedia` - Images/previews (cover, gallery)
- `Tag`, `ProductTag` - Tagging system
- `Price` - Pricing with currency support

**Orders & Payments**:
- `CheckoutSession` - Stripe checkout sessions
- `Order` - Purchase records with UTM tracking
- `OrderItem` - Line items
- `Entitlement` - Download permissions with expiry, rate limiting

**Security & Audit**:
- `DownloadToken` - Signed URLs with 5-minute TTL
- `AccessLog` - Download attempt tracking
- `AuditLog` - Comprehensive security event logging (20+ event types)

### API Route Structure

**Authentication** (`/api/auth/*`):
- `POST /register` - Create user with BUYER role, return JWT
- `POST /login` - Verify credentials, return JWT in HTTP-only cookie
- `POST /logout` - Clear auth cookie
- `GET /me` - Get current user from JWT

**Products** (`/api/products/*`):
- `GET /products` - List published products (filters: category, price, search, sort)
- `GET /products/[slug]` - Single product with purchase status check

**Creator Dashboard** (`/api/dashboard/*`):
- `GET /stats` - Aggregated stats (revenue, sales, products, downloads)
- `GET /products` - Creator's products only (ownership verified)
- `POST /products` - Create new product (IN PROGRESS)
- `DELETE /products/[id]` - Delete product (ownership verified)

**Buyer Library** (`/api/library/*`):
- `GET /library` - User's entitlements with product data
- `POST /download` - Generate signed download URL (entitlement + rate limit checks)

**Payments** (`/api/checkout/*`, `/api/webhooks/*`):
- `POST /checkout/create` - Create Stripe Checkout with platform fees
- `POST /webhooks/stripe` - Webhook handler (signature verification, idempotency)

**Media** (`/api/media/[...]`):
- `GET /media/[...]` - Serve files with signed URL validation

### Authentication Flow

All protected endpoints follow this pattern:
1. Extract JWT from HTTP-only cookie
2. Verify signature with `JWT_SECRET`
3. Extract `userId` from token payload
4. Fetch user from database
5. Check user role if needed (Admin, Creator, Buyer)
6. Verify resource ownership (e.g., creator can only edit their products)
7. Log action to `AuditLog` for critical operations

**Key Files**:
- `src/lib/auth.ts` - JWT utilities (`signToken`, `verifyToken`, `hashPassword`, `verifyPassword`)
- `src/hooks/use-auth.ts` - React hooks (`useAuth`, `useRequireAuth`, `useRequireRole`)
- `src/lib/store/auth-store.ts` - Zustand auth state

### Download Security Architecture

**Signed URL Generation**:
1. User requests download via `POST /api/library/download`
2. Server validates active entitlement exists
3. Server checks rate limit (10 downloads/day per entitlement)
4. Server generates signed URL:
   - `data = storageKey:expiresAt:userId`
   - `signature = HMAC(data, DOWNLOAD_SECRET)`
   - `url = /api/media/[storageKey]?expires=[timestamp]&signature=[sig]`
   - TTL: 5 minutes
5. Server logs access attempt to `AccessLog`
6. Server increments `downloadCount` on `Entitlement`

**URL Validation** (`/api/media/[...]`):
1. Extract `signature` and `expires` from query params
2. Verify signature matches HMAC of request data
3. Check expiration timestamp
4. Serve file if valid, otherwise return 403

### Payment Flow (Stripe)

**Checkout**:
1. `POST /api/checkout/create` with `productId`
2. Server fetches product + creator's `stripeAccountId`
3. Server calculates platform fee (`price * platformFeePercent / 100`)
4. Server creates Stripe Checkout session:
   - `payment_intent_data.transfer_data.destination` = creator's account
   - `payment_intent_data.application_fee_amount` = platform fee
5. Server creates `CheckoutSession` record
6. Client redirects to Stripe-hosted checkout

**Webhook Processing** (`checkout.session.completed`):
1. Verify Stripe webhook signature
2. Check idempotency (prevent double processing)
3. Create `Order` with unique order number
4. Create `OrderItem` linking product version
5. Create `Entitlement` (grants download access)
6. Update `CheckoutSession.status` to COMPLETED
7. Increment `Product.saleCount`
8. Create `AuditLog` entries
9. Respond 200 OK

**Refund Handling** (`charge.refunded`):
1. Find `Order` by `payment_intent_id`
2. Update `Order.status` to REFUNDED
3. Set `Entitlement.isActive = false`
4. Log to `AuditLog`

### xLights-Specific Features

**Product Metadata**:
- `xLightsVersionMin`, `xLightsVersionMax` - Compatibility range
- `category` - CHRISTMAS, HALLOWEEN, PIXEL_TREE, MELODY, MATRIX, ARCH, PROP, etc.
- `targetUse` - Freeform description of intended use
- `expectedProps` - Notes about required props/models
- `includesFSEQ`, `includesSource` - File type flags
- `licenseType` - PERSONAL or COMMERCIAL

**File Metadata** (extracted during upload):
- `sequenceLength` - Duration in seconds
- `fps` - Frames per second
- `channelCount` - Number of channels
- `fileHash` - SHA-256 for integrity verification

### File Upload System (IN PROGRESS)

**Workflow**:
1. Client uploads file via `/api/upload` (multipart)
2. Server validates file type (extension + magic bytes)
3. Server calculates SHA-256 hash
4. Server checks for duplicates by hash
5. Server stores file with unique `storageKey`
6. Server extracts metadata (FSEQ headers, etc.)
7. Background job processes file (virus scan hook point)
8. Server creates `ProductFile` record

**Storage Strategy**:
- Development: Local filesystem (`/download` directory)
- Production: Cloud storage (R2/S3) + CDN

### Environment Variables

**Required**:
- `DATABASE_URL` - SQLite connection string (e.g., `file:./db/custom.db`)
- `JWT_SECRET` - Secret for JWT signing (generate with `openssl rand -hex 32`)
- `DOWNLOAD_SECRET` - Secret for signed URLs (generate with `openssl rand -hex 32`)

**Stripe** (when integrating payments):
- `STRIPE_SECRET_KEY` - Stripe API key (test: `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature secret (from Stripe Dashboard)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public key for client-side

**Production**:
- `NEXT_PUBLIC_BASE_URL` - Full URL (e.g., `https://sequencehub.com`)

## Key Implementation Patterns

### Authorization Middleware Pattern

All protected API routes use this pattern:
```typescript
// 1. Get user from JWT
const user = await getCurrentUser(request);
if (!user) return new Response('Unauthorized', { status: 401 });

// 2. Verify ownership (for resource-specific endpoints)
const product = await prisma.product.findUnique({ where: { id } });
if (!product || product.creatorId !== user.id) {
  return new Response('Forbidden', { status: 403 });
}

// 3. Perform operation
// ...

// 4. Log to AuditLog
await prisma.auditLog.create({
  data: {
    userId: user.id,
    action: AuditAction.PRODUCT_UPDATED,
    entityType: 'product',
    entityId: product.id,
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  }
});
```

### Database Query Optimization

Always use Prisma `include` to prevent N+1 queries:
```typescript
// GOOD: Single query with joins
const products = await prisma.product.findMany({
  where: { status: 'PUBLISHED' },
  include: {
    creator: { select: { name: true, email: true } },
    prices: { where: { isActive: true } },
    media: { where: { mediaType: 'cover' } },
    versions: {
      where: { isLatest: true },
      include: { files: true }
    }
  }
});

// BAD: N+1 queries (avoid this)
const products = await prisma.product.findMany();
for (const product of products) {
  const creator = await prisma.user.findUnique({ where: { id: product.creatorId } });
}
```

### Audit Logging Pattern

For all critical actions:
```typescript
await prisma.auditLog.create({
  data: {
    userId: user.id,
    action: AuditAction.PRODUCT_CREATED, // Use enum values
    entityType: 'product',
    entityId: product.id,
    changes: JSON.stringify({ title: product.title }), // Optional: what changed
    metadata: JSON.stringify({ ip: ipAddress }), // Optional: additional context
    ipAddress,
    userAgent,
  }
});
```

### Error Handling Pattern

All API routes should use try-catch with structured errors:
```typescript
try {
  // ... operation
  return Response.json({ success: true, data });
} catch (error) {
  console.error('Error in /api/endpoint:', error);
  await prisma.auditLog.create({
    data: {
      action: AuditAction.SECURITY_ALERT,
      entityType: 'error',
      metadata: JSON.stringify({ error: error.message }),
      ipAddress,
      userAgent,
    }
  });
  return new Response('Internal server error', { status: 500 });
}
```

## Security Considerations

### Critical Security Rules

1. **Never trust client input**:
   - Always validate on server
   - Use Zod schemas for validation
   - Sanitize file uploads (extension + magic bytes)

2. **Always verify ownership**:
   - Check `userId` matches resource owner
   - Don't rely on client-side filtering
   - Use database WHERE clauses for user isolation

3. **Protect sensitive data**:
   - Never return `passwordHash` in API responses
   - Use `select` to exclude sensitive fields
   - HTTP-only cookies for tokens

4. **Rate limiting** (when implementing):
   - 10 downloads/day per entitlement
   - 100 API requests/minute per IP
   - 10 login attempts/minute per IP

5. **Webhook security**:
   - Always verify Stripe signature
   - Use idempotency keys
   - Log all webhook events

### Common Vulnerabilities to Avoid

- **XSS**: Next.js auto-escapes by default, but sanitize user-generated markdown
- **SQL Injection**: Prisma prevents this, but never use raw SQL with user input
- **CSRF**: SameSite cookies provide protection, consider CSRF tokens for critical actions
- **Download Abuse**: Use signed URLs with short TTL, rate limit downloads
- **File Upload Attacks**: Validate type, size, scan for viruses (hook point ready)

## Known Issues & Limitations

### Current Blockers

1. **Product Creation Flow**: JSX structure issues in `/dashboard/products/new/page.tsx`
   - Code compiles and runs but fails ESLint
   - CardContent tags may be unbalanced
   - Requires manual review to fix tag structure

2. **File Upload**: Not fully integrated
   - UI is implemented
   - Backend endpoint needs completion
   - Cloud storage integration pending

3. **Stripe Connect**: Creator onboarding flow not implemented
   - Express onboarding UI needed
   - OAuth link generation ready
   - Payout scheduling pending

### Development Environment Issues

- **Turbopack Cache Corruption**: If dev server shows 500/white screen:
  ```bash
  rm -rf .next
  rm -rf node_modules/.cache
  bun run dev
  ```

## Project-Specific Conventions

### File Naming
- API routes: lowercase with hyphens (e.g., `/api/auth/verify-email/route.ts`)
- Components: PascalCase (e.g., `ProductCard.tsx`)
- Utilities: camelCase (e.g., `formatPrice.ts`)

### Database Conventions
- Use `cuid()` for all primary keys
- Use `@updatedAt` for auto-updating timestamps
- Always add indexes on foreign keys and frequently queried fields
- Use enums for fixed sets of values (e.g., `ProductStatus`, `Role`)

### API Response Format
```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "Message" }
```

### Version Numbers
Products use semantic versioning:
- `versionNumber` - Integer (1, 2, 3...)
- `versionName` - String ("1.0.0", "2024 Edition", etc.)

## Testing & Validation

### Manual Testing Workflow
1. Seed database: `bun run db:seed`
2. Login as admin: `admin@sequencehub.com` / `admin123`
3. Test flows:
   - Browse marketplace
   - View product details
   - Creator dashboard (view stats, products)
   - Buyer library (if orders exist)

### Validation Checklist for New Features
- Server-side ownership checks
- Audit logging for critical actions
- Error handling with try-catch
- Input validation with Zod
- Rate limiting considerations
- Database indexes on new query fields

## Additional Resources

- **Architecture**: See `ARCHITECTURE.md` for detailed system design
- **Security**: See `SECURITY.md` for threat model and mitigations
- **Status**: See `PROJECT_STATUS.md` for feature completion status
- **History**: See `worklog.md` for development progress

## Next Priority Tasks

1. Fix JSX structure in product creation page
2. Complete file upload system with cloud storage
3. Implement Stripe Connect Express onboarding
4. Build admin panel for platform oversight
5. Add email notifications (Resend integration)
6. Implement extended rate limiting across all endpoints
