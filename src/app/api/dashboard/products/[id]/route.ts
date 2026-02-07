import { NextRequest, NextResponse } from 'next/server';
import { LicenseType, ProductCategory, ProductStatus } from '@prisma/client';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/supabase/auth';
import { isCreatorOrAdmin, isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { deleteFile } from '@/lib/storage';
import { createAuditLog } from '@/lib/supabase/auth';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { getStripeConfigStatus } from '@/lib/stripe-connect';
import {
  badRequestError,
  conflictError,
  forbiddenError,
  internalServerError,
  notFoundError,
  unauthorizedError,
} from '@/lib/api/errors';

const updateProductSchema = z
  .object({
    title: z.string().min(1).max(140).optional(),
    description: z.string().min(1).max(10000).optional(),
    category: z.nativeEnum(ProductCategory).optional(),
    status: z.nativeEnum(ProductStatus).optional(),
    price: z.coerce.number().min(0).optional(),
    xLightsVersionMin: z.string().max(64).nullable().optional(),
    xLightsVersionMax: z.string().max(64).nullable().optional(),
    targetUse: z.string().max(5000).nullable().optional(),
    expectedProps: z.string().max(5000).nullable().optional(),
    includesFSEQ: z.boolean().optional(),
    includesSource: z.boolean().optional(),
    licenseType: z.nativeEnum(LicenseType).optional(),
    seatCount: z.coerce.number().int().positive().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

async function getAuthorizedProduct(productId: string, userId: string) {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      prices: {
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      media: {
        orderBy: { displayOrder: 'asc' },
      },
      versions: {
        where: { isLatest: true },
        include: {
          files: true,
        },
      },
    },
  });

  if (!product) {
    return { error: notFoundError('Product not found') as NextResponse, product: null };
  }

  if (product.creatorId !== userId) {
    return { error: forbiddenError('Forbidden') as NextResponse, product: null };
  }

  return { error: null, product };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedError();
    }

    if (!isCreatorOrAdmin(user)) {
      return forbiddenError('Creator role required');
    }

    const { error, product } = await getAuthorizedProduct(params.id, user.id);
    if (error || !product) {
      return error;
    }

    return NextResponse.json({
      product: {
        id: product.id,
        slug: product.slug,
        title: product.title,
        description: product.description,
        category: product.category,
        status: product.status,
        licenseType: product.licenseType,
        seatCount: product.seatCount,
        xLightsVersionMin: product.xLightsVersionMin,
        xLightsVersionMax: product.xLightsVersionMax,
        targetUse: product.targetUse,
        expectedProps: product.expectedProps,
        includesFSEQ: product.includesFSEQ,
        includesSource: product.includesSource,
        price: product.prices[0]?.amount ?? 0,
        media: product.media,
        versions: product.versions,
      },
    });
  } catch (error) {
    console.error('Error loading dashboard product:', error);
    return internalServerError();
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedError();
    }

    if (!isCreatorOrAdmin(user)) {
      return forbiddenError('Creator role required');
    }

    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.PRODUCT_UPDATE,
      byUser: true,
      byIp: false,
      message: 'Too many update requests. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const payload = await request.json();
    const parsed = updateProductSchema.safeParse(payload);

    if (!parsed.success) {
      return badRequestError('Invalid product update payload', parsed.error.issues);
    }

    const { error, product } = await getAuthorizedProduct(params.id, user.id);
    if (error || !product) {
      return error;
    }

    if (parsed.data.status === 'PUBLISHED' && !isAdmin(user)) {
      const stripeConfig = getStripeConfigStatus();
      if (!stripeConfig.configured) {
        return conflictError(stripeConfig.message || 'Stripe Connect is not configured.');
      }

      const creatorAccount = await db.creatorAccount.findUnique({
        where: { userId: user.id },
        select: { stripeAccountId: true, onboardingStatus: true },
      });

      if (!creatorAccount?.stripeAccountId || creatorAccount.onboardingStatus !== 'COMPLETED') {
        return conflictError('Stripe Connect onboarding is required before publishing products.');
      }
    }

    const data = parsed.data;

    const updatedProduct = await db.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: params.id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.category !== undefined ? { category: data.category } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.xLightsVersionMin !== undefined
            ? { xLightsVersionMin: data.xLightsVersionMin }
            : {}),
          ...(data.xLightsVersionMax !== undefined
            ? { xLightsVersionMax: data.xLightsVersionMax }
            : {}),
          ...(data.targetUse !== undefined ? { targetUse: data.targetUse } : {}),
          ...(data.expectedProps !== undefined ? { expectedProps: data.expectedProps } : {}),
          ...(data.includesFSEQ !== undefined ? { includesFSEQ: data.includesFSEQ } : {}),
          ...(data.includesSource !== undefined ? { includesSource: data.includesSource } : {}),
          ...(data.licenseType !== undefined ? { licenseType: data.licenseType } : {}),
          ...(data.seatCount !== undefined ? { seatCount: data.seatCount } : {}),
        },
      });

      if (data.price !== undefined) {
        await tx.price.updateMany({
          where: { productId: params.id, isActive: true },
          data: { isActive: false },
        });

        await tx.price.create({
          data: {
            productId: params.id,
            amount: data.price,
            currency: 'USD',
            isActive: true,
          },
        });
      }

      return updated;
    });

    await createAuditLog({
      userId: user.id,
      action: 'PRODUCT_UPDATED',
      entityType: 'product',
      entityId: params.id,
      changes: parsed.data,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      product: {
        id: updatedProduct.id,
        slug: updatedProduct.slug,
        status: updatedProduct.status,
      },
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return internalServerError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedError();
    }

    if (!isCreatorOrAdmin(user)) {
      return forbiddenError('Creator role required');
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
      return notFoundError('Product not found');
    }

    if (product.creatorId !== user.id) {
      return forbiddenError('Forbidden');
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
    return internalServerError();
  }
}
