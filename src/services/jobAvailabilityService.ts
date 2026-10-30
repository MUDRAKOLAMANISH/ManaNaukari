import { supabase } from '../lib/supabase';
import { Job } from '../types/database.types';
import { verifyJobAvailability, VerificationResult } from './jobVerificationEngine';

export interface FlaggedJobDetail {
  id: string;
  title: string;
  company: string;
  apply_link: string;
  status: string; // 'closed' | 'needs_review' | 'expired' | 'OPEN' | etc
  reason: string;
  confidence: string;
  evidenceSummary?: string;
  finalUrl?: string;
}

export interface BatchCheckSummary {
  success: boolean;
  totalChecked: number;
  openCount: number;
  closedCount: number;
  needsReviewCount: number;
  unverifiedCount: number;
  errorsCount: number;
  flaggedJobs?: FlaggedJobDetail[];
}

export const jobAvailabilityService = {
  /**
   * Run multi-stage verification on a single job object
   */
  async checkSingleJob(job: Job): Promise<VerificationResult> {
    return await verifyJobAvailability({
      id: job.id,
      title: job.title,
      company: job.company,
      apply_link: job.apply_link,
      posted_date: job.posted_date,
      expiry_date: job.expiry_date,
      status: job.status,
    });
  },

  /**
   * Verify and update a single job by ID in Supabase
   */
  async checkAndUpdateJobById(jobId: string): Promise<{ success: boolean; result?: VerificationResult; error?: string }> {
    try {
      const { data: job, error: fetchErr } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (fetchErr || !job) {
        return { success: false, error: fetchErr?.message || 'Job not found in database.' };
      }

      const result = await this.checkSingleJob(job as Job);

      const nowIso = new Date().toISOString();

      // Persist update in Supabase with schema fallbacks
      const updatePayload: any = {
        status: result.dbStatus,
        review_reason: result.reason,
        review_date: nowIso,
        verification_confidence: result.confidence,
        verification_evidence: result.evidence.evidenceSummary,
        final_url: result.evidence.finalUrl,
        updated_at: nowIso,
      };

      let { error: updateErr } = await supabase
        .from('jobs')
        .update(updatePayload)
        .eq('id', jobId);

      // Fallback 1: If extended verification columns missing
      if (updateErr) {
        console.warn(`[Job Checker] Primary column update failed for ID ${jobId}. Trying standard review columns... (${updateErr.message})`);
        const fallbackRes1 = await supabase
          .from('jobs')
          .update({
            status: result.dbStatus,
            review_reason: result.reason,
            review_date: nowIso,
            updated_at: nowIso,
          })
          .eq('id', jobId);
        updateErr = fallbackRes1.error;
      }

      // Fallback 2: If review_date / review_reason missing
      if (updateErr) {
        console.warn(`[Job Checker] Review columns missing for ID ${jobId}. Fallback to basic status & updated_at... (${updateErr.message})`);
        const fallbackRes2 = await supabase
          .from('jobs')
          .update({
            status: result.dbStatus,
            updated_at: nowIso,
          })
          .eq('id', jobId);
        updateErr = fallbackRes2.error;
      }

      // Fallback 3: If 'needs_review' or 'closed' restricted by check constraint
      if (updateErr && (updateErr.message?.includes('check constraint') || updateErr.message?.includes('jobs_status_check'))) {
        console.warn(`[Job Checker] Status constraint triggered. Retrying update with status 'expired' for ID ${jobId}`);
        const constraintFallback = await supabase
          .from('jobs')
          .update({
            status: 'expired',
            updated_at: nowIso,
          })
          .eq('id', jobId);
        updateErr = constraintFallback.error;
      }

      if (updateErr) {
        return { success: false, error: updateErr.message, result };
      }

      return { success: true, result };
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification exception' };
    }
  },

  /**
   * Run availability check pipeline on all active jobs in the database
   */
  async checkAllActiveJobs(): Promise<BatchCheckSummary> {
    try {
      console.log('[Job Checker Engine] Initiating automated availability audit for active postings...');
      
      const { data: activeJobs, error: fetchErr } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active');

      if (fetchErr) throw fetchErr;

      if (!activeJobs || activeJobs.length === 0) {
        console.log('[Job Checker Engine] No active jobs found to audit.');
        return {
          success: true,
          totalChecked: 0,
          openCount: 0,
          closedCount: 0,
          needsReviewCount: 0,
          unverifiedCount: 0,
          errorsCount: 0,
        };
      }

      console.log(`[Job Checker Engine] Auditing ${activeJobs.length} active jobs in parallel batches...`);

      let openCount = 0;
      let closedCount = 0;
      let needsReviewCount = 0;
      let unverifiedCount = 0;
      let errorsCount = 0;

      const flaggedJobs: FlaggedJobDetail[] = [];

      const results: { success: boolean; result: VerificationResult; job: Job }[] = [];
      const batchSize = 5;

      for (let i = 0; i < activeJobs.length; i += batchSize) {
        const batch = activeJobs.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          (batch as Job[]).map(async (job) => {
            try {
              const res = await this.checkAndUpdateJobById(job.id);
              if (res.success && res.result) {
                return { success: true, result: res.result, job };
              } else {
                return {
                  success: false,
                  result: await this.checkSingleJob(job),
                  job,
                };
              }
            } catch (err) {
              return {
                success: false,
                result: await this.checkSingleJob(job),
                job,
              };
            }
          })
        );
        results.push(...batchResults);
      }

      results.forEach(({ success, result, job }) => {
        if (!success) errorsCount++;
        if (result.status === 'OPEN') {
          openCount++;
        } else {
          if (result.status === 'CLOSED' || result.status === 'EXPIRED') closedCount++;
          else if (result.status === 'NEEDS_REVIEW') needsReviewCount++;
          else if (result.status === 'UNVERIFIED') unverifiedCount++;

          flaggedJobs.push({
            id: job.id,
            title: job.title,
            company: job.company,
            apply_link: job.apply_link,
            status: result.dbStatus || (result.status === 'CLOSED' ? 'closed' : result.status === 'EXPIRED' ? 'expired' : 'needs_review'),
            reason: result.reason,
            confidence: result.confidence,
            evidenceSummary: result.evidence.evidenceSummary,
            finalUrl: result.evidence.finalUrl,
          });
        }
      });

      console.log(
        `[Job Checker Engine] Audit complete. Total: ${activeJobs.length}, Open: ${openCount}, Closed: ${closedCount}, Needs Review: ${needsReviewCount}, Unverified: ${unverifiedCount}, Issues: ${errorsCount}, Flagged: ${flaggedJobs.length}`
      );

      return {
        success: true,
        totalChecked: activeJobs.length,
        openCount,
        closedCount,
        needsReviewCount,
        unverifiedCount,
        errorsCount,
        flaggedJobs,
      };
    } catch (err: any) {
      console.error('[Job Checker Engine] Batch check exception:', err.message || err);
      return {
        success: false,
        totalChecked: 0,
        openCount: 0,
        closedCount: 0,
        needsReviewCount: 0,
        unverifiedCount: 0,
        errorsCount: 1,
      };
    }
  },
};
