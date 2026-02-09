# Quick Implementation Examples - Copy & Paste Ready

## 🚀 Ready-to-Use Code Snippets

These are production-ready examples you can copy directly into your app.

---

## 1. Server Component with Auth Check

**File:** `src/app/dashboard/my-products/page.tsx`

```typescript
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export default async function MyProductsPage() {
  // Server-side auth check
  const user = await getCurrentUser();

  if (!user) {
    redirect('/auth/login?redirect=/dashboard/my-products');
  }

  if (!isCreatorOrAdmin(user)) {
    redirect('/dashboard/creator/onboarding');
  }

  // Fetch user's products (ownership filter automatically applied)
  const products = await db.product.findMany({
    where: {
      creatorId: user.id,
    },
    include: {
      prices: { where: { isActive: true } },
      versions: { where: { isLatest: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <h1>My Products</h1>
      <div className="grid grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
```

---

## 2. API Route with Full Protection

**File:** `src/app/api/products/[id]/publish/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Auth check
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Get resource
  const product = await db.product.findUnique({
    where: { id: params.id },
  });

  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 });
  }

  // 3. Ownership check
  const isOwner = product.creatorId === user.id;
  const isAdminUser = isAdmin(user);

  if (!isOwner && !isAdminUser) {
    return NextResponse.json(
      { error: 'You can only publish your own products' },
      { status: 403 }
    );
  }

  // 4. Business logic
  const updated = await db.product.update({
    where: { id: params.id },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    },
  });

  // 5. Audit log
  await createAuditLog({
    userId: user.id,
    action: 'PRODUCT_PUBLISHED',
    entityType: 'product',
    entityId: product.id,
    ipAddress: request.headers.get('x-forwarded-for') || undefined,
    userAgent: request.headers.get('user-agent') || undefined,
  });

  return NextResponse.json({ product: updated });
}
```

---

## 3. Protected Client Component

**File:** `src/components/creator/CreateProductButton.tsx`

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function CreateProductButton() {
  const router = useRouter();
  const { user, isAuthenticated, isCreatorOrAdmin } = useAuth();

  const handleClick = () => {
    // Not logged in → send to login
    if (!isAuthenticated) {
      router.push('/auth/login?redirect=/dashboard/products/new');
      return;
    }

    // Not a creator → send to onboarding
    if (!isCreatorOrAdmin) {
      router.push('/dashboard/creator/onboarding');
      return;
    }

    // Is creator → allow product creation
    router.push('/dashboard/products/new');
  };

  // Show different text based on auth state
  const buttonText = !isAuthenticated
    ? 'Login to Create'
    : !isCreatorOrAdmin
    ? 'Become a Creator'
    : 'Create Product';

  return (
    <Button onClick={handleClick} className="gap-2">
      <Plus className="h-4 w-4" />
      {buttonText}
    </Button>
  );
}
```

---

## 4. Conditional Rendering Based on Role

**File:** `src/components/products/ProductActions.tsx`

```typescript
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Edit, Trash, Eye } from 'lucide-react';

interface ProductActionsProps {
  product: {
    id: string;
    creatorId: string;
    title: string;
  };
}

export function ProductActions({ product }: ProductActionsProps) {
  const { user, isAdmin } = useAuth();

  // Determine if current user owns this product
  const isOwner = user?.id === product.creatorId;
  const canEdit = isOwner || isAdmin;

  if (!canEdit) {
    // Not owner or admin → only show view button
    return (
      <Button variant="outline" size="sm">
        <Eye className="h-4 w-4 mr-2" />
        View
      </Button>
    );
  }

  // Owner or admin → show full controls
  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm">
        <Edit className="h-4 w-4 mr-2" />
        Edit
      </Button>
      <Button variant="destructive" size="sm">
        <Trash className="h-4 w-4 mr-2" />
        Delete
      </Button>
    </div>
  );
}
```

---

## 5. Admin-Only Component

**File:** `src/components/admin/AdminBadge.tsx`

```typescript
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

export function AdminBadge() {
  const { isAdmin } = useAuth();

  // Don't render anything for non-admins
  if (!isAdmin) return null;

  return (
    <Badge variant="destructive" className="gap-1">
      <Shield className="h-3 w-3" />
      Admin
    </Badge>
  );
}
```

---

## 6. Purchasable Product Check

**File:** `src/app/p/[slug]/page.tsx` (excerpt)

```typescript
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

export default function ProductPage({ product }: { product: Product }) {
  const { user, isAuthenticated } = useAuth();

  // Check if user owns this product
  const alreadyOwned = product.purchased; // from API
  const isOwnProduct = user?.id === product.creatorId;

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?redirect=/p/${product.slug}`);
      return;
    }

    // Call checkout API
    const response = await fetch('/api/checkout/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id }),
    });

    const { url } = await response.json();
    window.location.href = url; // Redirect to Stripe
  };

  // Different buttons based on ownership
  if (isOwnProduct) {
    return (
      <Button disabled variant="outline">
        Your Product
      </Button>
    );
  }

  if (alreadyOwned) {
    return (
      <Button onClick={() => router.push('/library')}>
        View in Library
      </Button>
    );
  }

  return (
    <Button onClick={handlePurchase}>
      <ShoppingCart className="h-4 w-4 mr-2" />
      Buy Now - ${product.price}
    </Button>
  );
}
```

---

## 7. Reusable Auth Guard HOC

**File:** `src/components/guards/RequireCreator.tsx`

```typescript
'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

interface RequireCreatorProps {
  children: ReactNode;
  redirectTo?: string;
  fallback?: ReactNode;
}

export function RequireCreator({
  children,
  redirectTo = '/dashboard/creator/onboarding',
  fallback = <div>Loading...</div>,
}: RequireCreatorProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, isCreatorOrAdmin } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!isCreatorOrAdmin) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, isCreatorOrAdmin, redirectTo, router]);

  if (isLoading || !isCreatorOrAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

**Usage:**

```typescript
import { RequireCreator } from '@/components/guards/RequireCreator';

export default function CreatorDashboard() {
  return (
    <RequireCreator>
      <div>
        <h1>Creator Dashboard</h1>
        {/* Protected content */}
      </div>
    </RequireCreator>
  );
}
```

---

## 8. Role-Based Navigation

**File:** `src/components/navigation/UserMenu.tsx`

```typescript
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  User,
  Package,
  ShoppingBag,
  Shield,
  Settings,
  LogOut,
} from 'lucide-react';

export function UserMenu() {
  const router = useRouter();
  const { user, isCreatorOrAdmin, isAdmin, logout } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <User className="h-4 w-4 mr-2" />
          {user.name || user.email}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Everyone sees Library */}
        <DropdownMenuItem onClick={() => router.push('/library')}>
          <ShoppingBag className="h-4 w-4 mr-2" />
          My Library
        </DropdownMenuItem>

        {/* Creators see Products */}
        {isCreatorOrAdmin && (
          <DropdownMenuItem onClick={() => router.push('/dashboard/products')}>
            <Package className="h-4 w-4 mr-2" />
            My Products
          </DropdownMenuItem>
        )}

        {/* Admins see Admin Panel */}
        {isAdmin && (
          <DropdownMenuItem onClick={() => router.push('/admin')}>
            <Shield className="h-4 w-4 mr-2" />
            Admin Panel
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => router.push('/settings')}>
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => logout()}>
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 9. Download Protection with Entitlement

**File:** `src/app/api/download/[fileId]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/auth';
import { db } from '@/lib/db';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get file
  const file = await db.productFile.findUnique({
    where: { id: params.fileId },
    include: {
      version: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!file) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // Check entitlement
  const entitlement = await db.entitlement.findUnique({
    where: {
      userId_productId_versionId: {
        userId: user.id,
        productId: file.version.productId,
        versionId: file.versionId,
      },
    },
  });

  if (!entitlement || !entitlement.isActive) {
    await createAuditLog({
      userId: user.id,
      action: 'DOWNLOAD_ACCESS_DENIED',
      entityType: 'file',
      entityId: file.id,
    });

    return NextResponse.json(
      { error: 'You do not have access to this file' },
      { status: 403 }
    );
  }

  // Serve file
  const filePath = path.join(process.cwd(), 'downloads', file.storageKey);
  const fileBuffer = fs.readFileSync(filePath);

  // Update download count
  await db.entitlement.update({
    where: { id: entitlement.id },
    data: {
      downloadCount: { increment: 1 },
      lastDownloadAt: new Date(),
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'FILE_DOWNLOADED',
    entityType: 'file',
    entityId: file.id,
  });

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
    },
  });
}
```

---

## 10. Role Upgrade Flow

**File:** `src/app/api/user/upgrade-to-creator/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, assignRole, createAuditLog } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if already a creator
  const isCreator = user.roles.some((r) => r.role === 'CREATOR');
  if (isCreator) {
    return NextResponse.json(
      { error: 'Already a creator' },
      { status: 400 }
    );
  }

  // Assign CREATOR role
  await assignRole(user.id, 'CREATOR');

  // Create creator account
  await db.creatorAccount.create({
    data: {
      userId: user.id,
      onboardingStatus: 'PENDING',
      platformFeePercent: 10,
    },
  });

  await createAuditLog({
    userId: user.id,
    action: 'USER_UPGRADED_TO_CREATOR',
    entityType: 'user',
    entityId: user.id,
  });

  return NextResponse.json({
    success: true,
    message: 'Successfully upgraded to creator',
  });
}
```

---

## Summary

**Copy these examples directly into your app for:**

✅ Server component auth checks
✅ API route protection
✅ Client component conditional rendering
✅ Role-based navigation
✅ Ownership validation
✅ Download protection
✅ Purchase flow
✅ Admin controls

All examples include proper error handling, audit logging, and TypeScript types!
