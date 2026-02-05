import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const order = body?.order as { id: string; displayOrder: number }[] | undefined;

    if (!order || !Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ error: 'Missing order payload' }, { status: 400 });
    }

    const mediaIds = order.map((item) => item.id);

    const mediaCount = await db.productMedia.count({
      where: { id: { in: mediaIds }, productId: params.id },
    });

    if (mediaCount !== order.length) {
      return NextResponse.json(
        { error: 'One or more media items do not belong to this product' },
        { status: 400 }
      );
    }

    await db.$transaction(
      order.map((item) =>
        db.productMedia.update({
          where: { id: item.id },
          data: { displayOrder: item.displayOrder },
        })
      )
    );

    await db.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'ADMIN_ACTION',
        entityType: 'product_media',
        entityId: params.id,
        metadata: {
          action: 'media_reordered',
          count: order.length,
          actorId: currentUser.id,
        },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Admin media order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
