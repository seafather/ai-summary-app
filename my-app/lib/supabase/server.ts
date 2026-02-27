import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseAdmin: SupabaseClient | null = null;

function getOrCreateClient(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase server environment variables');
  }

  // Server-side client with service role key for bypassing RLS
  _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}

// Lazy proxy — defers client creation until the first property access at
// request time, so the module can be imported during the build without env vars.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getOrCreateClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (client as unknown as Record<string | symbol, any>)[prop];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

