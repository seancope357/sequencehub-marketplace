import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/supabase/auth';
import { LegalDocumentType } from '@prisma/client';

const allowedTypes = new Set<LegalDocumentType>([
  LegalDocumentType.TERMS_OF_SERVICE,
  LegalDocumentType.PRIVACY_POLICY,
  LegalDocumentType.REFUND_POLICY,
]);

function parseType(type: unknown): LegalDocumentType | null {
  if (typeof type !== 'string') return null;
  if (!(type in LegalDocumentType)) return null;
  const value = LegalDocumentType[type as keyof typeof LegalDocumentType];
  return allowedTypes.has(value) ? value : null;
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const type = parseType((body as any)?.type);
  if (!type) {
    return Response.json(
      { success: false, error: 'Missing or invalid `type`.' },
      { status: 400 },
    );
  }

  const doc = await db.legalDocument.findFirst({
    where: { type, publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
  });
  if (!doc) {
    return Response.json({ success: false, error: 'No published document found.' }, { status: 404 });
  }

  const ipRaw = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip');
  const ip = ipRaw?.split(',')[0]?.trim() || null;
  const userAgent = request.headers.get('user-agent');

  await db.legalAcceptance.upsert({
    where: { userId_documentId: { userId: user.id, documentId: doc.id } },
    create: {
      userId: user.id,
      documentId: doc.id,
      documentType: doc.type,
      documentVersion: doc.version,
      ipAddress: ip,
      userAgent,
    },
    update: {},
  });

  return Response.json({
    success: true,
    data: {
      accepted: true,
      document: { id: doc.id, type: doc.type, version: doc.version, effectiveAt: doc.effectiveAt },
    },
  });
}

