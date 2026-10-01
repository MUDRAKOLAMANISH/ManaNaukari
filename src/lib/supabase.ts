import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Production defaults verified against live PostgreSQL instance
export const SUPABASE_PROD_URL = 'https://wasiyzakmkrmbxohzfwg.supabase.co';
export const SUPABASE_PROD_ANON_KEY = 'sb_publishable_I0QWuGZ7JNjTbG_aJm-Yeg_bCEKOxf1';

// Retrieve credentials from Vite client environment or Node process, with reliable production defaults
const rawUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_URL) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_URL) ||
  SUPABASE_PROD_URL;

const rawKey =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) ||
  (typeof process !== 'undefined' && process.env && process.env.VITE_SUPABASE_ANON_KEY) ||
  SUPABASE_PROD_ANON_KEY;

// Clean up whitespace or accidental quotes
const supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');
const supabaseAnonKey = rawKey.trim().replace(/^["']|["']$/g, '');

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

// Diagnostic helper: Mask secrets for safe logging
export function getMaskedSupabaseKey(key: string): string {
  if (!key) return '(missing)';
  if (key.length <= 16) return '****';
  return `${key.slice(0, 15)}...${key.slice(-6)}`;
}

// Log connection status during startup
console.log(
  `[Mana Naukari] 🔌 Supabase initialized. Endpoint: ${supabaseUrl} | Key: ${getMaskedSupabaseKey(
    supabaseAnonKey
  )}`
);

// Create a single Supabase client for interacting with the database
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Diagnostic utility to test the live connection against the `jobs` table
 */
export async function testSupabaseConnection(): Promise<{
  success: boolean;
  url: string;
  maskedKey: string;
  statusCode?: number;
  rowCount?: number;
  sampleJobTitle?: string;
  error?: string;
}> {
  const maskedKey = getMaskedSupabaseKey(supabaseAnonKey);
  try {
    const { data, error, status } = await supabase
      .from('jobs')
      .select('*')
      .limit(1);

    if (error) {
      return {
        success: false,
        url: supabaseUrl,
        maskedKey,
        statusCode: status,
        error: error.message || error.details || 'Supabase query error',
      };
    }

    return {
      success: true,
      url: supabaseUrl,
      maskedKey,
      statusCode: status,
      rowCount: data?.length || 0,
      sampleJobTitle: data?.[0]?.title || 'No jobs returned',
    };
  } catch (err: any) {
    return {
      success: false,
      url: supabaseUrl,
      maskedKey,
      error: err?.message || 'Network exception connecting to Supabase',
    };
  }
}
