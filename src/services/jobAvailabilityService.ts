import { supabase } from '../lib/supabase';
import { Job } from '../types/database.types';

export interface CheckResult {
  status: 'active' | 'needs_review';
  reason?: string | null;
  lastChecked: string;
}

export const jobAvailabilityService = {
  /**
   * Check a single job's apply link for availability
   */
  async checkSingleJob(job: Job): Promise<CheckResult> {
    const url = job.apply_link;
    const lastChecked = new Date().toISOString();

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return {
        status: 'needs_review',
        reason: 'Invalid or missing official apply link',
        lastChecked,
      };
    }

    try {
      console.log(`[Job Checker] Fetching apply link for job: "${job.title}" at "${job.company}" -> ${url}`);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (res.status === 404) {
        console.log(`[Job Checker] 404 detected for: "${job.title}" at "${job.company}"`);
        return {
          status: 'needs_review',
          reason: '404 - Page Not Found',
          lastChecked,
        };
      }

      if (res.status >= 500) {
        // Keep active, log unable to verify
        console.log(`[Job Checker] Unable to verify (HTTP ${res.status}): "${job.title}" at "${job.company}"`);
        return {
          status: 'active',
          reason: 'Unable to verify (Server Error)',
          lastChecked,
        };
      }

      if (res.status >= 400 && res.status !== 403) {
        console.log(`[Job Checker] HTTP status ${res.status} for: "${job.title}" at "${job.company}"`);
        return {
          status: 'needs_review',
          reason: `HTTP ${res.status} - Access denied or page removed`,
          lastChecked,
        };
      }

      // Read page content (up to 200KB for indicator scan)
      const text = await res.text();
      const cleanText = text
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .toLowerCase();

      // Expired or closure indicators
      const closedIndicators = [
        'job is no longer available',
        'this job has expired',
        'job posting has expired',
        'no longer accepting applications',
        'is closed to new applications',
        'application has closed',
        'applications are closed',
        'this position is closed',
        'no longer active',
        'has been filled',
        'job is closed',
        'this job is closed',
        'no longer open',
        'posting is no longer available',
        'has expired',
        'this job opening has been filled',
        'position is no longer open',
        'application closed',
        'vacancy is closed',
        'job expired',
        'no longer accepting responses',
        'closed for applications',
        'submissions are closed'
      ];

      for (const indicator of closedIndicators) {
        if (cleanText.includes(indicator)) {
          console.log(`[Job Checker] Closure indicator found ("${indicator}") for: "${job.title}" at "${job.company}"`);
          return {
            status: 'needs_review',
            reason: `Indicator found: "${indicator}"`,
            lastChecked,
          };
        }
      }

      console.log(`[Job Checker] Active verified for: "${job.title}" at "${job.company}"`);
      return {
        status: 'active',
        reason: null,
        lastChecked,
      };
    } catch (err: any) {
      console.log(`[Job Checker] Unable to verify: "${job.title}" at "${job.company}". Details: ${err.message || err}`);
      return {
        status: 'active',
        reason: 'Unable to verify',
        lastChecked,
      };
    }
  },

  /**
   * Run availability check on all active jobs in the database
   */
  async checkAllActiveJobs(): Promise<{
    success: boolean;
    totalChecked: number;
    flaggedCount: number;
    unverifiedCount: number;
    errorsCount: number;
  }> {
    try {
      console.log('[Job Checker] Starting automatic job availability check for all active jobs...');
      
      // Fetch active jobs from Supabase
      const { data: activeJobs, error: fetchErr } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active');

      if (fetchErr) throw fetchErr;

      if (!activeJobs || activeJobs.length === 0) {
        console.log('[Job Checker] No active jobs found to monitor.');
        return {
          success: true,
          totalChecked: 0,
          flaggedCount: 0,
          unverifiedCount: 0,
          errorsCount: 0,
        };
      }

      console.log(`[Job Checker] Found ${activeJobs.length} active jobs to process.`);
      let flaggedCount = 0;
      let unverifiedCount = 0;
      let errorsCount = 0;

      for (const job of activeJobs as Job[]) {
        const result = await this.checkSingleJob(job);
        
        if (result.status === 'needs_review') {
          flaggedCount++;
        } else if (result.reason === 'Unable to verify') {
          unverifiedCount++;
        }

        // Update the job details in Supabase
        let { error: updateErr } = await supabase
          .from('jobs')
          .update({
            status: result.status,
            review_reason: result.reason,
            review_date: result.lastChecked,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job.id);

        // Fallback if columns are missing in user's database schema cache
        if (updateErr && (updateErr.message?.includes('review_date') || updateErr.message?.includes('review_reason') || updateErr.message?.includes('schema cache'))) {
          console.warn(`[Job Checker] Database schema is pending migration. Falling back to updating job status only for ID ${job.id}`);
          const fallbackRes = await supabase
            .from('jobs')
            .update({
              status: result.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
          updateErr = fallbackRes.error;
        }

        if (updateErr) {
          console.log(`[Job Checker] Update issue on job ID ${job.id}:`, updateErr.message);
          errorsCount++;
        }
      }

      console.log(`[Job Checker] Availability check complete. Checked: ${activeJobs.length}, Flagged: ${flaggedCount}, Unverified/Skipped: ${unverifiedCount}, Issues: ${errorsCount}`);
      
      return {
        success: true,
        totalChecked: activeJobs.length,
        flaggedCount,
        unverifiedCount,
        errorsCount,
      };
    } catch (err: any) {
      console.log('[Job Checker] Exception in checkAllActiveJobs:', err.message || err);
      return {
        success: false,
        totalChecked: 0,
        flaggedCount: 0,
        unverifiedCount: 0,
        errorsCount: 1,
      };
    }
  }
};
