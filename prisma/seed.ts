import { PrismaClient, ProductCategory, ProductStatus, LicenseType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sequencehub.com' },
    update: {},
    create: {
      email: 'admin@sequencehub.com',
      passwordHash: adminPassword,
      name: 'Admin User',
      roles: {
        create: [
          { role: 'ADMIN' },
          { role: 'CREATOR' },
          { role: 'BUYER' },
        ],
      },
    },
  });

  console.log('Created admin user:', admin.email);

  // Create creator profile
  const creatorProfile = await prisma.profile.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      displayName: 'SequenceMaster',
      bio: 'Professional xLights sequence creator with 10+ years of experience',
      website: 'https://sequencemaster.com',
    },
  });

  console.log('Created creator profile');

  // Create creator account
  const creatorAccount = await prisma.creatorAccount.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      stripeAccountId: 'acct_test123',
      stripeAccountStatus: 'active',
      onboardingStatus: 'COMPLETED',
    },
  });

  console.log('Created creator account');

  // Create some products
  const products = [
    {
      slug: 'christmas-tree-twinkle',
      title: 'Christmas Tree Twinkle Sequence',
      description: 'A beautiful Christmas tree twinkling sequence perfect for pixel trees. Features synchronized color changes and smooth transitions throughout the entire song.',
      category: ProductCategory.CHRISTMAS,
      status: ProductStatus.PUBLISHED,
      licenseType: LicenseType.PERSONAL,
      includesFSEQ: true,
      includesSource: true,
      xLightsVersionMin: '2023.1',
      xLightsVersionMax: '2024.0',
      targetUse: 'Pixel Tree',
      expectedProps: '24x50 Pixel Tree or similar',
      saleCount: 42,
      viewCount: 324,
      prices: {
        create: {
          amount: 14.99,
          currency: 'USD',
        },
      },
      media: {
        create: [
          {
            mediaType: 'cover',
            fileName: 'cover.jpg',
            originalName: 'christmas-tree-cover.jpg',
            fileSize: 245678,
            fileHash: 'abc123',
            storageKey: 'covers/christmas-tree-twinkle.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
      versions: {
        create: {
          versionNumber: 1,
          versionName: '1.0.0',
          isLatest: true,
          publishedAt: new Date(),
        },
      },
    },
    {
      slug: 'spooky-skeleton-dance',
      title: 'Spooky Skeleton Dance',
      description: 'A haunting Halloween sequence featuring a skeleton dancing to upbeat spooky music. Perfect for Halloween displays with singing pumpkin props.',
      category: ProductCategory.HALLOWEEN,
      status: ProductStatus.PUBLISHED,
      licenseType: LicenseType.PERSONAL,
      includesFSEQ: true,
      includesSource: false,
      xLightsVersionMin: '2023.0',
      targetUse: 'Pumpkin Props',
      expectedProps: '4 Singing Pumpkins',
      saleCount: 28,
      viewCount: 189,
      prices: {
        create: {
          amount: 9.99,
          currency: 'USD',
        },
      },
      media: {
        create: [
          {
            mediaType: 'cover',
            fileName: 'cover.jpg',
            originalName: 'skeleton-dance-cover.jpg',
            fileSize: 198765,
            fileHash: 'def456',
            storageKey: 'covers/spooky-skeleton-dance.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
      versions: {
        create: {
          versionNumber: 1,
          versionName: '1.0.0',
          isLatest: true,
          publishedAt: new Date(),
        },
      },
    },
    {
      slug: 'pixel-wave-melody',
      title: 'Pixel Wave Melody',
      description: 'A mesmerizing wave effect sequence that flows across your pixel matrix. Great for music visualization and ambient background effects.',
      category: ProductCategory.MATRIX,
      status: ProductStatus.PUBLISHED,
      licenseType: LicenseType.COMMERCIAL,
      seatCount: 5,
      includesFSEQ: true,
      includesSource: true,
      xLightsVersionMin: '2023.2',
      targetUse: 'Matrix Display',
      expectedProps: '16x50 or larger pixel matrix',
      saleCount: 15,
      viewCount: 145,
      prices: {
        create: {
          amount: 24.99,
          currency: 'USD',
        },
      },
      media: {
        create: [
          {
            mediaType: 'cover',
            fileName: 'cover.jpg',
            originalName: 'pixel-wave-cover.jpg',
            fileSize: 210987,
            fileHash: 'ghi789',
            storageKey: 'covers/pixel-wave-melody.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
      versions: {
        create: {
          versionNumber: 1,
          versionName: '1.0.0',
          isLatest: true,
          publishedAt: new Date(),
        },
      },
    },
    {
      slug: 'rainbow-arch-burst',
      title: 'Rainbow Arch Burst',
      description: 'Vibrant rainbow color bursts flowing across arch props. Perfect for adding color and movement to any holiday display.',
      category: ProductCategory.ARCH,
      status: ProductStatus.PUBLISHED,
      licenseType: LicenseType.PERSONAL,
      includesFSEQ: true,
      includesSource: true,
      xLightsVersionMin: '2022.9',
      xLightsVersionMax: '2024.0',
      targetUse: 'Arch Props',
      expectedProps: '4-8 arches, 50 pixels each',
      saleCount: 56,
      viewCount: 412,
      prices: {
        create: {
          amount: 11.99,
          currency: 'USD',
        },
      },
      media: {
        create: [
          {
            mediaType: 'cover',
            fileName: 'cover.jpg',
            originalName: 'rainbow-arch-cover.jpg',
            fileSize: 234567,
            fileHash: 'jkl012',
            storageKey: 'covers/rainbow-arch-burst.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
      versions: {
        create: {
          versionNumber: 1,
          versionName: '1.0.0',
          isLatest: true,
          publishedAt: new Date(),
        },
      },
    },
    {
      slug: 'star-spangled-banner',
      title: 'Star Spangled Banner - Patriotic Sequence',
      description: 'A moving sequence for the national anthem featuring red, white, and blue effects. Perfect for Memorial Day, July 4th, and Veterans Day.',
      category: ProductCategory.OTHER,
      status: ProductStatus.PUBLISHED,
      licenseType: LicenseType.PERSONAL,
      includesFSEQ: true,
      includesSource: true,
      xLightsVersionMin: '2023.0',
      targetUse: 'Multi-Element Display',
      expectedProps: 'Mega tree + Arches + Bushes',
      saleCount: 73,
      viewCount: 567,
      prices: {
        create: {
          amount: 19.99,
          currency: 'USD',
        },
      },
      media: {
        create: [
          {
            mediaType: 'cover',
            fileName: 'cover.jpg',
            originalName: 'star-spangled-cover.jpg',
            fileSize: 267890,
            fileHash: 'mno345',
            storageKey: 'covers/star-spangled-banner.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
      versions: {
        create: {
          versionNumber: 1,
          versionName: '1.0.0',
          isLatest: true,
          publishedAt: new Date(),
        },
      },
    },
    {
      slug: 'melting-melody-effect',
      title: 'Melting Melody Effect',
      description: 'A soothing melting effect that follows the melody of calm instrumental music. Great for background sequences.',
      category: ProductCategory.MELODY,
      status: ProductStatus.PUBLISHED,
      licenseType: LicenseType.PERSONAL,
      includesFSEQ: true,
      includesSource: false,
      xLightsVersionMin: '2023.1',
      targetUse: 'Multi-Element',
      expectedProps: 'Any pixel display',
      saleCount: 31,
      viewCount: 278,
      prices: {
        create: {
          amount: 7.99,
          currency: 'USD',
        },
      },
      media: {
        create: [
          {
            mediaType: 'cover',
            fileName: 'cover.jpg',
            originalName: 'melting-melody-cover.jpg',
            fileSize: 189012,
            fileHash: 'pqr678',
            storageKey: 'covers/melting-melody-effect.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
      versions: {
        create: {
          versionNumber: 1,
          versionName: '1.0.0',
          isLatest: true,
          publishedAt: new Date(),
        },
      },
    },
    {
      slug: 'free-test-sequence',
      title: 'Free Test Sequence',
      description: 'A free sample sequence to test your setup and get familiar with our platform. Perfect for beginners.',
      category: ProductCategory.OTHER,
      status: ProductStatus.PUBLISHED,
      licenseType: LicenseType.PERSONAL,
      includesFSEQ: true,
      includesSource: true,
      xLightsVersionMin: '2022.0',
      targetUse: 'Test/Setup',
      expectedProps: 'Minimal - good for testing',
      saleCount: 156,
      viewCount: 1234,
      prices: {
        create: {
          amount: 0,
          currency: 'USD',
        },
      },
      media: {
        create: [
          {
            mediaType: 'cover',
            fileName: 'cover.jpg',
            originalName: 'free-test-cover.jpg',
            fileSize: 145678,
            fileHash: 'stu901',
            storageKey: 'covers/free-test-sequence.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
      versions: {
        create: {
          versionNumber: 1,
          versionName: '1.0.0',
          isLatest: true,
          publishedAt: new Date(),
        },
      },
    },
    {
      slug: 'candy-cane-lane',
      title: 'Candy Cane Lane',
      description: 'Sweet and festive candy cane effects flowing across your display. Perfect for Christmas candy cane props or tree wrapping.',
      category: ProductCategory.CHRISTMAS,
      status: ProductStatus.PUBLISHED,
      licenseType: LicenseType.PERSONAL,
      includesFSEQ: true,
      includesSource: true,
      xLightsVersionMin: '2023.0',
      targetUse: 'Candy Canes / Tree',
      expectedProps: 'Candy canes or mega tree',
      saleCount: 38,
      viewCount: 298,
      prices: {
        create: {
          amount: 12.99,
          currency: 'USD',
        },
      },
      media: {
        create: [
          {
            mediaType: 'cover',
            fileName: 'cover.jpg',
            originalName: 'candy-cane-cover.jpg',
            fileSize: 223456,
            fileHash: 'vwx234',
            storageKey: 'covers/candy-cane-lane.jpg',
            mimeType: 'image/jpeg',
          },
        ],
      },
      versions: {
        create: {
          versionNumber: 1,
          versionName: '1.0.0',
          isLatest: true,
          publishedAt: new Date(),
        },
      },
    },
  ];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: {
        ...productData,
        creatorId: admin.id,
      },
    });
    console.log('Created product:', product.title);

    // Add sample files to each product
    const version = await prisma.productVersion.findFirst({
      where: { productId: product.id },
    });

    if (version) {
      await prisma.productFile.create({
        data: {
          versionId: version.id,
          fileName: `${product.slug}.fseq`,
          originalName: `${product.slug}.fseq`,
          fileType: 'RENDERED',
          fileSize: Math.floor(Math.random() * 50000000) + 10000000,
          fileHash: `hash-${Math.random().toString(36).substring(7)}`,
          storageKey: `files/${product.slug}.fseq`,
          mimeType: 'application/octet-stream',
          sequenceLength: 180 + Math.floor(Math.random() * 120),
          fps: 20,
          channelCount: 1000 + Math.floor(Math.random() * 9000),
        },
      });

      if (productData.includesSource) {
        await prisma.productFile.create({
          data: {
            versionId: version.id,
            fileName: `${product.slug}.xsq`,
            originalName: `${product.slug}.xsq`,
            fileType: 'SOURCE',
            fileSize: Math.floor(Math.random() * 5000000) + 1000000,
            fileHash: `hash-${Math.random().toString(36).substring(7)}`,
            storageKey: `files/${product.slug}.xsq`,
            mimeType: 'application/xml',
          },
        });
      }
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
