import { notFound } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { db } from '@/lib/db';
import { LegalDocumentType } from '@prisma/client';
import type { Metadata } from 'next';

function mapSlugToType(slug: string): LegalDocumentType | null {
  switch (slug) {
    case 'terms':
      return LegalDocumentType.TERMS_OF_SERVICE;
    case 'privacy':
      return LegalDocumentType.PRIVACY_POLICY;
    case 'refunds':
      return LegalDocumentType.REFUND_POLICY;
    default:
      return null;
  }
}

function slugLabel(slug: string): string {
  switch (slug) {
    case 'terms':
      return 'Terms of Service';
    case 'privacy':
      return 'Privacy Policy';
    case 'refunds':
      return 'Refund Policy';
    default:
      return 'Legal';
  }
}

export async function generateMetadata({ params }: { params: { type: string } }): Promise<Metadata> {
  const label = slugLabel(params.type);
  return {
    title: `${label} | SequenceHUB`,
    description: `${label} for SequenceHUB.`,
    alternates: {
      canonical: `/legal/${params.type}`,
    },
  };
}

export default async function LegalPage({ params }: { params: { type: string } }) {
  const { type: typeSlug } = params;
  const type = mapSlugToType(typeSlug);
  if (!type) notFound();

  const doc = await db.legalDocument.findFirst({
    where: { type, publishedAt: { not: null } },
    orderBy: { publishedAt: 'desc' },
  });
  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to home
          </Link>
          <div className="text-sm text-muted-foreground">{slugLabel(typeSlug)}</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        <h1 className="text-3xl font-bold mb-2">{doc.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Version {doc.version} • Effective {doc.effectiveAt.toISOString().slice(0, 10)}
        </p>

        <article className="space-y-4">
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h2 className="text-2xl font-semibold mt-8">{children}</h2>,
              h2: ({ children }) => <h3 className="text-xl font-semibold mt-6">{children}</h3>,
              h3: ({ children }) => <h4 className="text-lg font-semibold mt-4">{children}</h4>,
              p: ({ children }) => <p className="leading-7 text-foreground/90">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-6 space-y-2">{children}</ul>,
              li: ({ children }) => <li className="leading-7 text-foreground/90">{children}</li>,
              strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
              a: ({ href, children }) => (
                <a href={href} className="text-primary underline underline-offset-4">
                  {children}
                </a>
              ),
            }}
          >
            {doc.contentMarkdown}
          </ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
