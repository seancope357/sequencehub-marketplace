#!/usr/bin/env node

/**
 * Test Prisma Reviews Queries
 * Verifies Prisma can interact with the new review tables
 */

const path = require('path');

async function testPrismaQueries() {
  try {
    console.log('📦 Loading Prisma Client...');
    const { PrismaClient } = require('@prisma/client');

    const prisma = new PrismaClient({
      log: ['error', 'warn'],
    });

    console.log('✅ Prisma Client loaded\n');

    // Test 1: Query Review table
    console.log('🔍 Test 1: Querying Review table...');
    const reviews = await prisma.review.findMany({
      take: 5,
    });
    console.log(`  ✅ Success - Found ${reviews.length} reviews\n`);

    // Test 2: Query ReviewVote table
    console.log('🔍 Test 2: Querying ReviewVote table...');
    const votes = await prisma.reviewVote.findMany({
      take: 5,
    });
    console.log(`  ✅ Success - Found ${votes.length} votes\n`);

    // Test 3: Query ReviewResponse table
    console.log('🔍 Test 3: Querying ReviewResponse table...');
    const responses = await prisma.reviewResponse.findMany({
      take: 5,
    });
    console.log(`  ✅ Success - Found ${responses.length} responses\n`);

    // Test 4: Check Product table has new rating fields
    console.log('🔍 Test 4: Checking Product rating fields...');
    const products = await prisma.product.findFirst({
      select: {
        id: true,
        title: true,
        averageRating: true,
        reviewCount: true,
        ratingDistribution: true,
      },
    });

    if (products) {
      console.log(`  ✅ Product found: ${products.title}`);
      console.log(`     - averageRating: ${products.averageRating ?? 'null'}`);
      console.log(`     - reviewCount: ${products.reviewCount ?? 'null'}`);
      console.log(`     - ratingDistribution: ${products.ratingDistribution ?? 'null'}\n`);
    } else {
      console.log('  ⚠️  No products found in database\n');
    }

    // Test 5: Test relations work
    console.log('🔍 Test 5: Testing Prisma relations...');
    const reviewsWithRelations = await prisma.review.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        product: {
          select: {
            id: true,
            title: true,
          },
        },
        votes: true,
        responses: true,
      },
      take: 1,
    });

    console.log(`  ✅ Relations query successful - Found ${reviewsWithRelations.length} reviews with relations\n`);

    await prisma.$disconnect();

    console.log('='.repeat(60));
    console.log('✅ All Prisma tests passed!');
    console.log('='.repeat(60) + '\n');

    console.log('The reviews system is fully functional with Prisma.\n');
    console.log('Next steps:');
    console.log('  1. Create review API endpoints (POST /api/reviews)');
    console.log('  2. Build review submission UI components');
    console.log('  3. Add review display on product pages');
    console.log('  4. Implement review moderation (admin panel)\n');

  } catch (error) {
    console.error('\n❌ Prisma test failed:', error.message);
    console.error('\nFull error:', error);

    if (error.message.includes('Unknown arg')) {
      console.error('\n⚠️  Hint: You may need to regenerate the Prisma client:');
      console.error('   Run: bun run db:generate\n');
    }

    process.exit(1);
  }
}

testPrismaQueries();
