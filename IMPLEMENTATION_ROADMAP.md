# SequenceHUB Implementation Roadmap

**Last Updated:** February 8, 2026
**Priority:** Get Creators Selling ASAP
**Stripe Mode:** TEST
**MVP Must-Haves:** File Uploads + Reviews/Ratings

---

## 🎯 Your Priorities (From User Input)

1. ✅ **Get creators selling ASAP** - Priority #1
2. ✅ **File uploads** - You have test xLights files ready
3. ✅ **Reviews/ratings** - MVP must-have feature
4. ✅ **Stripe TEST mode** - Safe for development

---

## 📊 Implementation Phases

### **Phase 1: Creator Enablement** (PRIORITY 1) 🔥
*Goal: Creators can connect Stripe and start listing products*

### **Phase 2: File & Product Management** (PRIORITY 2) 🔥
*Goal: Creators can upload xLights files and create listings*

### **Phase 3: Buyer Purchase Flow** (PRIORITY 3) 🔥
*Goal: Buyers can purchase and download products*

### **Phase 4: Social Proof** (PRIORITY 4) 🔥
*Goal: Reviews and ratings system (MVP must-have)*

### **Phase 5: Polish & Admin** (PRIORITY 5)
*Goal: Admin tools and user experience improvements*

---

## ✅ PHASE 1: Creator Enablement (Days 1-2)

### Task 1.1: Stripe Connect Test Mode Setup
**Priority:** 🔥 CRITICAL
**Estimated Time:** 2 hours

**What to do:**
1. Get Stripe TEST API keys from dashboard.stripe.com
2. Add to .env.local:
   ```env
   STRIPE_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..." (we'll set this up later)
   ```
3. Test Stripe connection with a simple API call

**Files to create/modify:**
- `.env.local` (add Stripe keys)

**Acceptance criteria:**
- [ ] Stripe TEST keys configured
- [ ] Can create a test Stripe account programmatically
- [ ] No errors in console

---

### Task 1.2: Creator Onboarding Flow (Stripe Connect Express)
**Priority:** 🔥 CRITICAL
**Estimated Time:** 4 hours

**What to do:**
1. Build the onboarding API endpoint
2. Create Stripe Connect Express account
3. Generate onboarding link
4. Handle return from Stripe
5. Assign CREATOR role after successful onboarding

**Files to create/modify:**
- `src/app/api/creator/onboarding/start/route.ts` ← Create Stripe account
- `src/app/api/creator/onboarding/status/route.ts` ← Check status
- `src/app/api/creator/onboarding/dashboard/route.ts` ← Stripe dashboard link
- `src/app/dashboard/creator/onboarding/page.tsx` ← Update UI

**Code Example:**
```typescript
// src/app/api/creator/onboarding/start/route.ts
import Stripe from 'stripe';
import { getCurrentUser, assignRole } from '@/lib/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // Create Stripe Connect account
  const account = await stripe.accounts.create({
    type: 'express',
    email: user.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });

  // Save to database
  await db.creatorAccount.create({
    data: {
      userId: user.id,
      stripeAccountId: account.id,
      onboardingStatus: 'IN_PROGRESS',
    },
  });

  // Assign CREATOR role
  await assignRole(user.id, 'CREATOR');

  // Generate onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard/creator/onboarding`,
    return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}
```

**Acceptance criteria:**
- [ ] User can click "Become a Creator"
- [ ] Redirects to Stripe Express onboarding
- [ ] Returns to dashboard after completion
- [ ] CREATOR role assigned
- [ ] CreatorAccount record created in DB

---

### Task 1.3: Creator Dashboard Protection
**Priority:** 🔥 CRITICAL
**Estimated Time:** 1 hour

**What to do:**
1. Add role checks to all creator pages
2. Redirect non-creators to onboarding
3. Show onboarding status banner if incomplete

**Files to modify:**
- `src/app/dashboard/products/page.tsx`
- `src/app/dashboard/products/new/page.tsx`
- `src/app/dashboard/page.tsx`

**Code Example:**
```typescript
// Add to top of creator pages
const { user, isCreatorOrAdmin } = useAuth();

useEffect(() => {
  if (!isCreatorOrAdmin) {
    router.push('/dashboard/creator/onboarding');
  }
}, [isCreatorOrAdmin]);
```

**Acceptance criteria:**
- [ ] Non-creators redirected to onboarding
- [ ] Creators see full dashboard
- [ ] Status banner shows Stripe onboarding progress

---

## ✅ PHASE 2: File & Product Management (Days 3-5)

### Task 2.1: File Upload System (xLights Files)
**Priority:** 🔥 CRITICAL (You have test files ready!)
**Estimated Time:** 6 hours

**What to do:**
1. Create chunked file upload endpoint
2. Validate file types (.xsq, .fseq, .xml)
3. Extract metadata from xLights files
4. Store in Supabase Storage
5. Create ProductFile records

**Files to create:**
- `src/app/api/upload/initiate/route.ts`
- `src/app/api/upload/chunk/route.ts`
- `src/app/api/upload/complete/route.ts`
- `src/lib/xlights-parser.ts` (metadata extraction)
- `src/lib/storage.ts` (Supabase Storage helper)

**File Upload Flow:**
```
1. Client: POST /api/upload/initiate { fileName, fileSize, fileType }
   → Server returns uploadId and chunking info

2. Client: POST /api/upload/chunk { uploadId, chunkIndex, chunkData }
   → Server saves chunk to temp location
   → Repeat for all chunks

3. Client: POST /api/upload/complete { uploadId }
   → Server assembles chunks
   → Extracts xLights metadata (duration, FPS, channels)
   → Uploads to Supabase Storage
   → Creates ProductFile record
   → Returns fileId
```

**xLights Metadata to Extract:**
```typescript
interface XLightsMetadata {
  sequenceLength: number;  // Duration in seconds
  fps: number;             // Frames per second
  channelCount: number;    // Number of channels
  version?: string;        // xLights version used
  models?: string[];       // Model names (if available)
}
```

**Acceptance criteria:**
- [ ] Can upload .xsq files (up to 100MB)
- [ ] Can upload .fseq files (up to 500MB)
- [ ] Can upload .xml files
- [ ] Metadata extracted correctly
- [ ] Files stored in Supabase Storage
- [ ] ProductFile records created
- [ ] Progress bar shows upload status

---

### Task 2.2: Product Creation Flow
**Priority:** 🔥 CRITICAL
**Estimated Time:** 4 hours

**What to do:**
1. Complete the product creation form
2. File upload integration
3. Cover image upload
4. Gallery images upload
5. Pricing setup
6. Category selection
7. xLights metadata fields

**Files to modify:**
- `src/app/dashboard/products/new/page.tsx` (already has UI)
- `src/app/api/dashboard/products/route.ts` (POST endpoint)

**Form Flow:**
```
Tab 1: Basic Info
- Title (required)
- Description (markdown editor)
- Category (dropdown)
- Target use

Tab 2: Files
- Upload source files (.xsq, .xml)
- Upload rendered files (.fseq)
- Auto-detect metadata

Tab 3: Media
- Upload cover image (required)
- Upload gallery images (optional, up to 5)

Tab 4: Pricing
- Price in USD
- License type (Personal/Commercial)
- Seat count (if commercial)

Tab 5: xLights Info
- Min xLights version
- Max xLights version
- Expected props/models
- Technical notes

Tab 6: Preview & Publish
- Preview how product will look
- Save as draft or publish
```

**API Endpoint:**
```typescript
// POST /api/dashboard/products
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!isCreatorOrAdmin(user)) return forbidden();

  const body = await request.json();

  // Create product
  const product = await db.product.create({
    data: {
      creatorId: user.id,
      slug: generateSlug(body.title),
      title: body.title,
      description: body.description,
      category: body.category,
      status: body.publish ? 'PUBLISHED' : 'DRAFT',
      // ... xLights fields
    },
  });

  // Create version
  const version = await db.productVersion.create({
    data: {
      productId: product.id,
      versionNumber: 1,
      versionName: '1.0',
      isLatest: true,
    },
  });

  // Link uploaded files to version
  await db.productFile.updateMany({
    where: { id: { in: body.fileIds } },
    data: { versionId: version.id },
  });

  // Create price
  await db.price.create({
    data: {
      productId: product.id,
      amount: body.price,
      currency: 'USD',
      isActive: true,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
```

**Acceptance criteria:**
- [ ] Can create draft product
- [ ] Can upload all file types
- [ ] Metadata extracted and displayed
- [ ] Can set price
- [ ] Can add cover image
- [ ] Can publish immediately or save as draft
- [ ] Redirects to product management after creation

---

### Task 2.3: Product Management (Edit/Delete)
**Priority:** 🔴 HIGH
**Estimated Time:** 3 hours

**What to do:**
1. Edit product endpoint with ownership check
2. Delete product endpoint with ownership check
3. Update product status (publish/unpublish/archive)
4. Version management (create new version)

**Files to create:**
- `src/app/api/dashboard/products/[id]/route.ts` (PATCH, DELETE)
- `src/app/dashboard/products/[id]/edit/page.tsx`

**Ownership Check Pattern:**
```typescript
const product = await db.product.findUnique({ where: { id } });
if (product.creatorId !== user.id && !isAdmin(user)) {
  return forbidden();
}
```

**Acceptance criteria:**
- [ ] Can edit own products
- [ ] Cannot edit other creator's products
- [ ] Can delete own products (soft delete?)
- [ ] Can change product status
- [ ] Audit log created for all changes

---

## ✅ PHASE 3: Buyer Purchase Flow (Days 6-7)

### Task 3.1: Stripe Checkout Integration
**Priority:** 🔴 HIGH
**Estimated Time:** 4 hours

**What to do:**
1. Create checkout session with Stripe Connect
2. Handle platform fees (10%)
3. Transfer funds to creator's account
4. Handle success/cancel redirects

**Files to create:**
- `src/app/api/checkout/create/route.ts`
- `src/app/api/webhooks/stripe/route.ts`

**Checkout Flow:**
```typescript
// POST /api/checkout/create
const session = await stripe.checkout.sessions.create({
  line_items: [{
    price_data: {
      currency: 'usd',
      product_data: { name: product.title },
      unit_amount: Math.round(price * 100),
    },
    quantity: 1,
  }],
  mode: 'payment',
  success_url: `${baseUrl}/library?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/p/${product.slug}`,
  payment_intent_data: {
    transfer_data: {
      destination: creator.stripeAccountId, // ← Pay creator
    },
    application_fee_amount: Math.round(price * 100 * 0.10), // ← 10% fee
  },
});
```

**Acceptance criteria:**
- [ ] Can create checkout session
- [ ] Redirects to Stripe hosted checkout
- [ ] Payment splits correctly (90% creator, 10% platform)
- [ ] Success page shows purchase confirmation
- [ ] Cancel returns to product page

---

### Task 3.2: Webhook Handler (Create Entitlements)
**Priority:** 🔴 HIGH
**Estimated Time:** 3 hours

**What to do:**
1. Set up Stripe CLI for local webhook testing
2. Handle `checkout.session.completed` event
3. Create Order and OrderItem records
4. Create Entitlement (grants download access)
5. Verify webhook signature
6. Implement idempotency

**Webhook Events to Handle:**
- `checkout.session.completed` → Create order + entitlement
- `charge.refunded` → Revoke entitlement
- `account.updated` → Update creator Stripe status

**Code Example:**
```typescript
// POST /api/webhooks/stripe
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

if (event.type === 'checkout.session.completed') {
  const session = event.data.object;

  // Create order
  const order = await db.order.create({
    data: {
      orderNumber: generateOrderNumber(),
      userId: session.client_reference_id,
      totalAmount: session.amount_total / 100,
      status: 'COMPLETED',
      paymentIntentId: session.payment_intent,
    },
  });

  // Create order item
  await db.orderItem.create({
    data: {
      orderId: order.id,
      productId: session.metadata.productId,
      priceAtPurchase: session.amount_total / 100,
    },
  });

  // Create entitlement (grants download access)
  await db.entitlement.create({
    data: {
      userId: session.client_reference_id,
      orderId: order.id,
      productId: session.metadata.productId,
      versionId: session.metadata.versionId,
      licenseType: 'PERSONAL',
      isActive: true,
    },
  });
}
```

**Testing Locally:**
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local dev server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Copy the webhook signing secret (whsec_...)
# Add to .env.local as STRIPE_WEBHOOK_SECRET
```

**Acceptance criteria:**
- [ ] Webhook signature verified
- [ ] Order created on successful payment
- [ ] Entitlement created (user now owns product)
- [ ] Idempotency prevents duplicate processing
- [ ] Audit log created
- [ ] Email sent (if enabled)

---

### Task 3.3: Library & Download System
**Priority:** 🔴 HIGH
**Estimated Time:** 4 hours

**What to do:**
1. Library page showing purchased products
2. Generate signed download URLs
3. Rate limit downloads (10/day per product)
4. Track download count
5. Serve files from Supabase Storage

**Files to create:**
- `src/app/library/page.tsx`
- `src/app/api/library/route.ts` (GET - list purchases)
- `src/app/api/library/download/route.ts` (POST - generate download URL)
- `src/app/api/media/[...path]/route.ts` (GET - serve file with signature validation)

**Download Flow:**
```
1. User clicks "Download" in Library
   ↓
2. POST /api/library/download { productId, versionId }
   → Check entitlement exists
   → Check rate limit (10/day)
   → Generate signed URL (5 min expiry)
   → Increment download count
   → Return URL
   ↓
3. GET /api/media/[storageKey]?signature=xxx&expires=xxx
   → Verify signature
   → Check expiration
   → Stream file from Supabase Storage
```

**Signed URL Generation:**
```typescript
import crypto from 'crypto';

function generateSignedUrl(storageKey: string, expiresAt: Date) {
  const data = `${storageKey}:${expiresAt.getTime()}`;
  const signature = crypto
    .createHmac('sha256', process.env.DOWNLOAD_SECRET!)
    .update(data)
    .digest('hex');

  return `/api/media/${storageKey}?expires=${expiresAt.getTime()}&signature=${signature}`;
}
```

**Acceptance criteria:**
- [ ] Library shows all purchased products
- [ ] Can generate download link
- [ ] Download link expires after 5 minutes
- [ ] Rate limit enforced (10 downloads/day)
- [ ] Download count tracked
- [ ] Files served from Supabase Storage

---

## ✅ PHASE 4: Social Proof (Days 8-9)

### Task 4.1: Review & Rating System (MVP Must-Have)
**Priority:** 🔥 CRITICAL (User requested)
**Estimated Time:** 5 hours

**What to do:**
1. Create Review database model
2. API endpoints for creating/reading reviews
3. Only allow reviews from buyers who purchased
4. Star rating (1-5 stars)
5. Optional text review
6. Display on product page

**Database Schema:**
```prisma
model Review {
  id          String   @id @default(cuid())
  userId      String
  productId   String
  orderId     String   // Must have purchased to review
  rating      Int      // 1-5 stars
  title       String?
  comment     String?
  isVerified  Boolean  @default(true) // Verified purchase
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  order   Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@unique([userId, productId]) // One review per user per product
  @@index([productId])
  @@index([userId])
}
```

**Files to create:**
- `prisma/schema.prisma` (add Review model)
- `src/app/api/products/[id]/reviews/route.ts` (GET, POST)
- `src/components/reviews/ReviewForm.tsx`
- `src/components/reviews/ReviewList.tsx`
- `src/components/reviews/StarRating.tsx`

**API Endpoints:**
```typescript
// POST /api/products/[id]/reviews
export async function POST(request: NextRequest, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  // Check if user purchased this product
  const entitlement = await db.entitlement.findFirst({
    where: {
      userId: user.id,
      productId: params.id,
      isActive: true,
    },
    include: { order: true },
  });

  if (!entitlement) {
    return NextResponse.json(
      { error: 'You must purchase this product to review it' },
      { status: 403 }
    );
  }

  const { rating, title, comment } = await request.json();

  const review = await db.review.create({
    data: {
      userId: user.id,
      productId: params.id,
      orderId: entitlement.orderId,
      rating,
      title,
      comment,
      isVerified: true,
    },
  });

  // Update product average rating
  const avgRating = await db.review.aggregate({
    where: { productId: params.id },
    _avg: { rating: true },
  });

  await db.product.update({
    where: { id: params.id },
    data: { averageRating: avgRating._avg.rating },
  });

  return NextResponse.json({ review }, { status: 201 });
}
```

**Acceptance criteria:**
- [ ] Only purchasers can leave reviews
- [ ] One review per user per product
- [ ] Star rating (1-5) required
- [ ] Text review optional
- [ ] Reviews display on product page
- [ ] Average rating calculated and displayed
- [ ] "Verified Purchase" badge shown

---

### Task 4.2: Product Rating Display
**Priority:** 🔴 HIGH
**Estimated Time:** 2 hours

**What to do:**
1. Show star rating on product cards
2. Show review count
3. Sort products by rating
4. Filter by minimum rating

**Updates needed:**
- Product card component
- Browse page filters
- Product detail page

**Acceptance criteria:**
- [ ] Star rating visible on product cards
- [ ] Review count shown (e.g., "4.5 stars (12 reviews)")
- [ ] Can sort by "Highest Rated"
- [ ] Can filter "4+ stars only"

---

## ✅ PHASE 5: Polish & Admin (Days 10+)

### Task 5.1: Admin Panel (Basic)
**Priority:** 🟡 MEDIUM
**Estimated Time:** 4 hours

**What to do:**
1. View all users
2. Manage user roles
3. View all products
4. Moderate reviews
5. View platform stats

**Files to create:**
- `src/app/admin/page.tsx`
- `src/app/admin/users/page.tsx`
- `src/app/admin/products/page.tsx`
- `src/app/api/admin/users/route.ts`
- `src/app/api/admin/stats/route.ts`

**Acceptance criteria:**
- [ ] Only admins can access
- [ ] Can view all users
- [ ] Can assign/remove roles
- [ ] Can view all products
- [ ] Can suspend products
- [ ] Can delete reviews

---

### Task 5.2: Email Notifications (Optional)
**Priority:** 🟢 LOW
**Estimated Time:** 3 hours

**What to do:**
1. Set up Resend API key
2. Welcome email on registration
3. Purchase confirmation email
4. Download link email
5. Review notification to creator

**Files to modify:**
- `src/lib/email/send.ts` (already exists)
- `.env.local` (add RESEND_API_KEY)

**Acceptance criteria:**
- [ ] Welcome email sent on signup
- [ ] Purchase confirmation sent
- [ ] Download link sent to buyer
- [ ] Creator notified of new sale

---

### Task 5.3: Search & Filters
**Priority:** 🟢 LOW
**Estimated Time:** 3 hours

**What to do:**
1. Full-text search on product titles
2. Filter by category
3. Filter by price range
4. Filter by rating
5. Sort by: newest, price, rating, popular

**Acceptance criteria:**
- [ ] Search works on product title
- [ ] Can filter by multiple criteria
- [ ] Can sort results
- [ ] Filters persist in URL params

---

### Task 5.4: User Profile Pages
**Priority:** 🟢 LOW
**Estimated Time:** 2 hours

**What to do:**
1. Public creator profile pages
2. Show creator's products
3. Show average rating
4. Creator bio and links

**Acceptance criteria:**
- [ ] `/creators/[username]` page works
- [ ] Shows creator's products
- [ ] Shows creator stats

---

## 📊 Summary Checklist

### Phase 1: Creator Enablement (CRITICAL) 🔥
- [ ] Stripe TEST keys configured
- [ ] Creator onboarding flow complete
- [ ] Stripe Connect accounts created
- [ ] CREATOR role assigned after onboarding
- [ ] Dashboard protected by role checks

### Phase 2: File & Product Management (CRITICAL) 🔥
- [ ] File upload system working (.xsq, .fseq, .xml)
- [ ] xLights metadata extracted
- [ ] Files stored in Supabase Storage
- [ ] Product creation flow complete
- [ ] Can create/edit/delete products
- [ ] Ownership checks enforced

### Phase 3: Buyer Purchase Flow (HIGH) 🔴
- [ ] Stripe checkout integration
- [ ] Webhook handler processes payments
- [ ] Entitlements created on purchase
- [ ] Library page shows purchases
- [ ] Download system with signed URLs
- [ ] Rate limiting enforced

### Phase 4: Social Proof (CRITICAL - MVP) 🔥
- [ ] Review/rating system implemented
- [ ] Only purchasers can review
- [ ] Average ratings calculated
- [ ] Reviews display on products
- [ ] Verified purchase badges

### Phase 5: Polish & Admin (MEDIUM/LOW)
- [ ] Admin panel for moderation
- [ ] Email notifications
- [ ] Search and filters
- [ ] Creator profile pages

---

## 🚀 Recommended Build Order

**Week 1:**
1. Days 1-2: Phase 1 (Stripe Connect + Creator Onboarding)
2. Days 3-5: Phase 2 (File Upload + Product Creation)
3. Days 6-7: Phase 3 (Purchase + Download)

**Week 2:**
4. Days 8-9: Phase 4 (Reviews/Ratings - MVP must-have)
5. Days 10+: Phase 5 (Admin + Polish)

---

## 💡 Quick Start

**Today (Day 1):**
1. Get Stripe TEST API keys
2. Add to .env.local
3. Build creator onboarding flow
4. Test with your account

**Tomorrow (Day 2):**
1. Complete file upload system
2. Test with your xLights files
3. Extract metadata
4. Create first test product

---

**Ready to start? Let me know which task you want to tackle first!** 🚀
