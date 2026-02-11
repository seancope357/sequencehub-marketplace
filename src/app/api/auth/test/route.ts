import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin authentication
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

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
    console.error('Error in auth test endpoint:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      // Stack traces only in development
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    }, { status: 500 });
  }
}
