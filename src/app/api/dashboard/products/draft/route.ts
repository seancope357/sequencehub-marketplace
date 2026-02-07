import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser, createAuditLog } from '@/lib/supabase/auth';
import { isCreatorOrAdmin } from '@/lib/auth-utils';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { badRequestError, forbiddenError, internalServerError, unauthorizedError } from '@/lib/api/errors';

const saveDraftSchema = z.object({
  draftId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(140).optional(),
  description: z.string().trim().min(1).max(10000).optional(),
  category: z.string().min(1).max(64).optional(),
  price: z.coerce.number().min(0).optional(),
  xLightsVersionMin: z.string().max(64).nullable().optional(),
  xLightsVersionMax: z.string().max(64).nullable().optional(),
  targetUse: z.string().max(5000).nullable().optional(),
  expectedProps: z.string().max(5000).nullable().optional(),
  includesFSEQ: z.boolean().optional(),
  includesSource: z.boolean().optional(),
  licenseType: z.enum(['PERSONAL', 'COMMERCIAL']).optional(),
  seatCount: z.coerce.number().int().positive().nullable().optional(),
});

function makeBaseSlug(title: string | undefined): string {
  if (!title || title.trim().length === 0) {
    return `draft-${Date.now()}`;
  }

  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return normalized || `draft-${Date.now()}`;
}

async function resolveUniqueSlug(baseSlug: string): Promise<string> {
  const direct = await db.product.findUnique({ where: { slug: baseSlug }, select: { id: true } });
  if (!direct) {
    return baseSlug;
  }

  let attempt = 1;
  while (attempt < 1000) {
    const candidate = `${baseSlug}-${attempt}`;
    const exists = await db.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) {
      return candidate;
    }
    attempt += 1;
  }

  return `${baseSlug}-${Date.now()}`;
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

    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.PRODUCT_UPDATE,
      byUser: true,
      byIp: false,
      message: 'Draft save rate limit exceeded. Please try again later.',
    });

    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const parsed = saveDraftSchema.safeParse(await request.json());
    if (!parsed.success) {
      return badRequestError('Invalid draft payload', parsed.error.issues);
    }

    const payload = parsed.data;

    if (payload.draftId) {
      const existing = await db.product.findUnique({
        where: { id: payload.draftId },
        select: { id: true, creatorId: true, slug: true, status: true },
      });

      if (!existing || existing.creatorId !== user.id) {
        return forbiddenError('Draft not found for this creator');
      }

      if (existing.status !== 'DRAFT') {
        return badRequestError('Only draft listings can be autosaved');
      }

      const shouldUpdateSlug = typeof payload.title === 'string' && payload.title.trim().length > 0;
      const baseSlug = shouldUpdateSlug ? makeBaseSlug(payload.title) : existing.slug;
      const slug = shouldUpdateSlug && baseSlug !== existing.slug ? await resolveUniqueSlug(baseSlug) : existing.slug;

      const updated = await db.$transaction(async (tx) => {
        const product = await tx.product.update({
          where: { id: existing.id },
          data: {
            ...(payload.title !== undefined ? { title: payload.title } : {}),
            ...(payload.description !== undefined ? { description: payload.description } : {}),
            ...(payload.category !== undefined ? { category: payload.category as any } : {}),
            ...(payload.xLightsVersionMin !== undefined ? { xLightsVersionMin: payload.xLightsVersionMin } : {}),
            ...(payload.xLightsVersionMax !== undefined ? { xLightsVersionMax: payload.xLightsVersionMax } : {}),
            ...(payload.targetUse !== undefined ? { targetUse: payload.targetUse } : {}),
            ...(payload.expectedProps !== undefined ? { expectedProps: payload.expectedProps } : {}),
            ...(payload.includesFSEQ !== undefined ? { includesFSEQ: payload.includesFSEQ } : {}),
            ...(payload.includesSource !== undefined ? { includesSource: payload.includesSource } : {}),
            ...(payload.licenseType !== undefined ? { licenseType: payload.licenseType } : {}),
            ...(payload.seatCount !== undefined ? { seatCount: payload.seatCount } : {}),
            slug,
          },
        });

        if (payload.price !== undefined) {
          await tx.price.updateMany({
            where: { productId: existing.id, isActive: true },
            data: { isActive: false },
          });

          await tx.price.create({
            data: {
              productId: existing.id,
              amount: payload.price,
              currency: 'USD',
              isActive: true,
            },
          });
        }

        return product;
      });

      await createAuditLog({
        userId: user.id,
        action: 'PRODUCT_UPDATED',
        entityType: 'product_draft',
        entityId: updated.id,
        changes: {
          autosave: true,
          draftId: updated.id,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({
        draftId: updated.id,
        slug: updated.slug,
        savedAt: new Date().toISOString(),
      });
    }

    const slug = await resolveUniqueSlug(makeBaseSlug(payload.title));

    const created = await db.product.create({
      data: {
        slug,
        creatorId: user.id,
        title: payload.title || 'Untitled Draft',
        description: payload.description || 'Draft listing',
        category: (payload.category as any) || 'OTHER',
        status: 'DRAFT',
        xLightsVersionMin: payload.xLightsVersionMin,
        xLightsVersionMax: payload.xLightsVersionMax,
        targetUse: payload.targetUse,
        expectedProps: payload.expectedProps,
        includesFSEQ: payload.includesFSEQ ?? true,
        includesSource: payload.includesSource ?? true,
        licenseType: payload.licenseType || 'PERSONAL',
        seatCount: payload.seatCount,
        prices: {
          create: {
            amount: payload.price ?? 0,
            currency: 'USD',
            isActive: true,
          },
        },
      },
    });

    await createAuditLog({
      userId: user.id,
      action: 'PRODUCT_CREATED',
      entityType: 'product_draft',
      entityId: created.id,
      changes: {
        autosave: true,
        draftId: created.id,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        draftId: created.id,
        slug: created.slug,
        savedAt: new Date().toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving product draft:', error);
    return internalServerError();
  }
}
