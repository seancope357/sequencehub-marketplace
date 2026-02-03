import { NextRequest, NextResponse } from 'next/server';
import { logoutUser } from '@/lib/supabase/auth';

export async function POST(request: NextRequest) {
  try {
    const { error } = await logoutUser();
    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
