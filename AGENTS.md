# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

SequenceHUB.com is a production-ready marketplace for xLights sequence creators. The platform enables creators to sell both editable project files (XSQ/XML) and rendered playback files (FSEQ) with comprehensive versioning, secure downloads, and Stripe payment processing.

**Runtime**: Bun (not npm or node)
**Database**: PostgreSQL via Supabase (Prisma ORM)
**Authentication**: Supabase Auth (migrated from JWT)
**Storage**: Supabase Storage (migrated from local/R2)

## Essential Commands

### Development
```bash
bun run dev              # Start dev server on port 3000 (logs to dev.log)
bun run build            # Production build with standalone output
bun run start            # Start production server (logs to server.log)
bun run lint             # ESLint code quality checks
bun run test             # Run Vitest test suite
```

### Database Operations
```bash
bun run db:push          # Push schema changes to database (no migration)
bun run db:generate      # Generate Prisma client after schema changes
bun run db:migrate       # Create and apply migration
bun run db:reset         # Reset database (WARNING: destructive)
bun run db:seed          # Seed database with test data
```

### Test Credentials (from seed)
- Admin/Creator: `admin@sequencehub.com` / `admin123`
- Demo products: 8 sample xLights sequences with full metadata

## Technology Stack

**Frontend**: Next.js 16 App Router, TypeScript 5, Tailwind CSS 4, shadcn/ui
**Backend**: Next.js Route Handlers, Prisma ORM + PostgreSQL
**Auth**: Supabase Auth (replaces legacy JWT)
**Payments**: Stripe SDK with Connect Express for marketplace
**State**: Zustand for auth state, React Hook Form + Zod for forms
**Storage**: Supabase Storage (buckets: product-files, product-media, user-avatars)
**Testing**: Vitest with @testing-library/react and jsdom

## Architecture Overview

### Directory Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API route handlers
│   │   ├── auth/          # Authentication endpoints
│   │   ├── products/      # Product listing and details
│   │   ├── dashboard/     # Creator dashboard APIs
│   │   ├── library/       # Buyer purchases and downloads
│   │   ├── checkout/      # Stripe checkout
│   │   ├── webhooks/      # Stripe webhook handler
│   │   └── upload/        # File upload endpoints
│   ├── dashboard/         # Creator dashboard pages
│   ├── library/           # Buyer library pages
│   ├── auth/              # Login/register pages
│   └── p/                 # Product detail pages
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── hooks/                 # Custom React hooks (useAuth, etc.)
└── lib/                   # Utilities and configurations
    ├── auth.ts           # JWT utilities (legacy)
    ├── auth-utils.ts     # Auth helper functions
    ├── db.ts             # Prisma client singleton
    ├── stripe-connect.ts # Stripe Connect utilities
    ├── supabase/         # Supabase client utilities
    ├── storage/          # Supabase Storage integration
    ├── upload/           # File upload system
    ├── rate-limit/       # Rate limiting middleware
    ├── email/            # Email templates and sender
    └── store/            # Zustand stores
```

### Database Schema (17 Models)

**User Management**:
- `User` - Core user accounts
- `Profile` - Public display info (bio, social links)
- `UserRole` - RBAC (ADMIN, CREATOR, BUYER)
- `CreatorAccount` - Stripe Connect integration

**Products & Content**:
- `Product` - Listings with xLights metadata (category, license, compatibility)
- `ProductVersion` - Version control with changelogs
- `ProductFile` - Files with type (SOURCE, RENDERED, ASSET, PREVIEW), hash, metadata
- `ProductMedia` - Images/previews (cover, gallery)
- `Tag`, `ProductTag` - Tagging system
- `Price` - Pricing with currency support

**Orders & Payments**:
- `CheckoutSession` - Stripe checkout sessions
- `Order` - Purchase records with UTM tracking
- `OrderItem` - Line items
- `Entitlement` - Download permissions with expiry and rate limiting

**Security & Audit**:
- `DownloadToken` - Signed URLs with 5-minute TTL
- `AccessLog` - Download attempt tracking
- `AuditLog` - Security event logging (20+ event types)

### API Architecture

All protected endpoints follow this pattern:
1. Extract user from Supabase Auth session
2. Verify user role if needed (Admin, Creator, Buyer)
3. Verify resource ownership (e.g., creator can only edit their products)
4. Perform operation with Prisma
5. Log critical actions to `AuditLog`

**Key Endpoints**:
- `/api/auth/*` - Authentication (register, login, logout, me)
- `/api/products` - Public product listing with filters
- `/api/products/[slug]` - Product details with purchase status
- `/api/dashboard/stats` - Aggregated creator stats (revenue, sales, downloads)
- `/api/dashboard/products` - Creator's products CRUD
- `/api/library` - User's entitlements and purchases
- `/api/library/download` - Generate signed download URL (rate limited)
- `/api/checkout/create` - Create Stripe Checkout with platform fees
- `/api/webhooks/stripe` - Webhook handler (signature verification, idempotency)
- `/api/upload/*` - File upload endpoints (simple, chunked)

### Authentication & Authorization

**Supabase Auth** (primary):
- Server-side: Use `createServerClient()` with cookies
- Client-side: Use `createBrowserClient()`
- Helper functions in `src/lib/supabase/`

**Legacy JWT** (being phased out):
- Still used in some endpoints during migration
- Located in `src/lib/auth.ts`

**Role-Based Access Control**:
- `ADMIN` - Full platform access
- `CREATOR` - Can sell products, access dashboard
- `BUYER` - Can purchase and download (default role)

### File Storage & Downloads

**Upload Flow** (Supabase Storage):
1. Client uploads via `/api/upload/simple` or chunked upload
2. Server validates file type and size
3. Server calculates SHA-256 hash
4. Server uploads to Supabase Storage bucket
5. Server extracts metadata (FSEQ headers for sequences)
6. Server creates `ProductFile` record

**Download Security**:
1. User requests download via `POST /api/library/download`
2. Server validates active entitlement
3. Server checks rate limit (10 downloads/day per entitlement)
4. Server generates signed URL with 5-minute TTL
5. Server logs access to `AccessLog`
6. Server increments `downloadCount` on `Entitlement`

**Supabase Storage Buckets**:
- `product-files` - Sequence files (FSEQ, XSQ, XML)
- `product-media` - Product images and previews
- `user-avatars` - User profile images

### Payment Processing (Stripe)

**Checkout Flow**:
1. Client calls `/api/checkout/create` with `productId`
2. Server fetches product and creator's `stripeAccountId`
3. Server calculates platform fee (default 10%)
4. Server creates Stripe Checkout session with Connect destination
5. Client redirects to Stripe-hosted checkout

**Webhook Processing** (`checkout.session.completed`):
1. Verify Stripe webhook signature
2. Check idempotency to prevent double processing
3. Create `Order` with unique order number
4. Create `OrderItem` linking product version
5. Create `Entitlement` (grants download access)
6. Update `CheckoutSession.status` to COMPLETED
7. Increment `Product.saleCount`
8. Create `AuditLog` entries

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

**File Metadata** (extracted from FSEQ headers):
- `sequenceLength` - Duration in seconds
- `fps` - Frames per second
- `channelCount` - Number of channels
- `fileHash` - SHA-256 for integrity verification

## Key Implementation Patterns

### Authorization Pattern
Always verify ownership on resource-specific endpoints:
```typescript
const user = await getCurrentUser(request);
if (!user) return new Response('Unauthorized', { status: 401 });

const product = await prisma.product.findUnique({ where: { id } });
if (!product || product.creatorId !== user.id) {
  return new Response('Forbidden', { status: 403 });
}
```

### Database Query Optimization
Always use Prisma `include` to prevent N+1 queries:
```typescript
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
```

### Audit Logging
Log all critical actions:
```typescript
await prisma.auditLog.create({
  data: {
    userId: user.id,
    action: AuditAction.PRODUCT_CREATED,
    entityType: 'product',
    entityId: product.id,
    changes: JSON.stringify({ title: product.title }),
    ipAddress: request.headers.get('x-forwarded-for'),
    userAgent: request.headers.get('user-agent'),
  }
});
```

### Error Handling
All API routes should use try-catch with structured errors:
```typescript
try {
  // ... operation
  return Response.json({ success: true, data });
} catch (error) {
  console.error('Error in /api/endpoint:', error);
  return new Response('Internal server error', { status: 500 });
}
```

## Environment Variables

**Required**:
- `DATABASE_URL` - PostgreSQL connection string (from Supabase)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (server-side only)
- `DOWNLOAD_SECRET` - Secret for signed URLs (generate with `openssl rand -hex 32`)

**Stripe** (for payments):
- `STRIPE_SECRET_KEY` - Stripe API key (test: `sk_test_...`)
- `STRIPE_WEBHOOK_SECRET` - Webhook signature secret
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Public key for client-side

**Optional**:
- `NEXT_PUBLIC_BASE_URL` - Full URL (defaults to `http://localhost:3000`)
- `REDIS_URL` - Redis for distributed rate limiting (uses in-memory if not set)

See `.env.example` for complete list and documentation.

## Testing

**Framework**: Vitest with jsdom environment
**Location**: Test files alongside source code (e.g., `*.test.ts`, `*.spec.tsx`)
**Configuration**: `vitest.config.ts`

**Run Tests**:
```bash
bun run test              # Run all tests
bun run test -- --watch   # Watch mode
bun run test -- --ui      # UI mode
```

## Rate Limiting

Rate limiting is implemented across all endpoints using in-memory or Redis-backed stores.

**Key Limits**:
- Login: 10 attempts per 15 minutes per IP
- Register: 5 attempts per hour per IP
- Downloads: 10 per day per entitlement
- Uploads: 10 per hour per user
- Checkout: 10 per hour per user

Configuration in `src/lib/rate-limit/` with overrides via environment variables.

## Common Development Tasks

### Add a New API Endpoint
1. Create route handler in `src/app/api/[path]/route.ts`
2. Implement GET/POST/PUT/DELETE handler functions
3. Add authorization checks using `getCurrentUser()`
4. Validate input with Zod schemas
5. Add rate limiting if needed
6. Log critical actions to `AuditLog`

### Add a New Database Model
1. Define model in `prisma/schema.prisma`
2. Add relations and indexes
3. Run `bun run db:generate` to update Prisma client
4. Run `bun run db:migrate` to create migration
5. Update seed script if needed in `prisma/seed.ts`

### Add a New Page
1. Create page in `src/app/[path]/page.tsx`
2. Use Server Components for data fetching
3. Import shadcn/ui components from `@/components/ui`
4. Apply Tailwind CSS classes for styling
5. Use Zustand stores for client state if needed

### Troubleshooting

**Dev Server Issues**:
- If dev server shows 500 errors or white screen:
  ```bash
  rm -rf .next
  rm -rf node_modules/.cache
  bun run dev
  ```

**Database Issues**:
- Reset database: `bun run db:reset` (destructive!)
- Regenerate client: `bun run db:generate`
- Push schema without migration: `bun run db:push`

**Supabase Connection**:
- Verify environment variables in `.env.local`
- Check Supabase Dashboard for service status
- Ensure database connection string includes correct password

## Security Considerations

1. **Never trust client input** - Always validate on server with Zod
2. **Always verify ownership** - Check userId matches resource owner
3. **Protect sensitive data** - Never return passwordHash or service keys
4. **Webhook security** - Always verify Stripe signature, use idempotency
5. **File uploads** - Validate type, size, and scan for malicious content
6. **Download abuse** - Use signed URLs with short TTL, enforce rate limits

## Specialized Agent Context

This project uses specialized AI agents for specific domains (see `.claude/agents/`):
- **Security Guardian** - Security audits, access control, compliance
- **xLights Specialist** - File format expertise, metadata extraction
- **Stripe Payment Orchestrator** - Payment integration, webhooks

These are Claude-specific but provide valuable context about security patterns, xLights file structures, and Stripe integration details.

## Additional Documentation

- `CLAUDE.md` - Comprehensive Claude-specific guidance (adapts to Warp context)
- `ARCHITECTURE.md` - Detailed system design and component breakdown
- `SECURITY.md` - Threat model and security mitigations
- `PROJECT_STATUS.md` - Feature completion status and roadmap
- `SUPABASE_IMPLEMENTATION_GUIDE.md` - Supabase migration details
- `.env.example` - Complete environment variable documentation
