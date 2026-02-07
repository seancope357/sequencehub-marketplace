import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, createAuditLog } from '@/lib/supabase/auth';
import { isCreatorOrAdmin, isAdmin } from '@/lib/auth-utils';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { generateDownloadUrl } from '@/lib/storage';
import { getStripeConfigStatus } from '@/lib/stripe-connect';
import {
  badRequestError,
  conflictError,
  forbiddenError,
  internalServerError,
  unauthorizedError,
} from '@/lib/api/errors';

function buildSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}

async function resolveUniqueSlug(baseSlug: string, excludeProductId?: string): Promise<string> {
  let candidate = baseSlug;
  let attempt = 0;

  while (attempt < 1000) {
    const existing = await db.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeProductId) {
      return candidate;
    }

    attempt += 1;
    candidate = `${baseSlug}-${attempt}`;
  }

  return `${baseSlug}-${Date.now()}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedError();
    }

    if (!isCreatorOrAdmin(user)) {
      return forbiddenError('Creator role required');
    }

    // Get user's products
    const products = await db.product.findMany({
      where: { creatorId: user.id },
      include: {
        prices: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        media: {
          orderBy: { displayOrder: 'asc' },
          take: 4,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Transform data
    const transformedProducts = await Promise.all(
      products.map(async (product) => {
        const mediaWithUrls = await Promise.all(
          product.media.map(async (item) => {
            try {
              const url = await generateDownloadUrl(item.storageKey, 3600, 'PREVIEW');
              return { ...item, url };
            } catch (err) {
              console.warn('Failed to generate media URL:', err);
              return { ...item, url: null };
            }
          })
        );

        return {
          id: product.id,
          slug: product.slug,
          title: product.title,
          category: product.category,
          status: product.status,
          price: product.prices[0]?.amount || 0,
          includesFSEQ: product.includesFSEQ,
          includesSource: product.includesSource,
          saleCount: product.saleCount,
          viewCount: product.viewCount,
          createdAt: product.createdAt.toISOString(),
          media: mediaWithUrls,
        };
      })
    );

    return NextResponse.json(
      { products: transformedProducts },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return internalServerError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return unauthorizedError();
    }

    if (!isCreatorOrAdmin(user)) {
      return forbiddenError('Creator role required');
    }

    // Apply rate limiting: 10 product creations per hour per user
    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.PRODUCT_CREATE,
      byUser: true,
      byIp: false,
      message: 'Product creation limit exceeded. You can create up to 10 products per hour.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const body = await request.json();
    const {
      draftId,
      title,
      description,
      category,
      price,
      xLightsVersionMin,
      xLightsVersionMax,
      targetUse,
      expectedProps,
      includesFSEQ,
      includesSource,
      licenseType,
      seatCount,
      status = 'DRAFT',
      files = [],
      media = [],
    } = body;

    // Validation
    if (!title?.trim()) {
      return badRequestError('Title is required');
    }

    if (!description?.trim()) {
      return badRequestError('Description is required');
    }

    if (!category) {
      return badRequestError('Category is required');
    }

    if (price === undefined || price === null) {
      return badRequestError('Price is required');
    }

    const wantsPublish = status === 'PUBLISHED';

    if (wantsPublish && !isAdmin(user)) {
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

    const baseSlug = buildSlug(title);
    if (!baseSlug) {
      return badRequestError('Unable to generate slug from title');
    }

    // Validate files payload (if present)
    if (Array.isArray(files) && files.length > 0) {
      for (const file of files) {
        if (!file?.fileName || !file?.fileType || !file?.fileSize) {
          return badRequestError('Each file must include fileName, fileType, and fileSize');
        }

        if (!file?.storageKey || !file?.fileHash) {
          return badRequestError('Each file must include storageKey and fileHash');
        }
      }
    }

    // Validate media payload (if present)
    if (Array.isArray(media) && media.length > 0) {
      for (const item of media) {
        if (!item?.fileName || !item?.fileSize || !item?.storageKey || !item?.fileHash) {
          return badRequestError('Each media item must include fileName, fileSize, storageKey, and fileHash');
        }

        if (!item?.mediaType || !['cover', 'gallery', 'preview'].includes(item.mediaType)) {
          return badRequestError('Each media item must include a valid mediaType (cover, gallery, preview)');
        }
      }
    }

    let productIdForAudit: string;
    let productSlugForResponse: string;
    let auditAction: 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' = 'PRODUCT_CREATED';

    if (draftId) {
      const existingDraft = await db.product.findUnique({
        where: { id: draftId },
        select: {
          id: true,
          creatorId: true,
          slug: true,
          status: true,
        },
      });

      if (!existingDraft || existingDraft.creatorId !== user.id) {
        return forbiddenError('Draft not found for this creator');
      }

      const slug = await resolveUniqueSlug(baseSlug, existingDraft.id);

      await db.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: existingDraft.id },
          data: {
            slug,
            title,
            description,
            category,
            status,
            licenseType: licenseType || 'PERSONAL',
            seatCount: licenseType === 'COMMERCIAL' ? seatCount : null,
            includesFSEQ: includesFSEQ || false,
            includesSource: includesSource || false,
            xLightsVersionMin,
            xLightsVersionMax,
            targetUse,
            expectedProps,
          },
        });

        await tx.price.updateMany({
          where: { productId: existingDraft.id, isActive: true },
          data: { isActive: false },
        });

        await tx.price.create({
          data: {
            productId: existingDraft.id,
            amount: parseFloat(price),
            currency: 'USD',
            isActive: true,
          },
        });

        await tx.productMedia.deleteMany({
          where: { productId: existingDraft.id },
        });

        if (media.length > 0) {
          await tx.productMedia.createMany({
            data: media.map((item: any, index: number) => ({
              productId: existingDraft.id,
              mediaType: item.mediaType,
              fileName: item.fileName,
              originalName: item.originalName || item.fileName,
              fileSize: item.fileSize,
              fileHash: item.fileHash,
              storageKey: item.storageKey,
              mimeType: item.mimeType || getMimeType(item.fileName),
              width: item.width || null,
              height: item.height || null,
              altText: item.altText || null,
              displayOrder: item.displayOrder ?? index,
            })),
          });
        }

        const latestVersion = await tx.productVersion.findFirst({
          where: {
            productId: existingDraft.id,
            isLatest: true,
          },
          orderBy: {
            versionNumber: 'desc',
          },
          select: {
            id: true,
          },
        });

        if (!latestVersion) {
          await tx.productVersion.create({
            data: {
              productId: existingDraft.id,
              versionNumber: 1,
              versionName: '1.0.0',
              isLatest: true,
              publishedAt: status === 'PUBLISHED' ? new Date() : null,
              files: files.length
                ? {
                    create: files.map((file: any) => ({
                      fileName: file.fileName,
                      originalName: file.originalName || file.fileName,
                      fileType: file.fileType,
                      fileSize: file.fileSize,
                      fileHash: file.fileHash,
                      storageKey: file.storageKey,
                      mimeType: file.mimeType || getMimeType(file.fileName),
                      metadata: file.metadata
                        ? typeof file.metadata === 'string'
                          ? file.metadata
                          : JSON.stringify(file.metadata)
                        : null,
                      sequenceLength: file.sequenceLength,
                      fps: file.fps,
                      channelCount: file.channelCount,
                    })),
                  }
                : undefined,
            },
          });
        } else {
          await tx.productVersion.update({
            where: { id: latestVersion.id },
            data: {
              publishedAt: status === 'PUBLISHED' ? new Date() : null,
            },
          });

          await tx.productFile.deleteMany({
            where: { versionId: latestVersion.id },
          });

          if (files.length > 0) {
            await tx.productFile.createMany({
              data: files.map((file: any) => ({
                versionId: latestVersion.id,
                fileName: file.fileName,
                originalName: file.originalName || file.fileName,
                fileType: file.fileType,
                fileSize: file.fileSize,
                fileHash: file.fileHash,
                storageKey: file.storageKey,
                mimeType: file.mimeType || getMimeType(file.fileName),
                metadata: file.metadata
                  ? typeof file.metadata === 'string'
                    ? file.metadata
                    : JSON.stringify(file.metadata)
                  : null,
                sequenceLength: file.sequenceLength,
                fps: file.fps,
                channelCount: file.channelCount,
              })),
            });
          }
        }
      });

      productIdForAudit = existingDraft.id;
      productSlugForResponse = slug;
      auditAction = 'PRODUCT_UPDATED';
    } else {
      const slug = await resolveUniqueSlug(baseSlug);

      const product = await db.product.create({
        data: {
          slug,
          creatorId: user.id,
          title,
          description,
          category,
          status,
          licenseType: licenseType || 'PERSONAL',
          seatCount: licenseType === 'COMMERCIAL' ? seatCount : null,
          includesFSEQ: includesFSEQ || false,
          includesSource: includesSource || false,
          xLightsVersionMin,
          xLightsVersionMax,
          targetUse,
          expectedProps,
          prices: {
            create: {
              amount: parseFloat(price),
              currency: 'USD',
              isActive: true,
            },
          },
          media: media.length
            ? {
                create: media.map((item: any, index: number) => ({
                  mediaType: item.mediaType,
                  fileName: item.fileName,
                  originalName: item.originalName || item.fileName,
                  fileSize: item.fileSize,
                  fileHash: item.fileHash,
                  storageKey: item.storageKey,
                  mimeType: item.mimeType || getMimeType(item.fileName),
                  width: item.width || null,
                  height: item.height || null,
                  altText: item.altText || null,
                  displayOrder: item.displayOrder ?? index,
                })),
              }
            : undefined,
          versions: {
            create: {
              versionNumber: 1,
              versionName: '1.0.0',
              isLatest: true,
              publishedAt: status === 'PUBLISHED' ? new Date() : null,
              files: files.length
                ? {
                    create: files.map((file: any) => ({
                      fileName: file.fileName,
                      originalName: file.originalName || file.fileName,
                      fileType: file.fileType,
                      fileSize: file.fileSize,
                      fileHash: file.fileHash,
                      storageKey: file.storageKey,
                      mimeType: file.mimeType || getMimeType(file.fileName),
                      metadata: file.metadata
                        ? typeof file.metadata === 'string'
                          ? file.metadata
                          : JSON.stringify(file.metadata)
                        : null,
                      sequenceLength: file.sequenceLength,
                      fps: file.fps,
                      channelCount: file.channelCount,
                    })),
                  }
                : undefined,
            },
          },
        },
      });

      productIdForAudit = product.id;
      productSlugForResponse = product.slug;
      auditAction = 'PRODUCT_CREATED';
    }

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: auditAction,
      entityType: 'product',
      entityId: productIdForAudit,
      changes: JSON.stringify({
        title,
        status,
        category,
        price,
        draftId: draftId || null,
      }),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        product: {
          id: productIdForAudit,
          slug: productSlugForResponse,
        },
      },
      { status: draftId ? 200 : 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return internalServerError();
  }
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    fseq: 'application/octet-stream',
    xsq: 'application/xml',
    xml: 'application/xml',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    gif: 'image/gif',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}
