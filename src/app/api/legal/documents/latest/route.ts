import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { LegalDocumentType } from '@prisma/client';

const allowedTypes = new Set<LegalDocumentType>([
  LegalDocumentType.TERMS_OF_SERVICE,
  LegalDocumentType.PRIVACY_POLICY,
  LegalDocumentType.REFUND_POLICY,
]);

function parseType(typeParam: string | null): LegalDocumentType | null {
  if (!typeParam) return null;
  if (!(typeParam in LegalDocumentType)) return null;
  const value = LegalDocumentType[typeParam as keyof typeof LegalDocumentType];
  return allowedTypes.has(value) ? value : null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const type = parseType(url.searchParams.get('type'));
  if (!type) {
    return Response.json(
      { success: false, error: 'Invalid or missing `type` query parameter.' },
      { status: 400 },
    );
  }

  const doc = await db.legalDocument.findFirst({
    where: {
      type,
      publishedAt: { not: null },
    },
    orderBy: { publishedAt: 'desc' },
  });

  if (!doc) {
    return Response.json({ success: false, error: 'Not found.' }, { status: 404 });
  }

  return Response.json({
    success: true,
    data: {
      id: doc.id,
      type: doc.type,
      version: doc.version,
      title: doc.title,
      contentMarkdown: doc.contentMarkdown,
      effectiveAt: doc.effectiveAt,
      publishedAt: doc.publishedAt,
    },
  });
}

