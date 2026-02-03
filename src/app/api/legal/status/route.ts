import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/supabase/auth';
import { LegalDocumentType } from '@prisma/client';

const LEGAL_TYPES: LegalDocumentType[] = [
  LegalDocumentType.TERMS_OF_SERVICE,
  LegalDocumentType.PRIVACY_POLICY,
  LegalDocumentType.REFUND_POLICY,
];

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const latestDocs = await Promise.all(
    LEGAL_TYPES.map((type) =>
      db.legalDocument.findFirst({
        where: { type, publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
      }),
    ),
  );

  const docs = latestDocs.filter(Boolean);
  const acceptances = await db.legalAcceptance.findMany({
    where: {
      userId: user.id,
      documentId: { in: docs.map((d) => d!.id) },
    },
    select: { documentId: true },
  });
  const acceptedSet = new Set(acceptances.map((a) => a.documentId));

  const result = LEGAL_TYPES.map((type) => {
    const doc = docs.find((d) => d!.type === type) ?? null;
    if (!doc) {
      return { type, latest: null, accepted: true };
    }
    return {
      type,
      latest: { id: doc.id, version: doc.version, effectiveAt: doc.effectiveAt },
      accepted: acceptedSet.has(doc.id),
    };
  });

  const needsAcceptance = result.some((r) => r.latest && !r.accepted);

  return Response.json({
    success: true,
    data: {
      needsAcceptance,
      documents: result,
    },
  });
}

