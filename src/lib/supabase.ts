import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve credentials from Vite client environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

if (!isSupabaseConfigured) {
  console.info(
    '[Mana Naukari] Supabase credentials not found or incomplete. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment to connect directly to your PostgreSQL database.'
  );
}

// Create a single Supabase client for interacting with the database
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
