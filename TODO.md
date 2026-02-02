# SequenceHUB - Prioritized TODO List
**Last Updated**: February 1, 2026

---

## IMMEDIATE PRIORITIES (Do These First)

### 1. Add Stripe Connect Onboarding Guard to Product Creation Page
**Priority**: CRITICAL
**Complexity**: Low
**Time Estimate**: 30 minutes
**Status**: Not Started

**Why This Matters**:
Users can currently create products without setting up Stripe Connect, which means they cannot receive payments. This creates a confusing user experience and will lead to support tickets.

**Implementation Location**:
- File: `/Users/cope/SHUB-V1/src/app/dashboard/products/new/page.tsx`

**What to Add**:
1. Check if user has completed Stripe Connect onboarding
2. Show prominent alert if Stripe is not set up
3. Add "Set Up Payments" button linking to `/dashboard/creator/onboarding`
4. Optionally: Prevent product creation entirely (show modal instead)

**Implementation Details**: See `STRIPE_GUARD_IMPLEMENTATION.md` for exact code to add.

**Acceptance Criteria**:
- [ ] Alert displays at top of page if Stripe not connected
- [ ] Alert shows clear call-to-action to set up Stripe
- [ ] Link to Stripe onboarding page works
- [ ] Visual indicator in dashboard shows Stripe connection status
- [ ] User can still save drafts (optional requirement)

---

### 2. Test Marketplace Functionality
**Priority**: CRITICAL
**Complexity**: Low (Testing Only)
**Time Estimate**: 1 hour
**Status**: Not Started

**What to Test**:

#### Homepage Product Browsing (`/`)
- [ ] Homepage loads without errors
- [ ] Products display in grid layout
- [ ] Product cards show correct information:
  - [ ] Title
  - [ ] Price
  - [ ] Category badge
  - [ ] Creator name
  - [ ] File type indicators (FSEQ/Source)
- [ ] Clicking product navigates to detail page

#### Product Detail Pages (`/p/[slug]`)
- [ ] Product detail page loads
- [ ] All product information displays:
  - [ ] Cover image
  - [ ] Title and description
  - [ ] Price
  - [ ] Creator profile card
  - [ ] xLights metadata (version compatibility, props, etc.)
  - [ ] File listing
  - [ ] Version history
- [ ] "Purchase" button is visible
- [ ] Navigation back to homepage works

#### Search and Filtering
- [ ] Search bar accepts input
- [ ] Search returns relevant results
- [ ] Category filter works (Christmas, Halloween, etc.)
- [ ] Price range filter works
- [ ] Sort options work (Newest, Price, Popular)
- [ ] Filters can be cleared/reset

#### Library/Purchases Page (`/library`)
- [ ] Page loads (may be empty if no purchases yet)
- [ ] Shows "No purchases yet" state when appropriate
- [ ] Purchase history displays when orders exist
- [ ] Download buttons are present

**How to Test**:
1. Start dev server: `bun run dev`
2. Register new test account at `/auth/register`
3. Navigate through each page systematically
4. Document any errors in console
5. Note any UI/UX issues

**Expected Issues**:
- Products may not display if database is empty (run seed script if needed)
- Some features may require actual data (create test products)

---

### 3. Test Complete Seller Flow
**Priority**: CRITICAL
**Complexity**: Medium
**Time Estimate**: 1 hour
**Status**: Not Started

**Flow to Test**:
```
User Registration → Login → Dashboard → Stripe Onboarding → Create Product → Publish
```

**Step-by-Step Test**:

1. **User Registration**
   - [ ] Navigate to `/auth/register`
   - [ ] Fill in name, email, password
   - [ ] Submit form
   - [ ] Verify redirect to dashboard
   - [ ] Check that user appears in Supabase dashboard

2. **Access Dashboard**
   - [ ] Dashboard loads at `/dashboard`
   - [ ] Stats display (will be zeros for new user)
   - [ ] Navigation menu works
   - [ ] User info displays in header

3. **Stripe Connect Onboarding**
   - [ ] Navigate to `/dashboard/creator/onboarding`
   - [ ] "Start Onboarding" button works
   - [ ] Redirects to Stripe Connect form
   - [ ] Complete Stripe onboarding (test mode)
   - [ ] Return URL redirects back to dashboard
   - [ ] Stripe status updates in database

4. **Create Product**
   - [ ] Navigate to `/dashboard/products/new`
   - [ ] Fill in all required fields:
     - [ ] Title
     - [ ] Description
     - [ ] Category
     - [ ] Price
   - [ ] Toggle FSEQ/Source switches
   - [ ] Upload test files (if file upload works)
   - [ ] Add xLights metadata (optional fields)
   - [ ] Set license type (Personal/Commercial)
   - [ ] Preview product
   - [ ] Save as draft
   - [ ] Verify product appears in `/dashboard/products`

5. **Publish Product**
   - [ ] Edit draft product
   - [ ] Click "Publish" button
   - [ ] Verify status changes to "Published"
   - [ ] Navigate to marketplace homepage
   - [ ] Confirm product appears in listing

**Blockers to Document**:
- List any step that fails
- Note error messages
- Capture console errors
- Screenshot UI issues

---

## SHORT-TERM GOALS (Next 1-2 Weeks)

### 4. Complete File Upload System Integration
**Priority**: High
**Complexity**: High
**Time Estimate**: 4-6 hours
**Status**: Backend Ready, Frontend Needs Integration

**Current State**:
- Upload API endpoints exist (`/api/upload/*`)
- Supabase Storage buckets configured
- Frontend UI exists in product creation page
- Integration is incomplete

**What Needs to Be Done**:

1. **Connect Frontend to Upload API**
   - Update file upload handler in `/dashboard/products/new/page.tsx`
   - Call `/api/upload/initiate` to start upload
   - Implement chunked upload for large files
   - Show upload progress bar
   - Handle upload errors gracefully

2. **File Metadata Extraction**
   - Parse FSEQ headers (duration, FPS, channels)
   - Extract XSQ/XML metadata
   - Calculate SHA-256 hash
   - Store metadata in `product_files` table

3. **File Validation**
   - Check file extensions match content (magic bytes)
   - Enforce file size limits
   - Validate file types (.fseq, .xsq, .xml, .mp4, etc.)
   - Prevent duplicate uploads (check hash)

4. **Storage Integration**
   - Upload files to Supabase Storage
   - Generate storage paths (`product-files/[productId]/[filename]`)
   - Set proper bucket permissions
   - Handle storage errors

**Files to Modify**:
- `/Users/cope/SHUB-V1/src/app/dashboard/products/new/page.tsx` (frontend)
- `/Users/cope/SHUB-V1/src/app/api/upload/simple/route.ts` (backend)
- `/Users/cope/SHUB-V1/src/app/api/dashboard/products/route.ts` (product creation)

**Acceptance Criteria**:
- [ ] Users can upload files from product creation page
- [ ] Upload progress displays
- [ ] Files appear in Supabase Storage
- [ ] File metadata is extracted and stored
- [ ] Files are linked to products correctly
- [ ] Download URLs work for purchased products

---

### 5. Implement Stripe Connect Express Onboarding Flow
**Priority**: High
**Complexity**: Medium
**Time Estimate**: 3-4 hours
**Status**: Partial (Onboarding page exists)

**Current State**:
- Onboarding page exists at `/dashboard/creator/onboarding`
- Stripe Connect library imported (`/lib/stripe-connect.ts`)
- Database fields ready (`creator_accounts` table)
- API endpoints created

**What Needs to Be Done**:

1. **Complete Onboarding UI**
   - Display current Stripe status
   - Show "Connect Stripe" button if not connected
   - Display onboarding progress if in progress
   - Show success state when completed
   - Handle errors gracefully

2. **OAuth Flow Implementation**
   - Generate Stripe Connect OAuth link
   - Handle OAuth redirect callback
   - Exchange authorization code for account ID
   - Store account ID in database
   - Update user's creator_account record

3. **Onboarding Status Tracking**
   - Check if user has completed onboarding
   - Display required steps if incomplete
   - Show verification status
   - Handle rejected accounts

4. **Webhook Integration**
   - Listen for `account.updated` events
   - Update database when onboarding completes
   - Handle `account.application.deauthorized` (disconnect)
   - Log all events to audit log

**Files to Modify**:
- `/Users/cope/SHUB-V1/src/app/dashboard/creator/onboarding/page.tsx`
- `/Users/cope/SHUB-V1/src/app/api/creator/onboarding/start/route.ts`
- `/Users/cope/SHUB-V1/src/app/api/creator/onboarding/status/route.ts`
- `/Users/cope/SHUB-V1/src/app/api/webhooks/stripe/route.ts`

**Acceptance Criteria**:
- [ ] Creators can initiate Stripe onboarding
- [ ] OAuth flow redirects to Stripe
- [ ] Callback handler processes authorization
- [ ] Account ID is stored in database
- [ ] Onboarding status displays correctly
- [ ] Creators can receive test payments
- [ ] Dashboard shows Stripe connection status

---

### 6. Add Email Notifications
**Priority**: Medium
**Complexity**: Medium
**Time Estimate**: 3-4 hours
**Status**: Not Started

**Email Provider**: Resend (recommended) or SendGrid

**Emails to Implement**:

1. **Transactional Emails**
   - [ ] Welcome email (after registration)
   - [ ] Purchase confirmation (buyer)
   - [ ] Sale notification (seller)
   - [ ] Download ready notification
   - [ ] Refund notification

2. **Marketing Emails** (Optional)
   - [ ] New product from followed creators
   - [ ] Weekly digest of new products
   - [ ] Abandoned cart reminders

3. **System Emails**
   - [ ] Password reset (if implemented)
   - [ ] Account verification (if implemented)
   - [ ] Important updates

**Implementation Steps**:

1. **Set Up Email Provider**
   - Create Resend account
   - Get API key
   - Add to `.env`: `RESEND_API_KEY=`
   - Install package: `bun add resend`

2. **Create Email Templates**
   - Design HTML email templates
   - Use React Email or similar
   - Maintain plain text versions
   - Test rendering in multiple clients

3. **Integrate with Application**
   - Create email utility (`/lib/email.ts`)
   - Add email sending to relevant API routes:
     - Registration endpoint
     - Webhook handler (purchase/refund)
     - Order creation
   - Add email preferences to user settings

4. **Testing**
   - Test all email types in development
   - Verify delivery
   - Check spam score
   - Test unsubscribe functionality

**Files to Create**:
- `/Users/cope/SHUB-V1/src/lib/email.ts`
- `/Users/cope/SHUB-V1/src/emails/` (template directory)

**Acceptance Criteria**:
- [ ] Welcome emails sent on registration
- [ ] Purchase emails sent to buyers
- [ ] Sale notifications sent to sellers
- [ ] All emails render correctly
- [ ] Unsubscribe links work
- [ ] Email logs captured in audit log

---

### 7. Deploy to Vercel
**Priority**: Medium
**Complexity**: Low
**Time Estimate**: 1-2 hours
**Status**: Not Started

**Current State**:
- Vercel configuration exists (`/vercel.json`)
- Deployment guide exists (`/DEPLOYMENT_GUIDE.md`)
- Application is Vercel-ready

**Deployment Steps**:

1. **Pre-Deployment Checklist**
   - [ ] All environment variables documented
   - [ ] `.env.example` is up to date
   - [ ] Build succeeds locally: `bun run build`
   - [ ] All tests pass (if implemented)
   - [ ] Git working directory is clean
   - [ ] All changes committed and pushed

2. **Vercel Setup**
   - [ ] Create Vercel account (if needed)
   - [ ] Import GitHub repository
   - [ ] Configure project settings
   - [ ] Set framework preset to "Next.js"
   - [ ] Set build command: `bun run build`
   - [ ] Set output directory: `.next`

3. **Environment Variables**
   - [ ] Add all required env vars in Vercel dashboard:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `DATABASE_URL`
     - `DOWNLOAD_SECRET`
     - `STRIPE_SECRET_KEY`
     - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `NEXT_PUBLIC_BASE_URL`

4. **Deploy**
   - [ ] Trigger first deployment
   - [ ] Monitor build logs
   - [ ] Verify deployment succeeds
   - [ ] Test deployed application

5. **Post-Deployment**
   - [ ] Configure custom domain (if available)
   - [ ] Update Stripe webhook URL to production
   - [ ] Test webhooks in production
   - [ ] Test authentication flow
   - [ ] Test checkout flow
   - [ ] Monitor error logs

**Reference**: See `/Users/cope/SHUB-V1/DEPLOYMENT_GUIDE.md` for detailed instructions.

**Acceptance Criteria**:
- [ ] Application deploys successfully
- [ ] All pages load in production
- [ ] Authentication works
- [ ] Database queries work
- [ ] Stripe payments work (test mode)
- [ ] File uploads work
- [ ] Downloads work

---

## MEDIUM-TERM GOALS (Next 1 Month)

### 8. Build Admin Panel
**Priority**: Medium
**Complexity**: High
**Time Estimate**: 8-10 hours
**Status**: Not Started

**Pages to Create**:

1. **Admin Dashboard** (`/admin`)
   - Platform statistics
   - Recent activity
   - Pending moderation queue
   - Revenue metrics

2. **User Management** (`/admin/users`)
   - List all users
   - Search/filter users
   - View user details
   - Ban/suspend users
   - Edit user roles
   - View user activity logs

3. **Product Moderation** (`/admin/products`)
   - List all products (published/draft/archived)
   - Review new products
   - Approve/reject products
   - Feature products on homepage
   - Remove inappropriate content

4. **Order Management** (`/admin/orders`)
   - List all orders
   - Search by order number, user, product
   - View order details
   - Process refunds
   - Handle disputes

5. **Payout Management** (`/admin/payouts`)
   - View creator earnings
   - See pending payouts
   - Review payout history
   - Handle payout issues

6. **Reports & Analytics** (`/admin/reports`)
   - Sales reports
   - User growth
   - Popular products
   - Revenue trends
   - Geographic data

**Security Considerations**:
- Require ADMIN role for all admin routes
- Audit log all admin actions
- Implement IP whitelisting (optional)
- Add 2FA for admin accounts (future)

**Acceptance Criteria**:
- [ ] Only admins can access `/admin` routes
- [ ] All admin actions are logged
- [ ] Admins can manage users
- [ ] Admins can moderate products
- [ ] Admins can process refunds
- [ ] Dashboard shows accurate statistics

---

### 9. Implement Comprehensive Rate Limiting
**Priority**: Medium
**Complexity**: Medium
**Time Estimate**: 4-6 hours
**Status**: Partial (Download rate limiting exists)

**Current State**:
- Download rate limiting implemented (10/day)
- Rate limit library exists (`/lib/rate-limit/`)
- Basic infrastructure in place

**What to Add**:

1. **Authentication Rate Limiting**
   - Login attempts: 10 per 15 minutes per IP
   - Registration: 5 per hour per IP
   - Password reset: 5 per hour per email

2. **API Rate Limiting**
   - Product creation: 10 per hour per user
   - Product updates: 30 per hour per user
   - General API: 100 requests per minute per IP
   - Search queries: 60 per minute per IP

3. **File Operations**
   - Upload initiate: 10 per hour per user
   - Upload complete: 10 per hour per user
   - Download attempts: Already implemented

4. **Checkout/Payment**
   - Checkout creation: 10 per hour per user
   - Prevents payment spam

**Implementation**:
- Use existing rate limit utilities
- Add middleware to API routes
- Return 429 status when exceeded
- Log rate limit violations
- Consider Redis for distributed rate limiting (optional)

**Files to Modify**:
- `/Users/cope/SHUB-V1/src/app/api/auth/*/route.ts`
- `/Users/cope/SHUB-V1/src/app/api/dashboard/products/route.ts`
- `/Users/cope/SHUB-V1/src/app/api/checkout/create/route.ts`
- `/Users/cope/SHUB-V1/src/app/api/upload/*/route.ts`

**Acceptance Criteria**:
- [ ] Login rate limiting works
- [ ] API rate limiting works
- [ ] Rate limit headers returned (X-RateLimit-*)
- [ ] 429 errors returned when exceeded
- [ ] Rate limit violations logged
- [ ] Users see helpful error messages

---

### 10. Add SEO Optimizations
**Priority**: Medium
**Complexity**: Low
**Time Estimate**: 2-3 hours
**Status**: Not Started

**What to Add**:

1. **Meta Tags**
   - Dynamic page titles
   - Meta descriptions for all pages
   - Open Graph tags (Facebook/LinkedIn)
   - Twitter Card tags
   - Canonical URLs

2. **Structured Data (Schema.org)**
   - Product schema for product pages
   - Breadcrumb schema
   - Organization schema
   - Review schema (future)

3. **Sitemap**
   - Generate XML sitemap
   - Include all public pages
   - Include all published products
   - Update automatically

4. **Robots.txt**
   - Allow crawling of public pages
   - Disallow admin, dashboard, API routes
   - Link to sitemap

5. **Performance**
   - Image optimization (already using Next.js Image)
   - Lazy loading
   - Code splitting
   - CDN integration

**Files to Create/Modify**:
- `/Users/cope/SHUB-V1/src/app/sitemap.ts`
- `/Users/cope/SHUB-V1/public/robots.txt`
- Update all page components with metadata

**Acceptance Criteria**:
- [ ] All pages have unique titles
- [ ] Meta descriptions present
- [ ] Open Graph tags work (test with Facebook debugger)
- [ ] Sitemap generates correctly
- [ ] Google Search Console validates schema
- [ ] Page speed score > 90 (Lighthouse)

---

### 11. Create Background Job System
**Priority**: Medium
**Complexity**: High
**Time Estimate**: 6-8 hours
**Status**: Infrastructure exists (`/lib/jobs/`)

**Current State**:
- Job infrastructure exists
- No active jobs implemented

**Jobs to Implement**:

1. **File Processing Jobs**
   - Extract FSEQ metadata
   - Generate file previews/thumbnails
   - Virus scanning integration
   - Calculate file hashes

2. **Webhook Retry Jobs**
   - Retry failed Stripe webhooks
   - Exponential backoff
   - Dead letter queue

3. **Email Queue**
   - Send transactional emails
   - Batch marketing emails
   - Handle bounces/failures

4. **Scheduled Jobs (Cron)**
   - Daily sales reports
   - Weekly payout processing
   - Monthly analytics
   - Cleanup old download tokens

5. **Maintenance Jobs**
   - Database vacuum/optimize
   - Clear expired sessions
   - Archive old audit logs

**Implementation Options**:
- Use Vercel Cron (for scheduled jobs)
- Use BullMQ + Redis (for queue)
- Use Inngest (serverless queue)
- Use Trigger.dev (managed background jobs)

**Acceptance Criteria**:
- [ ] Jobs can be queued
- [ ] Jobs process reliably
- [ ] Failed jobs retry automatically
- [ ] Job status can be monitored
- [ ] Scheduled jobs run on time
- [ ] Performance is acceptable

---

## LONG-TERM GOALS (Next 3 Months)

### 12. Advanced Features

1. **Product Reviews & Ratings**
   - Star ratings (1-5)
   - Written reviews
   - Review moderation
   - Verified purchase badge

2. **Creator Profiles**
   - Public creator pages
   - Portfolio of products
   - Bio and social links
   - Follow functionality

3. **Collections & Bundles**
   - Create product bundles
   - Discounted bundle pricing
   - Seasonal collections

4. **Wishlist & Favorites**
   - Save products for later
   - Share wishlists
   - Price drop notifications

5. **Affiliate System**
   - Referral links
   - Affiliate commissions
   - Tracking dashboard

6. **Advanced Analytics**
   - Product performance
   - Traffic sources
   - Conversion rates
   - Customer insights

7. **Social Features**
   - Comments on products
   - Community forum
   - Creator Q&A

8. **Mobile App** (Future)
   - React Native app
   - Push notifications
   - Offline mode for downloads

---

## BUGS & TECHNICAL DEBT

### Known Issues

1. **Product Creation Page - Minor JSX Issue**
   - **Location**: `/Users/cope/SHUB-V1/src/app/dashboard/products/new/page.tsx:874`
   - **Issue**: Extra closing `</div>` tag
   - **Impact**: None (renders correctly despite extra tag)
   - **Priority**: Low
   - **Fix**: Remove extra `</div>` on line 874

### Technical Debt

1. **Auth System Dual Implementation**
   - Currently using both JWT (custom) and Supabase Auth
   - Should consolidate to Supabase Auth only
   - Migration required for existing users

2. **File Upload System**
   - Backend exists but not fully integrated
   - Need to implement chunked uploads for large files
   - Should add resumable upload support

3. **Error Handling**
   - Some API routes need better error messages
   - Should add error boundary components
   - Need consistent error response format

4. **Testing**
   - No automated tests currently
   - Should add unit tests for utilities
   - Should add integration tests for API routes
   - Should add E2E tests for critical flows

---

## COMPLETED TASKS ✅

### Session 1 (February 1, 2026)

- [x] Migrate from SQLite to Supabase PostgreSQL
- [x] Create 18 database tables with relationships
- [x] Implement Row Level Security (RLS) policies
- [x] Set up 3 Supabase Storage buckets
- [x] Fix auth utilities Server Actions error
- [x] Fix login/register redirect issue
- [x] Fix dashboard redirect loop
- [x] Remove demo credentials from login page
- [x] Fix Grammarly hydration error
- [x] Create dashboard settings page
- [x] Commit all changes to git
- [x] Push to GitHub repository
- [x] Create comprehensive documentation

---

## Notes for Future Development

### When Starting a New Task:

1. **Read relevant documentation first**:
   - `CLAUDE.md` - Project conventions
   - `ARCHITECTURE.md` - System design
   - `SECURITY.md` - Security guidelines

2. **Check current status**:
   - `PROJECT_STATUS.md` - Feature completion
   - This `TODO.md` - Task priorities

3. **Before coding**:
   - Verify environment is set up
   - Pull latest changes from git
   - Create feature branch (optional)
   - Test that dev server runs

4. **After completing a task**:
   - Test thoroughly
   - Update documentation
   - Commit changes with descriptive message
   - Mark task as complete in this TODO
   - Update PROJECT_STATUS.md if needed

### Getting Help

- **Supabase Issues**: Check `SUPABASE_IMPLEMENTATION_GUIDE.md`
- **Stripe Issues**: Check `STRIPE_CONNECT_ONBOARDING.md`
- **Deployment**: Check `DEPLOYMENT_GUIDE.md`
- **File Upload**: Check `docs/FILE_UPLOAD_SYSTEM.md`

---

**Last Updated**: February 1, 2026
**Maintained By**: Development Team
**Next Review**: After completing immediate priorities
