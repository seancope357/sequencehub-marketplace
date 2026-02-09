// Verify authentication test results in database
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyAuthTest() {
  try {
    console.log('🔍 Verifying authentication test results...\n');

    // 1. Check all users
    console.log('📊 All Users:');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        roles: {
          select: {
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    users.forEach((user, index) => {
      const roles = user.roles.map(r => r.role).join(', ');
      console.log(`   ${index + 1}. ${user.email}`);
      console.log(`      Name: ${user.name || '(no name)'}`);
      console.log(`      Roles: ${roles}`);
      console.log(`      Verified: ${user.emailVerified}`);
      console.log(`      Created: ${user.createdAt.toLocaleString()}`);
      console.log('');
    });

    // 2. Check test user specifically
    console.log('🎯 Test User Details:');
    const testUser = await prisma.user.findUnique({
      where: { email: 'testuser2@example.com' },
      include: {
        roles: true,
        profile: true
      }
    });

    if (testUser) {
      console.log(`   ✅ Found: ${testUser.email}`);
      console.log(`   ID: ${testUser.id}`);
      console.log(`   Password Hash: ${testUser.passwordHash.substring(0, 20)}...`);
      console.log(`   Roles: ${testUser.roles.map(r => r.role).join(', ')}`);
      console.log(`   Has Profile: ${testUser.profile ? 'Yes' : 'No'}`);
    } else {
      console.log('   ❌ Test user not found!');
    }

    // 3. Check audit logs for test user
    console.log('\n📝 Recent Audit Logs:');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        userId: testUser?.id
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        action: true,
        entityType: true,
        ipAddress: true,
        createdAt: true
      }
    });

    if (auditLogs.length > 0) {
      auditLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. ${log.action}`);
        console.log(`      Type: ${log.entityType || 'N/A'}`);
        console.log(`      IP: ${log.ipAddress || 'N/A'}`);
        console.log(`      Time: ${log.createdAt.toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('   ⚠️  No audit logs found for test user');
    }

    // 4. Summary
    console.log('✅ VERIFICATION COMPLETE');
    console.log(`   Total users: ${users.length}`);
    console.log(`   Test user exists: ${testUser ? 'YES' : 'NO'}`);
    console.log(`   Audit logs: ${auditLogs.length} entries`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAuthTest();
