// Quick script to test database connection and check if User table exists
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');

    // Try to count users
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected! Found ${userCount} users in the database.`);

    // Try to fetch all users (just basic info)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      take: 5
    });

    console.log('\n📋 Existing users:');
    if (users.length === 0) {
      console.log('   (No users yet - database is ready for testing!)');
    } else {
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.name || 'No name'})`);
      });
    }

    console.log('\n✅ Database is ready for testing!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database error:', error.message);

    if (error.code === 'P2021' || error.message.includes('does not exist')) {
      console.log('\n⚠️  The User table does not exist yet!');
      console.log('📝 Action required: Run the SQL migration in Supabase');
      console.log('    File: supabase-schema.sql');
      console.log('    Location: Supabase Dashboard → SQL Editor → New Query');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
