import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { deleteFile } from '@/lib/storage';

export async function DELETE(
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

    const media = await db.productMedia.findUnique({
      where: { id: params.id },
      select: { id: true, storageKey: true, productId: true },
    });

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    await db.productMedia.delete({ where: { id: params.id } });

    try {
      await deleteFile(media.storageKey, 'PREVIEW');
    } catch (error) {
      console.warn('Failed to delete media file:', error);
    }

    await db.auditLog.create({
      data: {
        userId: currentUser.id,
        action: 'ADMIN_ACTION',
        entityType: 'product_media',
        entityId: media.id,
        metadata: {
          action: 'media_deleted',
          productId: media.productId,
          actorId: currentUser.id,
        },
        ipAddress: request.headers.get('x-forwarded-for') ?? undefined,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Admin media delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
