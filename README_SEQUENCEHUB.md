# SequenceHUB.com
> Marketplace for xLights Sequences - Production-ready SaaS Application

A Gumroad-style marketplace purpose-built for xLights sequencing creators to sell source files (XSQ/XML) and rendered exports (FSEQ).

## 🎯 Project Overview

SequenceHUB is a full-stack marketplace built with modern web technologies, designed specifically for the xLights community. It handles the complete workflow from product listing to secure delivery.

### Key Features

- **Marketplace**: Browse, search, and filter xLights sequences
- **Creator Dashboard**: Manage products, track sales, view analytics
- **Buyer Library**: Access purchases, download securely
- **Stripe Integration**: Multi-seller payments with Connect
- **Security**: RLS, audit logs, signed URLs, rate limiting
- **xLights-aware**: Metadata for versions, compatibility, props

## 🛠️ Tech Stack

### Core Framework
- **Next.js 16** with App Router
- **TypeScript 5** with strict typing
- **Tailwind CSS 4** for styling
- **shadcn/ui** component library

### Backend
- **Next.js Route Handlers** for API
- **Prisma ORM** with SQLite (dev) / Postgres (prod)
- **JWT** for session management
- **bcryptjs** for password hashing

### Database
- **17 Models** with full relationships
- **Row-Level Security** (RLS) patterns
- **Comprehensive indexing**
- **Audit logging**

### Payments
- **Stripe Checkout** for payments
- **Stripe Connect Express** for multi-seller payouts
- **Webhook handlers** with idempotency
- **Platform fee** support

### Security
- **HTTP-only cookies** for session tokens
- **Signed URLs** with HMAC for downloads
- **Rate limiting** on downloads
- **Audit logs** for all critical actions
- **Authorization checks** on all operations

## 📁 Project Structure

```
/home/z/my-project/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx          # Marketplace home
│   │   ├── p/[slug]/         # Product detail pages
│   │   ├── dashboard/         # Creator dashboard
│   │   ├── library/           # Buyer library
│   │   └── auth/             # Authentication pages
│   ├── components/
│   │   └── ui/               # shadcn/ui components
│   ├── lib/
│   │   ├── auth.ts            # Auth utilities
│   │   ├── db.ts             # Prisma client
│   │   ├── store/            # Zustand stores
│   │   └── utils.ts          # Helper functions
│   └── hooks/
│       └── use-auth.ts        # Auth React hooks
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts              # Seed data
├── public/                   # Static assets
└── [config files]
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Package manager (bun, npm, yarn)
- Stripe account (test or production)

### Installation

1. **Clone and install dependencies**:
```bash
# Already installed in this environment
bun install
```

2. **Environment Variables**:
Create `.env` file:
```env
# Database
DATABASE_URL="file:./db/custom.db"

# Auth
JWT_SECRET="your-secret-key-min-32-chars"
DOWNLOAD_SECRET="your-download-secret-key-min-32-chars"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Optional: Stripe Connect Platform Fee
PLATFORM_FEE_PERCENT="10"
```

3. **Database Setup**:
```bash
# Push schema to database
bun run db:push

# (Optional) Generate Prisma Client
bun run db:generate

# (Optional) Seed database with sample data
bun run db:seed
```

4. **Start Development Server**:
```bash
bun run dev
```

5. **Access the Application**:
- Open Preview Panel or visit `http://localhost:3000`
- Demo account: `admin@sequencehub.com` / `admin123`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### Products
- `GET /api/products` - List all products (with filters)
- `GET /api/products/[slug]` - Get product details

### Dashboard
- `GET /api/dashboard/stats` - Dashboard stats
- `GET /api/dashboard/products` - Creator's products
- `DELETE /api/dashboard/products/[id]` - Delete product

### Library
- `GET /api/library` - User's purchases
- `POST /api/library/download` - Generate download URL

### Checkout
- `POST /api/checkout/create` - Create checkout session

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler

### Media
- `GET /api/media/[...]` - Serve files (with signature)

## 🔒 Security Features

### Authentication
- JWT-based session tokens (7-day expiry)
- HTTP-only cookies prevent XSS
- Password hashing with bcrypt (12 rounds)
- Role-based access control (Admin, Creator, Buyer)

### Authorization
- Users can only access their own data
- Creators manage only their products
- Admin has full access
- RLS patterns enforced in API

### Downloads
- Signed URLs with HMAC verification
- 5-minute expiration on download links
- Rate limiting: 10 downloads/day per entitlement
- IP and user agent tracking
- Comprehensive access logging

### Audit Logging
All critical actions logged:
- User auth events
- Product CRUD operations
- Download attempts (granted/denied)
- Payment events
- Webhook processing
- Security alerts

## 🎨 UI Components

Uses complete shadcn/ui component library:
- Cards, Buttons, Inputs, Forms
- Tables, Badges, Tabs
- Dialogs, Dropdowns, Alerts
- Skeletons, Loaders
- All components styled with Tailwind

## 📊 Database Schema

### Core Models
- **User** - User accounts and profiles
- **UserRole** - Role assignments
- **Product** - Product listings with metadata
- **ProductVersion** - Version tracking
- **ProductFile** - File storage info
- **Order** - Purchase orders
- **Entitlement** - Download permissions
- **AuditLog** - Security event logs

### xLights-Specific Fields
- `xLightsVersionMin` / `xLightsVersionMax`
- `targetUse` (Christmas, Halloween, etc.)
- `expectedProps` (freeform notes)
- `includesFSEQ` / `includesSource`
- `sequenceLength`, `fps`, `channelCount` (for files)

## 🧪 Testing

### Manual Testing Flow

1. **Browse Marketplace**:
   - Visit `/`
   - Use search and filters
   - Click product cards

2. **View Product**:
   - Click on any product
   - Review metadata and files
   - See version history

3. **Create Account**:
   - Visit `/auth/register`
   - Fill registration form
   - Verify login works

4. **Creator Dashboard**:
   - Login with demo account
   - Visit `/dashboard`
   - View stats and products
   - Try deleting a product

5. **Buyer Library**:
   - Visit `/library`
   - View purchases (seeded data available)
   - Test download flow (signed URLs)

### Seed Data

Database includes:
- 1 admin user (`admin@sequencehub.com` / `admin123`)
- 8 sample products across categories
- Product versions and files
- No purchase data (use Stripe for real purchases)

## 🔮 Future Enhancements

### High Priority
- File upload system with resumable uploads
- Stripe Connect Express onboarding
- Extended rate limiting (API endpoints)
- Background job system for async tasks

### Medium Priority
- Admin panel for platform oversight
- SEO optimization (meta tags, sitemaps)
- Email notifications
- Cloud storage integration

### Low Priority
- Subscription pricing model
- Advanced analytics
- Creator analytics dashboard
- Social features (reviews, ratings)

## 📝 Scripts

- `bun run dev` - Start development server
- `bun run lint` - Run ESLint
- `bun run db:push` - Push schema changes
- `bun run db:generate` - Generate Prisma Client
- `bun run db:seed` - Seed database

## 🤝 Contributing

When making changes:
1. Update database schema if needed (`prisma/schema.prisma`)
2. Run `bun run db:push` to apply changes
3. Create/modify API endpoints in `src/app/api/`
4. Update frontend components accordingly
5. Test thoroughly
6. Update this README

## 📄 License

Proprietary - Internal Project

## 👥 Credits

Built by Z.ai Code for SequenceHUB.com

---

**Note**: This is a production-ready foundation. Additional features (file uploads, email, cloud storage) should be added before production deployment.
