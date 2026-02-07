import { NextRequest, NextResponse } from 'next/server';
import { AuditAction, SupportTicketStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { applyRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/rate-limit';
import { requireCreatorOrAdminUser } from '@/lib/auth/guards';
import {
  badRequestError,
  forbiddenError,
  internalServerError,
  notFoundError,
} from '@/lib/api/errors';

const createTicketSchema = z.object({
  category: z.string().min(1).max(64),
  subject: z.string().min(3).max(160),
  description: z.string().min(10).max(5000),
  orderId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

const statusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireCreatorOrAdminUser();
    if (authResult.response) {
      return authResult.response;
    }
    const { user } = authResult;

    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.STATS_QUERY,
      byUser: true,
      byIp: false,
      message: 'Support query rate limit exceeded. Please try again later.',
    });
    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const { searchParams } = new URL(request.url);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '25', 10);
    const status = searchParams.get('status');

    const normalizedPage = Number.isNaN(page) || page < 1 ? 1 : page;
    const normalizedPageSize = Number.isNaN(pageSize)
      ? 25
      : Math.min(Math.max(pageSize, 1), 100);

    let statusFilter: SupportTicketStatus | undefined;
    if (status) {
      const statusParse = statusSchema.safeParse(status);
      if (!statusParse.success) {
        return badRequestError('Invalid support ticket status filter');
      }
      statusFilter = statusParse.data;
    }

    const where = {
      sellerId: user.id,
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [total, tickets] = await Promise.all([
      db.supportTicket.count({ where }),
      db.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (normalizedPage - 1) * normalizedPageSize,
        take: normalizedPageSize,
      }),
    ]);

    return NextResponse.json({
      tickets,
      pagination: {
        page: normalizedPage,
        pageSize: normalizedPageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
      },
      filters: {
        status: statusFilter || null,
      },
    });
  } catch (error) {
    console.error('Error fetching seller support tickets:', error);
    return internalServerError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireCreatorOrAdminUser();
    if (authResult.response) {
      return authResult.response;
    }
    const { user } = authResult;

    const limitResult = await applyRateLimit(request, {
      config: RATE_LIMIT_CONFIGS.PRODUCT_UPDATE,
      byUser: true,
      byIp: false,
      message: 'Support ticket submission rate limit exceeded. Please try again later.',
    });
    if (!limitResult.allowed) {
      return limitResult.response;
    }

    const body = await request.json();
    const parsed = createTicketSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError('Invalid support ticket payload', parsed.error.issues);
    }

    const { category, subject, description, orderId, productId } = parsed.data;

    if (productId) {
      const product = await db.product.findUnique({
        where: { id: productId },
        select: { creatorId: true },
      });

      if (!product) {
        return notFoundError('Product not found');
      }

      if (product.creatorId !== user.id) {
        return forbiddenError('Cannot link support ticket to another seller product');
      }
    }

    if (orderId) {
      const orderItem = await db.orderItem.findFirst({
        where: {
          orderId,
          product: {
            creatorId: user.id,
          },
        },
        select: { id: true },
      });

      if (!orderItem) {
        return notFoundError('Order not found for this seller');
      }
    }

    const ticket = await db.supportTicket.create({
      data: {
        sellerId: user.id,
        category,
        subject,
        description,
        orderId: orderId || null,
        productId: productId || null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.ADMIN_ACTION,
        entityType: 'support_ticket',
        entityId: ticket.id,
        metadata: {
          category,
          subject,
          orderId: orderId || null,
          productId: productId || null,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ ticket }, { status: 201 });
  } catch (error) {
    console.error('Error creating seller support ticket:', error);
    return internalServerError();
  }
}
