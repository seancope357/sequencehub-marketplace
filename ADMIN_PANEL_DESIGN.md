# SequenceHUB Admin Panel Design & Implementation Roadmap

## Executive Summary

This document outlines a comprehensive admin panel strategy for SequenceHUB's marketplace platform. The admin panel enables platform administrators to oversee the entire marketplace ecosystem including users, products, transactions, and platform health.

**Key Insight**: SequenceHUB already has:
- Robust audit logging infrastructure (AuditLog model with 20+ action types)
- User role system (ADMIN, CREATOR, BUYER)
- Complete financial tracking (Orders, Entitlements, Platform fees)
- Creator onboarding workflow (Stripe Connect integration)

This plan leverages existing infrastructure to build a powerful admin console with minimal new dependencies.

---

## Part 1: Current Admin Capabilities Analysis

### Existing Admin Infrastructure

**Database Models Ready for Admin Use:**
- `User` + `UserRole` - Complete user management with role-based access control
- `AuditLog` - 20+ event types already tracked (login, product operations, payments, security alerts)
- `CreatorAccount` - Stripe Connect status, onboarding progress, payout info
- `Product` - Status tracking (DRAFT, PUBLISHED, ARCHIVED, SUSPENDED)
- `Order` - Payment tracking with refund history
- `Entitlement` - Download rights and active status
- `AccessLog` - Security event tracking for downloads

**Auth Infrastructure:**
- JWT-based authentication with role checking functions:
  - `isAdmin(user)` - Check admin role
  - `hasRole(user, role)` - Generic role checker
- Server actions available via `getCurrentUser()`
- HTTP-only cookie-based sessions

**Audit Logging Already Implemented:**
```
USER_LOGIN, USER_LOGOUT, USER_CREATED, USER_UPDATED, USER_DELETED,
PRODUCT_CREATED, PRODUCT_UPDATED, PRODUCT_PUBLISHED, PRODUCT_ARCHIVED,
FILE_UPLOADED, FILE_DELETED,
ORDER_CREATED, ORDER_REFUNDED, PAYMENT_RECEIVED,
STRIPE_WEBHOOK_RECEIVED, STRIPE_ACCOUNT_UPDATED,
RATE_LIMIT_EXCEEDED, SECURITY_ALERT, DOWNLOAD_ACCESS_DENIED
```

**Missing (To Be Built):**
- Admin UI/dashboard components
- Admin-specific API routes (/api/admin/*)
- Role-gating middleware for admin routes
- Analytics endpoints for platform-wide metrics
- Admin action logging (moderation, user suspension, etc.)

---

## Part 2: Admin Panel Feature Map

### Feature Categorization

#### PHASE 1: MVP (Essential Admin Tools) - Weeks 1-2

**A. Dashboard & Analytics**
- Overview cards: Active users, Total revenue, Platform fee earnings, Pending content
- Quick metrics: Sales this month, Downloads this month, Top 5 products
- Revenue chart: Monthly earnings with platform fee breakdown
- User growth chart: New creators vs buyers over time

**B. User Management**
- User directory: Search, filter by role, email, status
- User detail view: Email, creation date, role(s), account status
- Actions: View activity, suspend account, change role, reset password
- Bulk actions: Suspend multiple accounts, export user list

**C. Product Moderation**
- Product queue: Published/draft/archived products
- Filtering: By category, creator, status, date
- Product detail: Full product info, file count, sales, reviews pending
- Actions: View full details, approve pending, suspend if TOS violation
- Bulk actions: Suspend multiple products, bulk publish pending items

**D. Transaction Oversight**
- Order list: Order number, creator, buyer, amount, date, status
- Order detail: Line items, payment method, payout status to creator
- Refund management: View refund requests, process refunds
- Payment tracking: Pending payouts, failed transactions

**E. Audit & Security**
- Audit log viewer: Filter by action type, user, date range, entity type
- Access log: Download attempts, failed authentications
- Security alerts: Rate limit exceeded events, suspicious access patterns
- IP blocklist: View and manage blocked IPs (future)

**U1: Admin User Story - Dashboard Access**
```
As a platform admin, I want to see the dashboard home page with:
  - Platform health metrics (users, revenue, products)
  - Recent activity feed from AuditLog
  - Quick action buttons
So that I can assess marketplace status at a glance
```

**U2: Admin User Story - User Suspension**
```
As a platform admin, I want to suspend a user account:
  - Prevent login, prevent new uploads
  - Revoke active entitlements (optional)
  - Notify user of suspension reason
So that I can enforce ToS violations
```

**U3: Admin User Story - Product Suspension**
```
As a platform admin, I want to suspend products:
  - Hide from marketplace, prevent new purchases
  - Optionally refund existing buyers
  - Log reason and evidence
So that I can remove policy-violating content quickly
```

**U4: Admin User Story - Refund Processing**
```
As a platform admin, I want to process refunds:
  - View refund request details
  - Issue refund via Stripe
  - Notify buyer and creator
  - Track refund status
So that I can handle disputes and returns
```

#### PHASE 2: Enhanced Capabilities - Weeks 3-4

**A. Advanced Analytics**
- Creator analytics: Revenue per creator, sales trends, retention rates
- Product performance: Sales velocity, top categories, seasonal trends
- Buyer behavior: Cohort analysis, repeat purchase rates, churn
- Geographic data: Sales by region (if available in metadata)

**B. Content Management**
- Bulk product actions: Mass suspend, archive, update category
- Product approval workflow: Pending submission queue, approval templates
- Meta information: Edit product titles, descriptions, categories
- Version management: View/delete specific versions

**C. Financial Controls**
- Platform fee settings: Adjust percentage per creator/product
- Payout controls: Manual payout triggering, hold funds
- Stripe Connect management: View connected accounts, re-onboard creators
- Tax documentation: Export revenue summaries for reports

**D. Communication**
- User messaging: Send announcements to user segments
- Email templates: Set up system emails (refund, suspension)
- Notification preferences: Control what events are logged

**E. Platform Configuration**
- Feature flags: Enable/disable marketplace features
- Category management: Add/edit/remove product categories
- License type configuration: Set available license types
- Rate limit settings: Adjust per-user limits

#### PHASE 3: Advanced Features - Future

- Machine learning moderation (detect policy violations)
- Automated fraud detection
- Advanced reporting & BI dashboards
- Custom admin roles and permissions
- Admin activity audit trail (who made what changes)
- API key management for admins
- Webhook management and testing

---

## Part 3: Page Structure & Routes

### Admin Route Architecture

```
/admin
├── /admin/dashboard
│   └── page.tsx (Overview, stats, quick actions)
├── /admin/users
│   ├── page.tsx (User directory with filters)
│   ├── /[id]/page.tsx (User detail, actions)
│   └── /[id]/activity.tsx (User activity/audit logs)
├── /admin/products
│   ├── page.tsx (Product directory, moderation queue)
│   ├── /[id]/page.tsx (Product detail, suspension controls)
│   └── /[id]/editor.tsx (Edit product metadata)
├── /admin/orders
│   ├── page.tsx (Order list with filters)
│   ├── /[id]/page.tsx (Order detail, refund controls)
│   └── /refunds.tsx (Refund request queue)
├── /admin/analytics
│   ├── page.tsx (Charts, trends, KPIs)
│   ├── /revenue.tsx (Revenue breakdown)
│   └── /users.tsx (User metrics)
├── /admin/audit
│   ├── page.tsx (Audit log viewer)
│   ├── /access.tsx (Download/access logs)
│   └── /security.tsx (Security events, rate limits)
└── /admin/settings
    ├── page.tsx (Platform configuration)
    ├── /fees.tsx (Fee structure)
    ├── /categories.tsx (Product categories)
    └── /email.tsx (Email templates)
```

### API Routes for Admin Backend

```
/api/admin/
├── auth/
│   ├── verify-admin (Verify admin role)
│   └── admin-log (Log admin actions)
├── users/
│   ├── GET list with filters, search
│   ├── GET [id] detail view
│   ├── PATCH [id] update user
│   ├── POST [id]/suspend (Suspend account)
│   ├── POST [id]/unsuspend (Reactivate)
│   └── GET [id]/activity (User's audit log)
├── products/
│   ├── GET list with moderation filters
│   ├── GET [id] detail
│   ├── POST [id]/suspend (Hide product)
│   ├── POST [id]/unsuspend (Restore)
│   ├── PATCH [id] (Update metadata)
│   └── GET [id]/versions (Version history)
├── orders/
│   ├── GET list with filters
│   ├── GET [id] detail
│   ├── POST [id]/refund (Process refund)
│   ├── GET /revenue-summary (Platform fee earnings)
│   └── GET /pending-payouts (Creator payouts due)
├── analytics/
│   ├── GET /dashboard (KPI cards)
│   ├── GET /revenue-trends (Monthly revenue chart)
│   ├── GET /user-growth (New users chart)
│   ├── GET /top-products (Sales leaders)
│   ├── GET /creator-stats (Per-creator breakdown)
│   └── GET /platform-health (System metrics)
├── audit/
│   ├── GET logs (Filterable audit log)
│   ├── GET logs/by-action (Filter by action type)
│   ├── GET logs/by-user (User's actions)
│   ├── GET access-log (Download attempts)
│   └── GET security-events (Rate limits, failures)
└── settings/
    ├── GET fees (Current fee structure)
    ├── PATCH fees (Update fees)
    ├── GET categories (Available categories)
    └── POST categories (Create new category)
```

### Component Hierarchy

```
AdminLayout
├── AdminSidebar
│   ├── NavLink (Dashboard)
│   ├── NavLink (Users)
│   ├── NavLink (Products)
│   ├── NavLink (Orders)
│   ├── NavLink (Analytics)
│   ├── NavLink (Audit)
│   └── NavLink (Settings)
├── AdminTopbar
│   ├── SearchBar (Global search)
│   ├── NotificationBell (System alerts)
│   └── AdminProfileMenu
│
└── Page Content
    ├── DashboardPage
    │   ├── StatsCards (4-column grid)
    │   ├── RevenueChart
    │   ├── UserGrowthChart
    │   ├── ActivityFeed
    │   └── QuickActions
    │
    ├── UsersPage
    │   ├── UserFilters (Role, status, date)
    │   ├── SearchBar
    │   ├── UserTable
    │   │   ├── UserRow
    │   │   │   ├── Avatar
    │   │   │   ├── Name/Email
    │   │   │   ├── Role Badge
    │   │   │   ├── Status
    │   │   │   └── ActionMenu
    │   │   └── Pagination
    │   └── BulkActions (Select multiple)
    │
    ├── ProductsPage
    │   ├── ProductFilters (Status, category, date)
    │   ├── SearchBar
    │   ├── ProductTable
    │   │   ├── ProductRow (thumbnail, title, creator, status, sales)
    │   │   └── ActionMenu (Suspend, view, edit)
    │   ├── ModerationQueue (Pending items highlighted)
    │   └── Pagination
    │
    ├── OrdersPage
    │   ├── OrderFilters (Status, date range, creator)
    │   ├── OrderTable (OrderNum, buyer, creator, amount, date, status)
    │   └── OrderDetailModal (with refund controls)
    │
    ├── AnalyticsPage
    │   ├── StatCards (Revenue, users, products, etc)
    │   ├── LineChart (Revenue trends)
    │   ├── BarChart (User growth)
    │   ├── Table (Top 10 products by sales)
    │   └── Table (Creator breakdown)
    │
    ├── AuditPage
    │   ├── Filters (Action type, user, date, entity)
    │   ├── AuditLogTable
    │   │   ├── Action badge (color-coded)
    │   │   ├── User link
    │   │   ├── Entity info
    │   │   ├── Timestamp
    │   │   ├── IP address
    │   │   └── Expand details (show JSON)
    │   └── Pagination
    │
    └── SettingsPage
        ├── PlatformFeeConfig
        ├── CategoryManager
        ├── EmailTemplates
        └── FeatureFlags
```

### Navigation Menu Design

```
ADMIN PANEL
└─ Dashboard         📊 Overview, KPIs, quick actions
└─ Users           👥 User management, suspension
└─ Products        📦 Moderation queue, suspend
└─ Orders          💳 Transactions, refunds
└─ Analytics       📈 Revenue, trends, metrics
└─ Audit           🔍 Security logs, activity
└─ Settings        ⚙️ Configuration, fees
```

**Mobile Navigation**: Collapsible sidebar → hamburger menu

---

## Part 4: Implementation Roadmap

### Phase 1: MVP (Weeks 1-2) - Core Admin Tools

**Week 1: Setup & Authentication**
- [ ] Create admin layout wrapper component (`AdminLayout.tsx`)
- [ ] Implement admin role check middleware (`/api/admin/auth/verify-admin`)
- [ ] Create admin authentication guard (redirect to login if not admin)
- [ ] Build admin sidebar & top navigation
- [ ] Create `/admin/dashboard` skeleton page
- [ ] Test admin access control

**Deliverables**:
- Admin authentication working
- Admin-only routes protected
- Navigation structure in place
- Ready for feature development

**Week 1.5: Dashboard & Stats**
- [ ] Create dashboard stats cards component
- [ ] Implement `/api/admin/analytics/dashboard` endpoint:
  - Total users (all time, this month)
  - Total revenue (platform fees only)
  - Pending content (suspended products, user actions)
  - Active creators this month
- [ ] Create revenue chart component (last 6 months)
- [ ] Create user growth chart (last 6 months)
- [ ] Implement activity feed component (recent AuditLog entries)
- [ ] Create quick action buttons (view pending users, moderate products)

**Deliverables**:
- Functional dashboard with key metrics
- Visual charts showing trends
- Activity feed showing recent events

**Week 2: User Management**
- [ ] Create user list page with table (`/admin/users`)
- [ ] Implement `/api/admin/users` endpoint:
  - GET list with filters (role, status, date range)
  - Support pagination and search
  - Return: ID, name, email, role, status, created date
- [ ] Create user detail page (`/admin/users/[id]`)
- [ ] Implement user actions:
  - POST `/api/admin/users/[id]/suspend` (set status, log action)
  - POST `/api/admin/users/[id]/unsuspend` (reactivate)
- [ ] Create user activity view (audit logs for specific user)
- [ ] Implement bulk suspend action (select multiple users)

**Deliverables**:
- User directory fully functional
- User suspension working
- Activity tracking for admins

**Week 2.5: Product Moderation**
- [ ] Create product list page (`/admin/products`)
- [ ] Implement `/api/admin/products` endpoint:
  - GET list with moderation filters (status, category, creator)
  - Highlight pending/at-risk items
  - Return: thumbnail, title, creator, status, sales count, date
- [ ] Create product detail page (`/admin/products/[id]`)
- [ ] Implement product actions:
  - POST `/api/admin/products/[id]/suspend` (hide, log reason)
  - POST `/api/admin/products/[id]/unsuspend` (restore)
- [ ] Show file list and metadata
- [ ] Add audit logging for admin actions

**Deliverables**:
- Product moderation queue fully functional
- Product suspension with logging
- Metadata visibility for review

**Week 3: Transactions & Audit**
- [ ] Create order list page (`/admin/orders`)
- [ ] Implement `/api/admin/orders` endpoint:
  - GET list with filters (status, date, creator)
  - Return: order number, buyer, creator, amount, status, date
- [ ] Create order detail page with refund controls
- [ ] Implement refund processing:
  - POST `/api/admin/orders/[id]/refund` (trigger Stripe refund)
  - Update Order.status, revoke Entitlement
  - Send audit log entry
- [ ] Create audit log viewer (`/admin/audit`)
- [ ] Implement audit log viewer:
  - GET `/api/admin/audit/logs` (with filters)
  - Filter by: action type, user, date range, entity type
  - Display: action, user, entity, timestamp, IP, details
  - JSON expand for detailed changes

**Deliverables**:
- Complete transaction visibility
- Refund processing capability
- Comprehensive audit trail viewable

### Phase 2: Enhanced Analytics (Weeks 3-4)

**Week 3.5: Analytics Dashboard**
- [ ] Create analytics home page (`/admin/analytics`)
- [ ] Implement `/api/admin/analytics` endpoints:
  - `/dashboard` - KPI summary cards
  - `/revenue-trends` - Monthly revenue breakdown
  - `/user-growth` - New users per month
  - `/top-products` - Top 10 by sales
  - `/creator-stats` - Per-creator metrics
- [ ] Build chart components:
  - Line chart for trends
  - Bar chart for comparisons
  - Summary tables with sorting
- [ ] Add date range picker for custom periods

**Deliverables**:
- Comprehensive analytics dashboard
- Data-driven insights for business decisions

**Week 4: Configuration & Polish**
- [ ] Create settings page (`/admin/settings`)
- [ ] Implement fee configuration:
  - GET `/api/admin/settings/fees`
  - PATCH `/api/admin/settings/fees`
  - Update platform fee percentage
- [ ] Category management:
  - GET/POST `/api/admin/settings/categories`
- [ ] Email template configuration
- [ ] Feature flag management
- [ ] Polish UI, add loading states, error handling

**Deliverables**:
- Platform configuration available to admins
- Settings management without code changes

---

## Part 5: Implementation Details

### Admin Role Protection Pattern

All admin routes must follow this pattern:

**In page components** (`/admin/[feature]/page.tsx`):
```typescript
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || !user.roles.some(r => r.role === 'ADMIN'))) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user?.roles.some(r => r.role === 'ADMIN')) {
    return <div>Loading or unauthorized...</div>;
  }

  return (
    <AdminLayout>
      {/* Page content */}
    </AdminLayout>
  );
}
```

**In API routes** (`/api/admin/[feature]/route.ts`):
```typescript
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  // 1. Verify user is authenticated
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. Verify admin role
  const isAdmin = user.roles?.some(r => r.role === 'ADMIN');
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Admin role required' },
      { status: 403 }
    );
  }

  // 3. Log admin action
  const ipAddress = request.headers.get('x-forwarded-for') || 'unknown';
  await db.auditLog.create({
    data: {
      userId: user.id,
      action: 'ADMIN_ACTION',
      entityType: 'admin_access',
      metadata: JSON.stringify({
        endpoint: '/api/admin/[feature]',
        method: 'GET',
      }),
      ipAddress,
    },
  });

  // 4. Perform operation
  try {
    // ... your logic
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Admin Action Logging

All admin actions must create audit logs:

```typescript
await db.auditLog.create({
  data: {
    userId: admin.id,
    action: 'ADMIN_ACTION', // or specific action like USER_SUSPENDED
    entityType: 'user', // what entity was affected
    entityId: targetUser.id, // ID of affected entity
    changes: JSON.stringify({
      from: { status: 'active' },
      to: { status: 'suspended' },
      reason: 'ToS violation',
    }),
    metadata: JSON.stringify({
      adminName: admin.name,
      reason: 'ToS violation - spam behavior',
      notified: true,
    }),
    ipAddress: admin.ipAddress,
  },
});
```

### Database Queries for Admin Pages

**Dashboard Stats:**
```typescript
// Total users
const userCount = await db.user.count();
const creatorCount = await db.userRole.count({
  where: { role: 'CREATOR' }
});

// Platform fee earnings
const orders = await db.order.findMany({
  where: { status: 'COMPLETED' },
  include: {
    items: {
      include: { product: { select: { creator: true } } }
    }
  }
});
const platformFees = orders.reduce((sum, order) => {
  const creatorAmount = order.totalAmount * 0.9; // 90% to creator
  const platformFee = order.totalAmount * 0.1; // 10% to platform
  return sum + platformFee;
}, 0);

// Revenue chart (last 6 months)
const revenueByMonth = await db.order.groupBy({
  by: ['createdAt'],
  where: { status: 'COMPLETED' },
  _sum: { totalAmount: true },
});
```

**User Directory:**
```typescript
const users = await db.user.findMany({
  where: {
    ...(roleFilter && { roles: { some: { role: roleFilter } } }),
    ...(searchTerm && {
      OR: [
        { email: { contains: searchTerm } },
        { name: { contains: searchTerm } },
      ]
    }),
  },
  include: { roles: true, profile: true },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

**Product Moderation Queue:**
```typescript
const products = await db.product.findMany({
  where: {
    status: statusFilter || undefined,
    category: categoryFilter || undefined,
    createdAt: {
      gte: dateFrom,
      lte: dateTo,
    },
  },
  include: {
    creator: { select: { name: true, email: true } },
    media: { where: { mediaType: 'cover' }, take: 1 },
    prices: { take: 1 },
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize,
});
```

---

## Part 6: Quick Wins (Maximum Value, Minimal Effort)

### Quick Win #1: Audit Log Viewer (1 day)
**Value**: Immediate security visibility
**Effort**: Minimal - AuditLog model already exists and is being used

1. Create `/admin/audit` page
2. Add simple GET endpoint filtering AuditLog by date range, action
3. Display in table with JSON expand
4. **ROI**: Platform administrators can instantly see all platform activities, security events, and admin actions
5. **Prerequisite**: None - use existing schema

### Quick Win #2: User Suspension (1 day)
**Value**: Immediate moderation capability
**Effort**: Low - just needs API endpoint + button

1. Add `isSuspended` flag to User model (migration needed) OR use existing status field
2. Create suspend endpoint: POST `/api/admin/users/[id]/suspend`
3. Add button to user detail page
4. Update login flow to check suspension status
5. **ROI**: Can immediately enforce ToS violations without code changes
6. **Side effect**: Prevents login, but doesn't revoke existing purchases

### Quick Win #3: Product Suspension (1 day)
**Value**: Remove harmful content immediately
**Effort**: Very low - ProductStatus.SUSPENDED already in schema

1. Use existing ProductStatus enum (already has SUSPENDED value)
2. Create endpoint: POST `/api/admin/products/[id]/suspend`
3. Add button to product detail page
4. Update product list query: exclude SUSPENDED from marketplace
5. **ROI**: Non-disruptive content moderation (products still purchasable, not refunded)
6. **Side effect**: Hides product from new buyers, existing buyers keep access

### Quick Win #4: Dashboard Metrics (1 day)
**Value**: Platform health at a glance
**Effort**: Low - mostly SQL aggregation

1. Create `/admin/dashboard` page with 4 stat cards:
   - Total users
   - Total revenue (platform fees)
   - Total products published
   - Orders this month
2. Add simple line chart with last 6 months revenue
3. **ROI**: Admins can instantly gauge marketplace health
4. **No schema changes needed**

### Quick Win #5: Refund Processing (2 days)
**Value**: Handle disputes and unhappy customers
**Effort**: Medium - requires Stripe API integration

1. Create GET `/api/admin/orders` endpoint with Order details
2. Add refund button that calls Stripe: `stripe.refunds.create()`
3. Update Order.status to REFUNDED
4. Optionally revoke Entitlement so buyer can't download
5. Send email notification to buyer
6. **ROI**: Can satisfy customers without developer intervention
7. **Prerequisite**: Stripe integration already exists

---

## Part 7: Data Visualization Strategy

### Chart Selection by Feature

| Feature | Chart Type | Data | Library |
|---------|-----------|------|---------|
| Revenue Trends | Line Chart | Monthly revenue (last 12 months) | recharts |
| User Growth | Bar Chart | New users per month | recharts |
| Top Products | Horizontal Bar | Top 10 by sales | recharts |
| Creator Revenue Share | Pie Chart | Revenue distribution | recharts |
| Download Metrics | Line Chart | Downloads per day | recharts |

### Dashboard Layout (Responsive Grid)

```
Mobile (1 column):
[Stat Card 1]
[Stat Card 2]
[Stat Card 3]
[Stat Card 4]
[Revenue Chart]
[User Growth Chart]
[Top Products Table]
[Activity Feed]

Tablet (2 columns):
[Stat Card 1][Stat Card 2]
[Stat Card 3][Stat Card 4]
[Revenue Chart        ][User Growth Chart]
[Top Products Table           ]
[Activity Feed                ]

Desktop (4+ columns):
[Stat 1][Stat 2][Stat 3][Stat 4]
[Revenue Chart        ][User Growth Chart]
[Top 10 Products Table][Activity Feed    ]
```

---

## Part 8: Security Considerations

### Admin Access Control Checklist

- [x] Admin role only in JWT (enforced in getCurrentUser)
- [x] All admin routes check admin role
- [x] All admin actions logged to AuditLog
- [x] API responses don't leak sensitive data (passwordHash excluded)
- [x] Admin actions include IP address for forensics
- [x] Rate limiting applied to admin endpoints (prevent abuse)
- [x] CORS headers proper for admin domain
- [x] CSRF protection for state-changing endpoints
- [ ] OAuth/2FA for admin accounts (future)
- [ ] Admin action notifications (email alerts) (future)
- [ ] API key management (future)

### Audit Logging for Admin Actions

All admin operations must be logged with:
```
{
  userId: admin_id,
  action: 'ADMIN_ACTION' (or specific action),
  entityType: 'user|product|order|etc',
  entityId: affected_entity_id,
  changes: JSON string of before/after,
  metadata: JSON string with reason, impact,
  ipAddress: admin_ip,
  userAgent: admin_browser
}
```

This creates an immutable audit trail of all admin decisions.

---

## Part 9: Scalability Considerations

### Performance Optimizations for Large Datasets

**Problem**: As platform grows, audit logs and order lists become slow

**Solutions**:
1. **Database Indexing** (already done):
   - AuditLog has indexes on: userId, action, entityType, createdAt
   - Order has indexes on: userId, status, createdAt
   - These enable fast filtered queries

2. **Pagination**:
   - All tables use skip/take with pageSize (default 20)
   - Prevents loading 10,000+ rows at once

3. **Query Optimization**:
   - Use Prisma `select` to fetch only needed columns
   - Use `include` carefully (avoid N+1 queries)
   - Pre-aggregate stats (vs calculating on-the-fly)

4. **Caching** (future):
   - Cache dashboard stats (refresh hourly)
   - Use Redis for quick metric lookups
   - Invalidate on critical events (order, new user)

5. **Background Jobs** (future):
   - Generate monthly reports asynchronously
   - Pre-calculate trending products
   - Cleanup old access logs

### Current Limitations & Roadmap

| Issue | Current | Solution | Timeline |
|-------|---------|----------|----------|
| Real-time metrics | Query-time calculation | Cache with 1hr TTL | Phase 2 |
| Large audit logs (1M+) | Full table scan possible | Index optimization, archival | Phase 3 |
| Download insights | AccessLog per download | Aggregated daily stats | Phase 3 |
| Creator analytics | None | Per-creator dashboard | Phase 2 |
| Geographic data | Not captured | Add to Order metadata | Phase 2 |

---

## Part 10: Testing Strategy

### Manual Testing Checklist

**Admin Authentication:**
- [ ] Non-admin user cannot access /admin routes (redirects to home)
- [ ] Admin user can access /admin dashboard
- [ ] Logout clears admin session

**User Management:**
- [ ] Search finds users by name/email
- [ ] Filters by role work (ADMIN, CREATOR, BUYER)
- [ ] Suspend user prevents login
- [ ] Unsuspend user re-enables login
- [ ] Audit log shows suspension event

**Product Moderation:**
- [ ] Product list shows all products with correct statuses
- [ ] Suspend product hides from marketplace
- [ ] Suspended product still visible to existing buyers
- [ ] Unsuspend product restores visibility
- [ ] Creator cannot see suspended product in dashboard

**Transactions:**
- [ ] Order list shows correct payment amounts
- [ ] Refund processes through Stripe API
- [ ] Refund updates Order status in database
- [ ] Buyer receives refund notification
- [ ] Creator's revenue decreases by refund amount

**Audit Trail:**
- [ ] All admin actions appear in audit log
- [ ] Audit log shows user, action, timestamp, IP
- [ ] Can filter audit log by action type
- [ ] JSON details show before/after changes

### Automated Testing (Later)

```typescript
// Example test structure
describe('Admin Users API', () => {
  it('GET /api/admin/users requires admin role', async () => {
    const response = await fetch('/api/admin/users', {
      headers: { Cookie: 'auth_token=buyer_token' }
    });
    expect(response.status).toBe(403);
  });

  it('POST /api/admin/users/[id]/suspend creates audit log', async () => {
    const response = await fetch('/api/admin/users/user123/suspend', {
      method: 'POST',
      headers: { Cookie: 'auth_token=admin_token' }
    });
    expect(response.status).toBe(200);
    
    const auditLog = await db.auditLog.findFirst({
      where: { entityId: 'user123' }
    });
    expect(auditLog?.action).toBe('ADMIN_ACTION');
  });
});
```

---

## Part 11: Success Metrics

### KPIs to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Mean Time to Suspend Abusive User | < 5 min | Manual timer in support |
| Product Moderation Throughput | > 50/day | /admin/products page load |
| Refund Processing Time | < 2 hours | Order detail page |
| Audit Log Searchability | < 1 sec for recent | /admin/audit response time |
| Admin Dashboard Load Time | < 2 sec | Browser dev tools |
| Platform Revenue Visibility | Real-time | Dashboard accuracy vs Stripe |

### Health Checks

```
Weekly admin checklist:
- [ ] Dashboard loads without errors
- [ ] Recent orders visible in transaction list
- [ ] Audit log shows expected entries
- [ ] User suspension works
- [ ] Product suspension works
- [ ] Revenue numbers match Stripe reports
```

---

## Part 12: Migration Guide

### Creating Admin Account

```sql
-- Assumes user exists with id 'user_123'
INSERT INTO "UserRole" (id, "userId", role, "createdAt")
VALUES (uuid(), 'user_123', 'ADMIN', now());
```

### Enabling Features Progressively

1. **Week 1**: Deploy dashboard (read-only)
2. **Week 2**: Enable user suspension
3. **Week 3**: Enable product suspension
4. **Week 4**: Enable refund processing
5. **Week 5**: Enable analytics
6. **Week 6**: Enable settings configuration

This allows validation at each stage before adding more power to admin panel.

---

## Part 13: Deployment Checklist

### Pre-Launch

- [ ] Admin routes protected with role checks
- [ ] All admin actions logged to AuditLog
- [ ] Error handling covers edge cases
- [ ] Rate limiting set on admin endpoints (prevent accidental DOS)
- [ ] Performance tested with realistic data volume
- [ ] Security audit completed
- [ ] Admin user(s) created and tested
- [ ] Backup strategy verified
- [ ] Monitoring/alerting set up for admin API

### Launch Steps

1. Create admin account for platform lead
2. Deploy Phase 1 code
3. Test in production environment
4. Grant admin role to appropriate users
5. Monitor audit logs for issues
6. Gather admin feedback
7. Plan Phase 2 based on actual usage

### Post-Launch Monitoring

```
Daily:
- Check admin API error rates
- Verify audit logs are being written
- Monitor response times

Weekly:
- Review admin actions for patterns
- Check for any failed operations
- Gather user feedback

Monthly:
- Analyze admin usage patterns
- Plan next phase features
- Performance review
```

---

## Appendix A: Component Examples

### Admin Stats Card

```typescript
// components/admin/StatsCard.tsx
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number; // percentage change
  unit?: string;
}

export function StatsCard({ title, value, icon: Icon, trend, unit }: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && (
          <p className={`text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend > 0 ? '+' : ''}{trend}% from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

### Admin Table with Actions

```typescript
// components/admin/AdminTable.tsx
interface AdminTableProps {
  columns: { key: string; label: string; render?: (value: any) => React.ReactNode }[];
  data: any[];
  actions?: { label: string; onClick: (row: any) => void }[];
  loading?: boolean;
}

export function AdminTable({ columns, data, actions, loading }: AdminTableProps) {
  return (
    <div className="border rounded-lg">
      <table className="w-full">
        <thead className="border-b bg-muted">
          <tr>
            {columns.map(col => (
              <th key={col.key} className="text-left p-4 font-semibold">
                {col.label}
              </th>
            ))}
            {actions && <th className="p-4">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-b hover:bg-muted/50">
              {columns.map(col => (
                <td key={col.key} className="p-4">
                  {col.render ? col.render(row[col.key]) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      {actions.map(action => (
                        <DropdownMenuItem
                          key={action.label}
                          onClick={() => action.onClick(row)}
                        >
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Filter Component

```typescript
// components/admin/AdminFilters.tsx
interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'date' | 'search';
  options?: { value: string; label: string }[];
}

export function AdminFilters({
  config,
  onFilterChange,
}: {
  config: FilterConfig[];
  onFilterChange: (filters: Record<string, any>) => void;
}) {
  const [filters, setFilters] = useState<Record<string, any>>({});

  const handleChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="flex gap-4 flex-wrap mb-6">
      {config.map(field => (
        <div key={field.key} className="flex flex-col gap-2">
          <label className="text-sm font-medium">{field.label}</label>
          {field.type === 'select' && (
            <Select onValueChange={v => handleChange(field.key, v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={`Select ${field.label}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {field.type === 'search' && (
            <Input
              type="search"
              placeholder={`Search by ${field.label}`}
              onChange={e => handleChange(field.key, e.target.value)}
            />
          )}
          {field.type === 'date' && (
            <Input
              type="date"
              onChange={e => handleChange(field.key, e.target.value)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## Appendix B: API Response Examples

### GET /api/admin/dashboard

```json
{
  "totalUsers": 1250,
  "totalCreators": 87,
  "platformRevenue": 15240.50,
  "ordersThisMonth": 342,
  "newUsersThisMonth": 156,
  "newProductsThisMonth": 23,
  "pendingRefunds": 5,
  "suspendedProducts": 2,
  "revenue_trend": [
    { "month": "Jan 2024", "revenue": 8500 },
    { "month": "Feb 2024", "revenue": 11200 },
    { "month": "Mar 2024", "revenue": 15240.50 }
  ]
}
```

### GET /api/admin/users?page=1&role=CREATOR&search=john

```json
{
  "users": [
    {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "roles": ["CREATOR"],
      "createdAt": "2024-01-15",
      "lastLogin": "2024-02-01",
      "productCount": 5,
      "totalRevenue": 2500
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 87,
    "totalPages": 5
  }
}
```

### GET /api/admin/products?status=PUBLISHED&category=CHRISTMAS

```json
{
  "products": [
    {
      "id": "prod_456",
      "slug": "christmas-sequence-2024",
      "title": "Christmas Sequence 2024",
      "creator": { "name": "John Doe", "email": "john@example.com" },
      "status": "PUBLISHED",
      "category": "CHRISTMAS",
      "saleCount": 45,
      "viewCount": 1200,
      "price": 29.99,
      "createdAt": "2024-01-01"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 245 }
}
```

### GET /api/admin/audit/logs?action=ADMIN_ACTION&limit=50

```json
{
  "logs": [
    {
      "id": "log_789",
      "userId": "admin_001",
      "action": "ADMIN_ACTION",
      "entityType": "user",
      "entityId": "user_123",
      "changes": {
        "from": { "status": "active" },
        "to": { "status": "suspended" }
      },
      "metadata": {
        "reason": "ToS violation - spam",
        "notified": true
      },
      "ipAddress": "192.168.1.1",
      "createdAt": "2024-02-01T10:30:00Z"
    }
  ],
  "total": 156,
  "page": 1
}
```

---

## Appendix C: Glossary

| Term | Definition |
|------|-----------|
| **Admin** | User with ADMIN role who can manage platform |
| **Moderation** | Process of reviewing/approving content |
| **Audit Log** | Immutable record of all platform actions |
| **Suspension** | Temporary or permanent account/product deactivation |
| **Entitlement** | User's right to download a product (one per purchase) |
| **Platform Fee** | SequenceHUB's revenue (10% of each transaction) |
| **Creator Payout** | Payment of earnings to creator's Stripe account |
| **Metadata** | Product attributes (version, category, xLights version) |

---

## Appendix D: Useful SQL Queries for Admins

```sql
-- Platform revenue this month
SELECT SUM(total_amount) * 0.1 as platform_fee
FROM "Order"
WHERE status = 'COMPLETED'
AND MONTH("createdAt") = MONTH(CURRENT_DATE());

-- Top 10 creators by revenue
SELECT u.id, u.name, SUM(o.total_amount) as total_revenue
FROM "User" u
JOIN "Product" p ON u.id = p."creatorId"
JOIN "OrderItem" oi ON p.id = oi."productId"
JOIN "Order" o ON oi."orderId" = o.id
WHERE o.status = 'COMPLETED'
GROUP BY u.id
ORDER BY total_revenue DESC
LIMIT 10;

-- Products not yet purchased
SELECT id, slug, title, "createdAt"
FROM "Product"
WHERE "saleCount" = 0
AND status = 'PUBLISHED'
ORDER BY "createdAt" DESC;

-- Users with no purchases (potential churned users)
SELECT u.id, u.name, u.email, u."createdAt", COUNT(o.id) as order_count
FROM "User" u
LEFT JOIN "Order" o ON u.id = o."userId"
GROUP BY u.id
HAVING COUNT(o.id) = 0
ORDER BY u."createdAt" DESC;
```

---

## Summary

This comprehensive admin panel plan provides SequenceHUB with:

1. **Immediate Value** (Phase 1 - 2 weeks):
   - Dashboard with key metrics
   - User management and suspension
   - Product moderation
   - Transaction oversight
   - Audit log viewer

2. **Enhanced Capabilities** (Phase 2 - 2 weeks):
   - Advanced analytics
   - Content management
   - Financial controls
   - Communication tools
   - Platform configuration

3. **Future Roadmap** (Phase 3):
   - ML-based moderation
   - Fraud detection
   - Advanced BI dashboards
   - Custom admin roles

4. **Security First**:
   - Role-based access control
   - Complete audit trails
   - IP tracking for forensics
   - No sensitive data exposure

5. **Built on Existing Infrastructure**:
   - Leverages AuditLog model (20+ event types)
   - Uses ProductStatus.SUSPENDED (already in schema)
   - Extends CreatorAccount for financial controls
   - Integrates with existing Stripe Connect

The admin panel transforms SequenceHUB from a blind marketplace into a professionally managed platform where administrators can respond to violations, understand business metrics, and maintain healthy ecosystem health.

**Estimated Total Effort**: 8 weeks for all phases, with Phase 1 MVP deliverable in 2 weeks.
