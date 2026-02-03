import 'server-only';

import type { NextRequest, NextResponse } from 'next/server';
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';

type CookieChange = {
  name: string;
  value: string;
  options?: Record<string, any>;
};

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function createRouteHandlerClient(request: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieChanges: CookieChange[] = [];

  const supabase = createSupabaseServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll(cookiesToSet) {
          for (const cookie of cookiesToSet) {
            cookieChanges.push({
              name: cookie.name,
              value: cookie.value,
              options: cookie.options,
            });
          }
        },
      },
    }
  );

  return { supabase, cookieChanges };
}

export function applyCookieChanges(
  response: NextResponse,
  cookieChanges: CookieChange[]
) {
  for (const change of cookieChanges) {
    response.cookies.set({
      name: change.name,
      value: change.value,
      ...change.options,
    });
  }
}
