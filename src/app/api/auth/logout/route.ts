import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/supabase/auth';
import { createRouteHandlerClient, applyCookieChanges } from '@/lib/supabase/route-handler';

export async function POST(request: NextRequest) {
  try {
    const { supabase, cookieChanges } = createRouteHandlerClient(request);
    const { data } = await supabase.auth.getUser();

    const { error } = await supabase.auth.signOut();
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (data.user) {
      await createAuditLog({
        userId: data.user.id,
        action: 'USER_LOGOUT',
        entityType: 'user',
        entityId: data.user.id,
      });
    }

    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
    applyCookieChanges(response, cookieChanges);
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
