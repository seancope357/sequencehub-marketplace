import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';

const VALID_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED', 'SUSPENDED']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isAdmin(currentUser)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const status = body?.status as string | undefined;
    if (!status || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const product = await db.product.findUnique({
      where: { id: params.productId },
      select: { id: true, status: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const updated = await db.product.update({
      where: { id: params.productId },
      data: { status },
    });

    await db.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'ADMIN_ACTION',
        entityType: 'product',
        entityId: params.productId,
        changes: {
          status: { from: product.status, to: updated.status },
        },
        metadata: {
          action: 'status_change',
          actorId: currentUser.id,
        },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ success: true, status: updated.status }, { status: 200 });
  } catch (error) {
    console.error('Admin product status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
