/**
 * Supabase Client
 * Unified client creation for browser and server contexts
 */

import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';
import { createServerClient as createSupabaseServerClient, createBrowserClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ============================================
// TYPES
// ============================================

export type Database = {
  public: {
    Tables: {
      users: any;
      profiles: any;
      user_roles: any;
      products: any;
      // ... other tables
    };
  };
};

// ============================================
// CONFIGURATION
// ============================================

function getSupabaseConfig() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return { supabaseUrl, supabaseAnonKey, supabaseServiceKey };
}

// ============================================
// CLIENT CREATION
// ============================================

/**
 * Create Supabase client for browser use
 * Use in Client Components only
 */
export function createClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Create Supabase client for server use (Route Handlers, Server Components)
 * Handles cookies automatically
 */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createSupabaseServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );
}

/**
 * Create Supabase admin client with service role key
 * Use ONLY on server-side for admin operations
 * WARNING: This bypasses RLS policies!
 */
export function createAdminClient(): SupabaseClient<Database> {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseConfig();

  if (!supabaseServiceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
