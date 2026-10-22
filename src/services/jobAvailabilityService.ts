import { supabase } from '../lib/supabase';
import { Job } from '../types/database.types';
import { verifyJobAvailability, VerificationResult } from './jobVerificationEngine';

export interface BatchCheckSummary {
  success: boolean;
  totalChecked: number;
  openCount: number;
  closedCount: number;
  needsReviewCount: number;
  unverifiedCount: number;
  errorsCount: number;
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

      // Persist update in Supabase with schema fallbacks
      const updatePayload: any = {
        status: result.dbStatus,
        review_reason: result.reason,
        review_date: result.lastChecked,
        verification_confidence: result.confidence,
        verification_evidence: result.evidence.evidenceSummary,
        final_url: result.evidence.finalUrl,
        updated_at: new Date().toISOString(),
      };

      let { error: updateErr } = await supabase
        .from('jobs')
        .update(updatePayload)
        .eq('id', jobId);

      // Fallback 1: If new columns missing, retry with basic review columns
      if (updateErr && (
        updateErr.message?.includes('verification_confidence') ||
        updateErr.message?.includes('verification_evidence') ||
        updateErr.message?.includes('final_url') ||
        updateErr.message?.includes('schema cache')
      )) {
        console.warn(`[Job Checker] Optional verification columns missing in DB. Retrying with standard review columns for ID ${jobId}`);
        const fallbackRes = await supabase
          .from('jobs')
          .update({
            status: result.dbStatus,
            review_reason: result.reason,
            review_date: result.lastChecked,
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);
        updateErr = fallbackRes.error;
      }

      // Fallback 2: If 'needs_review' restricted by constraint
      if (updateErr && (updateErr.message?.includes('check constraint') || updateErr.message?.includes('jobs_status_check'))) {
        console.warn(`[Job Checker] Status constraint triggered. Retrying update with status 'expired' for ID ${jobId}`);
        const constraintFallback = await supabase
          .from('jobs')
          .update({
            status: 'expired',
            review_reason: result.reason,
            review_date: result.lastChecked,
            updated_at: new Date().toISOString(),
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

      const results: { success: boolean; result: VerificationResult }[] = [];
      const batchSize = 5;

      for (let i = 0; i < activeJobs.length; i += batchSize) {
        const batch = activeJobs.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          (batch as Job[]).map(async (job) => {
            try {
              const res = await this.checkAndUpdateJobById(job.id);
              if (res.success && res.result) {
                return { success: true, result: res.result };
              } else {
                return {
                  success: false,
                  result: await this.checkSingleJob(job),
                };
              }
            } catch (err) {
              return {
                success: false,
                result: await this.checkSingleJob(job),
              };
            }
          })
        );
        results.push(...batchResults);
      }

      results.forEach(({ success, result }) => {
        if (!success) errorsCount++;
        if (result.status === 'OPEN') openCount++;
        else if (result.status === 'CLOSED' || result.status === 'EXPIRED') closedCount++;
        else if (result.status === 'NEEDS_REVIEW') needsReviewCount++;
        else if (result.status === 'UNVERIFIED') unverifiedCount++;
      });

      console.log(
        `[Job Checker Engine] Audit complete. Total: ${activeJobs.length}, Open: ${openCount}, Closed: ${closedCount}, Needs Review: ${needsReviewCount}, Unverified: ${unverifiedCount}, Issues: ${errorsCount}`
      );

      return {
        success: true,
        totalChecked: activeJobs.length,
        openCount,
        closedCount,
        needsReviewCount,
        unverifiedCount,
        errorsCount,
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
