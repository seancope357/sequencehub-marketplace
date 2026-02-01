# SequenceHUB.com - Architecture Documentation

## System Overview

SequenceHUB is a full-stack SaaS marketplace built with Next.js 16, designed for xLights sequence creators to sell their work securely.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Marketplace  │  │ Dashboard    │  │ Library      │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                  │                    │             │
└─────────┼──────────────────┼────────────────────┼─────────────┘
          │                  │                    │
          ▼                  ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js Application                          │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              App Router Pages                         │    │
│  │  • / (marketplace)                                 │    │
│  │  • /p/[slug] (product details)                     │    │
│  │  • /dashboard (creator tools)                        │    │
│  │  • /library (buyer purchases)                         │    │
│  │  • /auth/login, /auth/register                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              API Route Handlers                    │    │
│  │  • Authentication (register, login, logout, me)      │    │
│  │  • Products (list, details)                         │    │
│  │  • Dashboard (stats, products CRUD)                  │    │
│  │  • Library (purchases, downloads)                    │    │
│  │  • Checkout (create session)                          │    │
│  │  • Webhooks (Stripe events)                          │    │
│  │  • Media (signed file serving)                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────┬──────────────────────┬────────────────────┬───────┘
             │                      │                    │
             ▼                      ▼                    ▼
┌──────────────────┐    ┌──────────────┐    ┌──────────────┐
│   Prisma ORM    │    │    Stripe     │    │  (Future)     │
│                 │    │    API        │    │  Cloud        │
│  • Models       │    │              │    │  Storage      │
│  • Relations    │    │ • Checkout   │    │  (R2/S3)     │
│  • Validation   │    │ • Connect    │    │               │
└───────┬─────────┘    └──────┬───────┘    └──────────────┘
        │                      │
        ▼                      ▼
┌──────────────────┐    ┌──────────────┐
│   SQLite/Postgres│    │   Stripe     │
│   Database      │◄──►│   Services   │
│                │    │              │
│  • Users       │    │  • Payments  │
│  • Products    │    │  • Payouts   │
│  • Orders      │    │  • Accounts  │
│  • Entitlements│    │              │
│  • Audit Logs  │    │              │
└──────────────────┘    └──────────────┘
```

## Component Breakdown

### 1. Frontend (Client-Side)

#### Pages (Next.js App Router)
- **Marketplace Home** (`/`)
  - Product grid with search and filters
  - Client-side filtering and sorting
  - Responsive design

- **Product Detail** (`/p/[slug]`)
  - Product information display
  - xLights-specific metadata
  - Version history and files

- **Creator Dashboard** (`/dashboard/*`)
  - Stats overview
  - Product management
  - Order tracking

- **Buyer Library** (`/library`)
  - Purchase history
  - Download management

- **Authentication** (`/auth/*`)
  - Login and register pages
  - Form validation

#### State Management
- **Zustand Store** (`useAuthStore`)
  - User authentication state
  - Persisted to localStorage

#### Components
- **shadcn/ui**: Complete component library
  - Cards, buttons, forms, tables
  - Dialogs, dropdowns, alerts
  - All styled with Tailwind CSS

### 2. Backend (Server-Side)

#### API Layer (Next.js Route Handlers)
All endpoints in `src/app/api/`:

##### Authentication (`/api/auth/*`)
```
POST /api/auth/register
  → Creates user with BUYER role
  → Hashes password (bcrypt)
  → Returns JWT in cookie

POST /api/auth/login
  → Verifies credentials
  → Returns JWT in cookie

POST /api/auth/logout
  → Clears auth cookie

GET /api/auth/me
  → Returns current user from JWT
```

##### Products (`/api/products/*`)
```
GET /api/products
  → Lists published products
  → Supports filters: category, price, search, sort
  → Includes creator, prices, media, versions, files

GET /api/products/[slug]
  → Returns single product
  → Checks if user has purchased
  → Increments view count
```

##### Dashboard (`/api/dashboard/*`)
```
GET /api/dashboard/stats
  → Returns: products, sales, revenue, downloads
  → Aggregates from user's products and orders

GET /api/dashboard/products
  → Lists user's products only
  → Includes price information

DELETE /api/dashboard/products/[id]
  → Verifies ownership
  → Deletes product (cascade to relations)
  → Creates audit log
```

##### Library (`/api/library/*`)
```
GET /api/library
  → Lists user's entitlements
  → Includes product and version data

POST /api/library/download
  → Validates entitlement
  → Checks rate limits (10/day)
  → Generates signed URL (5 min expiry)
  → Logs access attempt
```

##### Checkout (`/api/checkout/*`)
```
POST /api/checkout/create
  → Creates Stripe Checkout session
  → Includes platform fee calculation
  → Routes to creator's Connect account
  → Stores session in DB
  → Returns checkout URL
```

##### Webhooks (`/api/webhooks/stripe`)
```
POST /api/webhooks/stripe
  → Verifies Stripe signature
  → Handles events:
    • checkout.session.completed → Create order & entitlement
    • payment_intent.succeeded → Log success
    • charge.refunded → Deactivate entitlement
  → Implements idempotency
  → Creates audit logs
```

##### Media (`/api/media/[...]`)
```
GET /api/media/[...]
  → Validates signed URL signature
  → Checks expiration
  → Serves file (placeholder for cloud storage)
```

### 3. Database Layer

#### Schema (17 Models)

```
User Management:
  • User (accounts)
  • Profile (public info)
  • UserRole (Admin, Creator, Buyer)

Products & Content:
  • Product (listings)
  • ProductVersion (version tracking)
  • ProductFile (file metadata)
  • ProductMedia (images/previews)
  • Tag, ProductTag (categories)

Orders & Payments:
  • CheckoutSession (Stripe sessions)
  • Order (purchase records)
  • OrderItem (line items)
  • Entitlement (download permissions)

Creator Accounts:
  • CreatorAccount (Stripe Connect)

Security & Audit:
  • DownloadToken (short-lived tokens)
  • AccessLog (download attempts)
  • AuditLog (security events)
```

#### Relationships
```
User → UserRole (1:N)
User → Profile (1:1)
User → CreatorAccount (1:1)
User → Products (1:N)
User → Orders (1:N)
User → Entitlements (1:N)

Product → ProductVersions (1:N)
Product → ProductMedia (1:N)
Product → Prices (1:N)
Product → ProductFiles (via versions)
Product → Tags (N:M via ProductTag)

ProductVersion → ProductFiles (1:N)
ProductVersion → Entitlements (1:N)

Order → OrderItems (1:N)
Order → Entitlements (1:N)
Order → AuditLogs (1:N)
```

### 4. Security Layer

#### Authentication Flow
```
1. User submits credentials
   ↓
2. Server verifies password hash
   ↓
3. Server generates JWT (7-day expiry)
   ↓
4. Server sets HTTP-only cookie
   ↓
5. Client includes cookie in requests
   ↓
6. Server verifies JWT signature
   ↓
7. Server extracts user context
```

#### Download Security
```
1. User requests download (entitlementId, versionId)
   ↓
2. Server validates entitlement exists and is active
   ↓
3. Server checks rate limit (10 downloads/day)
   ↓
4. Server generates signed URL:
   - data: storageKey:expires:userId
   - signature: HMAC(data, DOWNLOAD_SECRET)
   - TTL: 5 minutes
   ↓
5. Server returns download URL
   ↓
6. Client downloads file from /api/media/[...]
   ↓
7. Server validates signature and expiration
   ↓
8. Server serves file
   ↓
9. Server logs access and increments count
```

#### Authorization Pattern
All API endpoints follow this pattern:
```
1. Extract JWT from cookie
2. Verify JWT signature
3. Extract user ID from JWT
4. Fetch user from database
5. Check user's role (if needed)
6. Verify user owns requested resource
   - Creator: can access their products
   - Buyer: can access their entitlements
   - Admin: can access everything
7. Allow or deny request
8. Log all actions to AuditLog
```

### 5. Payment Flow (Stripe)

#### Checkout Flow
```
1. User clicks "Buy Now" on product
   ↓
2. Client calls POST /api/checkout/create
   ↓
3. Server fetches product and creator
   ↓
4. Server calculates platform fee
   - fee_amount = price * platform_fee_percent / 100
   ↓
5. Server creates Stripe Checkout session:
   - mode: payment
   - payment_intent_data.transfer_data.destination: creator's Stripe account
   - payment_intent_data.application_fee_amount: calculated fee
   - success_url: /library?success=true
   - cancel_url: /product?canceled=true
   ↓
6. Server creates CheckoutSession record in DB
   ↓
7. Server returns checkout URL
   ↓
8. Client redirects to Stripe Checkout
   ↓
9. User completes payment
   ↓
10. Stripe sends webhook to /api/webhooks/stripe
```

#### Webhook Processing
```
1. Stripe sends checkout.session.completed event
   ↓
2. Server verifies webhook signature
   ↓
3. Server checks if already processed (idempotency)
   ↓
4. Server creates Order:
   - Generate unique order number
   - Link to user and product
   - Store payment intent ID
   ↓
5. Server creates OrderItem:
   - Link product version
   - Store price at time of purchase
   ↓
6. Server creates Entitlement:
   - Link user, order, product, version
   - Set isActive: true
   ↓
7. Server updates:
   - CheckoutSession.status = COMPLETED
   - Product.saleCount += 1
   ↓
8. Server creates AuditLog entries
   ↓
9. Server responds 200 OK
```

#### Refund Flow
```
1. Refund initiated in Stripe Dashboard or API
   ↓
2. Stripe sends charge.refunded webhook
   ↓
3. Server verifies signature
   ↓
4. Server finds Order by payment_intent_id
   ↓
5. Server updates:
   - Order.status = REFUNDED
   - Order.refundedAmount += refunded_amount
   - Order.refundedAt = now()
   ↓
6. Server deactivates entitlements:
   - Entitlement.isActive = false
   ↓
7. Server creates AuditLog
   ↓
8. Server responds 200 OK
```

## xLights-Specific Features

### Metadata Captured
- **Version Compatibility**: xLightsVersionMin, xLightsVersionMax
- **Target Use**: Christmas, Halloween, Pixel Tree, Matrix, Arch, etc.
- **Expected Props**: Freeform notes about required props/models
- **File Types**: SOURCE (XSQ/XML), RENDERED (FSEQ), ASSET, PREVIEW
- **Sequence Info**: sequenceLength, fps, channelCount

### Workflow Support
- **Versioning**: Multiple versions per product with changelogs
- **Batch Render Notes**: Version notes can mention "re-rendered in v2024"
- **Save Before Render**: Documentation can remind users of this xLights best practice

## Performance Considerations

### Database Optimization
- **Indexes** on all foreign keys and frequently queried fields
- **Prisma includes** to minimize N+1 queries
- **Select only needed fields** where possible

### Caching Strategy (Future)
- Product listings cache (Redis)
- User sessions in memory
- CDN for media files
- CDN for static assets

### Rate Limiting
- **Downloads**: 10/day per entitlement
- **Auth Attempts**: To be implemented
- **API Calls**: To be implemented

## Security Best Practices Implemented

### 1. Authentication
- ✅ JWT with strong secret
- ✅ HTTP-only cookies
- ✅ Secure flag in production
- ✅ SameSite policy
- ✅ 7-day token expiry

### 2. Authorization
- ✅ Resource ownership verification
- ✅ Role-based access control
- ✅ No direct database access from client

### 3. Data Protection
- ✅ Password hashing (bcrypt, 12 rounds)
- ✅ Never send passwords in responses
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (Prisma ORM)

### 4. Audit Trail
- ✅ All critical actions logged
- ✅ IP and user agent tracking
- ✅ Timestamps on all events
- ✅ Queryable audit database

### 5. Financial Security
- ✅ Stripe webhook signature verification
- ✅ Idempotency on payment processing
- ✅ Platform fee calculation server-side
- ✅ No client-side price manipulation

## Deployment Architecture

### Current (Development)
```
Next.js Dev Server (port 3000)
    ↓
SQLite (file: ./db/custom.db)
```

### Production Recommendation
```
Client Browser
    ↓
CDN (Cloudflare)
    ↓
Next.js (Vercel/Node.js)
    ↓
PostgreSQL (Supabase/Railway)
    ↓
Cloud Storage (R2/S3) + CDN
    ↓
Stripe (Payments)
```

## Scaling Considerations

### Current Limitations
- SQLite (should upgrade to Postgres for production)
- In-memory auth state (should use Redis for scale)
- No caching layer (should add Redis)
- No queue system (should add for webhooks)

### Scaling Path
1. **Database**: SQLite → PostgreSQL with connection pooling
2. **Caching**: Add Redis for sessions and product listings
3. **Queue**: Add Bull/BullMQ for webhook processing and email
4. **CDN**: Serve all media through CDN
5. **Monitoring**: Add error tracking (Sentry) and APM

## Monitoring & Observability

### Audit Logging
All events logged to AuditLog table:
- User ID
- Action type
- Entity type and ID
- Changes (JSON)
- Metadata (JSON)
- IP address and user agent
- Timestamp

### Error Handling
- Try-catch on all API endpoints
- Structured error responses
- Client-friendly error messages
- Server logs for debugging

---

**Document Version**: 1.0
**Last Updated**: 2024
**Maintained By**: Z.ai Code
