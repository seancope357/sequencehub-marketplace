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
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, any>) {
          cookieChanges.push({ name, value, options });
        },
        remove(name: string, options: Record<string, any>) {
          cookieChanges.push({ name, value: '', options });
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
