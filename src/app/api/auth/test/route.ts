import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    // Test database connection
    const userCount = await db.user.count();

    // Test user fetch
    const testUser = await db.user.findUnique({
      where: { email: 'test@sequencehub.com' },
      include: {
        roles: true,
        profile: true,
      }
    });

    if (!testUser) {
      return NextResponse.json({
        success: false,
        error: 'Test user not found'
      });
    }

    // Test password verification
    const passwordValid = await bcrypt.compare('test123', testUser.passwordHash);

    return NextResponse.json({
      success: true,
      userCount,
      testUser: {
        email: testUser.email,
        name: testUser.name,
        hasPassword: !!testUser.passwordHash,
        passwordValid,
        rolesCount: testUser.roles.length,
        hasProfile: !!testUser.profile
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
