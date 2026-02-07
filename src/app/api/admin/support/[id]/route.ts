import { NextRequest, NextResponse } from 'next/server';
import { SupportTicketStatus, AuditAction } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/supabase/auth';
import { badRequestError, forbiddenError, internalServerError, notFoundError, unauthorizedError } from '@/lib/api/errors';

const updateSupportTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedError();
    }

    const isAdmin = user.roles.some((role) => role.role === 'ADMIN');
    if (!isAdmin) {
      return forbiddenError('Admin role required');
    }

    const body = await request.json();
    const parsed = updateSupportTicketSchema.safeParse(body);
    if (!parsed.success) {
      return badRequestError('Invalid support ticket update payload', parsed.error.issues);
    }

    const existingTicket = await db.supportTicket.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });

    if (!existingTicket) {
      return notFoundError('Support ticket not found');
    }

    const updatedTicket = await db.supportTicket.update({
      where: { id: params.id },
      data: {
        status: parsed.data.status as SupportTicketStatus,
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.id,
        action: AuditAction.ADMIN_ACTION,
        entityType: 'support_ticket',
        entityId: updatedTicket.id,
        metadata: {
          previousStatus: existingTicket.status,
          nextStatus: updatedTicket.status,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      },
    });

    return NextResponse.json({ ticket: updatedTicket });
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return internalServerError();
  }
}
