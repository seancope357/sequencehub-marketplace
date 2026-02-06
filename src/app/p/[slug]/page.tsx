import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { generateDownloadUrl } from '@/lib/storage';
import { getCurrentUser } from '@/lib/supabase/auth';
import { ProductStatus } from '@prisma/client';
import { absoluteUrl } from '@/lib/seo';
import { ProductPageClient } from '@/components/products/ProductPageClient';

export const dynamic = 'force-dynamic';

async function getProductData(slug: string) {
  return db.product.findUnique({
    where: { slug },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
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
        orderBy: { versionNumber: 'desc' },
      },
      files: true,
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await getProductData(params.slug);

  if (!product || product.status !== ProductStatus.PUBLISHED) {
    return {
      title: 'Product Not Found | SequenceHUB',
      robots: { index: false, follow: false },
    };
  }

  const description = product.description.length > 160
    ? `${product.description.slice(0, 157)}...`
    : product.description;

  return {
    title: `${product.title} | SequenceHUB`,
    description,
    alternates: {
      canonical: `/p/${product.slug}`,
    },
    openGraph: {
      title: `${product.title} | SequenceHUB`,
      description,
      url: `/p/${product.slug}`,
      type: 'product',
      siteName: 'SequenceHUB',
      images: [
        {
          url: absoluteUrl('/logo.svg'),
          alt: 'SequenceHUB',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} | SequenceHUB`,
      description,
      images: [absoluteUrl('/logo.svg')],
    },
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProductData(params.slug);

  if (!product) {
    notFound();
  }

  const user = await getCurrentUser();
  const isOwner = user ? product.creatorId === user.id : false;

  if (product.status !== ProductStatus.PUBLISHED && !isOwner) {
    notFound();
  }

  const purchased = user
    ? Boolean(
        await db.entitlement.findFirst({
          where: {
            userId: user.id,
            productId: product.id,
            isActive: true,
          },
        })
      )
    : false;

  if (product.status === ProductStatus.PUBLISHED) {
    await db.product.update({
      where: { id: product.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  const mediaWithUrls = await Promise.all(
    product.media.map(async (media) => {
      try {
        const url = await generateDownloadUrl(media.storageKey, 3600, 'PREVIEW');
        return { ...media, url };
      } catch (err) {
        console.warn('Failed to generate media URL:', err);
        return { ...media, url: null };
      }
    })
  );

  const clientProduct = {
    id: product.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    category: product.category,
    price: product.prices[0]?.amount || 0,
    includesFSEQ: product.includesFSEQ,
    includesSource: product.includesSource,
    xLightsVersionMin: product.xLightsVersionMin ?? undefined,
    xLightsVersionMax: product.xLightsVersionMax ?? undefined,
    targetUse: product.targetUse ?? undefined,
    expectedProps: product.expectedProps ?? undefined,
    licenseType: product.licenseType,
    seatCount: product.seatCount ?? undefined,
    creator: {
      id: product.creator.id,
      name: product.creator.name || product.creator.email || 'Creator',
      avatar: product.creator.avatar ?? undefined,
    },
    media: mediaWithUrls,
    versions: product.versions.map((version) => ({
      id: version.id,
      versionNumber: version.versionNumber,
      versionName: version.versionName,
      changelog: version.changelog || undefined,
      publishedAt: version.publishedAt?.toISOString(),
    })),
    files: product.files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      sequenceLength: file.sequenceLength ?? undefined,
      fps: file.fps ?? undefined,
      channelCount: file.channelCount ?? undefined,
    })),
    saleCount: product.saleCount,
    viewCount: product.viewCount,
    purchased,
  };

  return <ProductPageClient product={clientProduct} />;
}
