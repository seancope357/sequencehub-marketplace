import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { deleteFile } from '@/lib/storage';
import { createAuditLog } from '@/lib/supabase/auth';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isCreatorOrAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Creator role required' },
        { status: 403 }
      );
    }

    // Apply rate limiting: 20 deletions per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.DELETE_FILE,
      byUser: true,
      byIp: false,
      message: 'Too many deletion requests. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const { id } = params;

    // Check if product belongs to user
    const product = await db.product.findUnique({
      where: { id },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    if (product.creatorId !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Fetch storage keys to clean up before delete
    const productMedia = await db.productMedia.findMany({
      where: { productId: id },
      select: { storageKey: true },
    });

    const productFiles = await db.productFile.findMany({
      where: { version: { productId: id } },
      select: { storageKey: true, fileType: true },
    });

    // Delete product (cascade will handle related records)
    await db.product.delete({
      where: { id },
    });

    // Clean up storage objects (best effort)
    for (const media of productMedia) {
      try {
        await deleteFile(media.storageKey, 'PREVIEW');
      } catch (cleanupError) {
        console.warn('Failed to delete media file:', cleanupError);
      }
    }

    for (const file of productFiles) {
      try {
        await deleteFile(file.storageKey, file.fileType);
      } catch (cleanupError) {
        console.warn('Failed to delete product file:', cleanupError);
      }
    }

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'PRODUCT_DELETED',
      entityType: 'product',
      entityId: product.id,
      changes: JSON.stringify({ title: product.title }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      { message: 'Product deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
