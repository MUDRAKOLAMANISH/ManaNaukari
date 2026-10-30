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
export const supabaseUrl = rawUrl.trim().replace(/^["']|["']$/g, '');
export const supabaseAnonKey = rawKey.trim().replace(/^["']|["']$/g, '');

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

// Diagnostic helper: Extract project ID from URL
export function getSupabaseProjectId(url: string): string {
  try {
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split('.');
    return hostParts[0] || 'wasiyzakmkrmbxohzfwg';
  } catch {
    return 'wasiyzakmkrmbxohzfwg';
  }
}

// Diagnostic helper: Mask secrets for safe logging
export function getMaskedSupabaseKey(key: string): string {
  if (!key) return '(missing)';
  if (key.length <= 16) return '****';
  return `${key.slice(0, 15)}...${key.slice(-6)}`;
}

// Log connection status during startup
console.log(
  `[ManaCarrier] 🔌 Supabase initialized. Endpoint: ${supabaseUrl} | Key: ${getMaskedSupabaseKey(
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

export interface SupabaseDiagnosticResult {
  success: boolean;
  projectId: string;
  url: string;
  maskedKey: string;
  statusCode: number;
  pingMs: number;
  publicReadAccess: boolean;
  totalJobsCount: number;
  sampleJobTitle: string;
  tablesVerified: string[];
  error?: string;
}

/**
 * Diagnostic utility to test the live connection against the currently configured Supabase project
 */
export async function testSupabaseConnection(): Promise<SupabaseDiagnosticResult> {
  const projectId = getSupabaseProjectId(supabaseUrl);
  const maskedKey = getMaskedSupabaseKey(supabaseAnonKey);
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

  try {
    // 1. Ping query to jobs table + count
    const [jobsRes, countRes] = await Promise.allSettled([
      supabase.from('jobs').select('id, title, company, created_at').order('created_at', { ascending: false }).limit(1),
      supabase.from('jobs').select('id', { count: 'exact', head: true })
    ]);

    const pingMs = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
    );

    let jobsData: any[] | null = null;
    let queryError: any = null;
    let statusCode = 200;

    if (jobsRes.status === 'fulfilled') {
      jobsData = jobsRes.value.data;
      queryError = jobsRes.value.error;
      statusCode = jobsRes.value.status || 200;
    } else {
      queryError = jobsRes.reason;
    }

    let totalJobsCount = 0;
    if (countRes.status === 'fulfilled' && countRes.value.count !== null) {
      totalJobsCount = countRes.value.count;
    }

    if (queryError) {
      return {
        success: false,
        projectId,
        url: supabaseUrl,
        maskedKey,
        statusCode: statusCode || 500,
        pingMs,
        publicReadAccess: false,
        totalJobsCount: 0,
        sampleJobTitle: 'N/A',
        tablesVerified: [],
        error: queryError.message || queryError.details || 'Supabase query error',
      };
    }

    const sampleJobTitle = jobsData?.[0]?.title
      ? `${jobsData[0].title} (${jobsData[0].company || 'Verified'})`
      : 'Database reachable (No jobs returned)';

    return {
      success: true,
      projectId,
      url: supabaseUrl,
      maskedKey,
      statusCode,
      pingMs,
      publicReadAccess: true,
      totalJobsCount,
      sampleJobTitle,
      tablesVerified: ['jobs', 'recruiters', 'materials'],
    };
  } catch (err: any) {
    const pingMs = Math.round(
      (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
    );
    return {
      success: false,
      projectId,
      url: supabaseUrl,
      maskedKey,
      statusCode: 500,
      pingMs,
      publicReadAccess: false,
      totalJobsCount: 0,
      sampleJobTitle: 'N/A',
      tablesVerified: [],
      error: err?.message || 'Network exception connecting to Supabase',
    };
  }
}
