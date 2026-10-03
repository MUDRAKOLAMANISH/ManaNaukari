import { supabase } from '../lib/supabase';
import { CandidateProfile, CandidateProfileInsert } from '../types/database.types';

export const CANDIDATE_STORAGE_KEY = 'mana_naukari_candidate_profile';

export interface StoredCandidateProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  resume_url?: string | null;
  resume_file_name?: string | null;
  applied_jobs: Record<string, string>; // jobId -> ISO timestamp of application
  updated_at: string;
}

/**
 * Normalizes email by trimming and lowercasing.
 */
export const normalizeEmail = (email?: string): string => {
  return (email || '').trim().toLowerCase();
};

/**
 * Normalizes mobile number to alphanumeric/digits.
 */
export const normalizeMobile = (phone?: string): string => {
  return (phone || '').replace(/[\s\-\+\(\)]/g, '').trim();
};

export const candidateProfileService = {
  /**
   * 1. Get stored candidate profile from localStorage for auto-prefill and recognition
   */
  getLocalProfile(): StoredCandidateProfile | null {
    try {
      if (typeof window === 'undefined') return null;
      const raw = localStorage.getItem(CANDIDATE_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.email || !parsed.name) return null;
      if (!parsed.applied_jobs || typeof parsed.applied_jobs !== 'object') {
        parsed.applied_jobs = {};
      }
      return parsed as StoredCandidateProfile;
    } catch (err) {
      console.warn('[candidateProfileService] Error reading local profile:', err);
      return null;
    }
  },

  /**
   * 2. Save or update candidate profile in localStorage
   */
  saveLocalProfile(profile: Partial<StoredCandidateProfile> & { name: string; email: string; mobile: string }): StoredCandidateProfile {
    try {
      const existing = this.getLocalProfile();
      const updated: StoredCandidateProfile = {
        id: profile.id || existing?.id || `cand_${Date.now()}`,
        name: profile.name.trim(),
        email: normalizeEmail(profile.email),
        mobile: normalizeMobile(profile.mobile),
        resume_url: profile.resume_url !== undefined ? profile.resume_url : (existing?.resume_url || null),
        resume_file_name: profile.resume_file_name !== undefined ? profile.resume_file_name : (existing?.resume_file_name || null),
        applied_jobs: {
          ...(existing?.applied_jobs || {}),
          ...(profile.applied_jobs || {}),
        },
        updated_at: new Date().toISOString(),
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem(CANDIDATE_STORAGE_KEY, JSON.stringify(updated));
      }
      return updated;
    } catch (err) {
      console.warn('[candidateProfileService] Error saving local profile:', err);
      return {
        id: profile.id || `cand_${Date.now()}`,
        name: profile.name,
        email: profile.email,
        mobile: profile.mobile,
        applied_jobs: {},
        updated_at: new Date().toISOString(),
      };
    }
  },

  /**
   * 3. Find existing candidate profile in Supabase by Email OR Mobile
   */
  async findProfileByEmailOrMobile(
    email?: string,
    mobile?: string
  ): Promise<{ data: CandidateProfile | null; error: any }> {
    const cleanEmail = normalizeEmail(email);
    const cleanMobile = normalizeMobile(mobile);

    if (!cleanEmail && !cleanMobile) {
      return { data: null, error: null };
    }

    try {
      console.log('[candidateProfileService] Searching candidate profile by email/mobile:', { cleanEmail, cleanMobile });

      // Step A: Attempt primary query on candidate_profiles table
      let candidateProfile: CandidateProfile | null = null;

      if (cleanEmail) {
        const { data: emailData, error: emailErr } = await supabase
          .from('candidate_profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!emailErr && emailData) {
          candidateProfile = emailData as CandidateProfile;
        }
      }

      if (!candidateProfile && cleanMobile) {
        const { data: mobileData, error: mobileErr } = await supabase
          .from('candidate_profiles')
          .select('*')
          .eq('mobile', cleanMobile)
          .maybeSingle();

        if (!mobileErr && mobileData) {
          candidateProfile = mobileData as CandidateProfile;
        }
      }

      if (candidateProfile) {
        console.log('[candidateProfileService] ✅ Found existing candidate_profile:', candidateProfile.name);
        return { data: candidateProfile, error: null };
      }

      // Step B: Fallback check on visitor_profiles table for backward compatibility
      if (cleanEmail) {
        const { data: visitorData, error: visitorErr } = await supabase
          .from('visitor_profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!visitorErr && visitorData) {
          console.log('[candidateProfileService] Found candidate in visitor_profiles fallback:', visitorData.name);
          return {
            data: {
              id: visitorData.id,
              name: visitorData.name,
              email: visitorData.email,
              mobile: visitorData.phone || '',
              resume_url: (visitorData as any).resume_url || null,
              resume_file_name: null,
              created_at: visitorData.created_at,
              updated_at: visitorData.created_at,
            },
            error: null,
          };
        }
      }

      if (cleanMobile) {
        const { data: visitorMobileData, error: visitorMobileErr } = await supabase
          .from('visitor_profiles')
          .select('*')
          .eq('phone', cleanMobile)
          .maybeSingle();

        if (!visitorMobileErr && visitorMobileData) {
          return {
            data: {
              id: visitorMobileData.id,
              name: visitorMobileData.name,
              email: visitorMobileData.email,
              mobile: visitorMobileData.phone || '',
              resume_url: (visitorMobileData as any).resume_url || null,
              resume_file_name: null,
              created_at: visitorMobileData.created_at,
              updated_at: visitorMobileData.created_at,
            },
            error: null,
          };
        }
      }

      return { data: null, error: null };
    } catch (err: any) {
      console.warn('[candidateProfileService] Query candidate_profiles error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 4. Create or Update Candidate Profile in Supabase & LocalStorage
   */
  async saveOrUpdateProfile(input: {
    name: string;
    email: string;
    mobile: string;
    resume_url?: string | null;
    resume_file_name?: string | null;
  }): Promise<{ data: CandidateProfile; error: any }> {
    const cleanEmail = normalizeEmail(input.email);
    const cleanMobile = normalizeMobile(input.mobile);
    const cleanName = input.name.trim();

    console.log('[candidateProfileService.saveOrUpdateProfile] Saving profile:', { cleanName, cleanEmail, cleanMobile });

    try {
      // Step A: Check if profile already exists in candidate_profiles
      const { data: existing } = await this.findProfileByEmailOrMobile(cleanEmail, cleanMobile);

      let savedCandidate: CandidateProfile | null = null;

      if (existing?.id) {
        console.log('[candidateProfileService] Updating existing candidate profile:', existing.id);
        const updatePayload: any = {
          name: cleanName,
          mobile: cleanMobile,
          email: cleanEmail,
          updated_at: new Date().toISOString(),
        };
        if (input.resume_url !== undefined) updatePayload.resume_url = input.resume_url;
        if (input.resume_file_name !== undefined) updatePayload.resume_file_name = input.resume_file_name;

        // Try candidate_profiles table update
        const { data: updated, error: updateErr } = await supabase
          .from('candidate_profiles')
          .update(updatePayload)
          .eq('id', existing.id)
          .select()
          .maybeSingle();

        if (!updateErr && updated) {
          savedCandidate = updated as CandidateProfile;
        } else {
          // Fallback to visitor_profiles update
          await supabase
            .from('visitor_profiles')
            .update({
              name: cleanName,
              phone: cleanMobile,
              email: cleanEmail,
              resume_url: input.resume_url || undefined,
            })
            .eq('id', existing.id);

          savedCandidate = {
            id: existing.id,
            name: cleanName,
            email: cleanEmail,
            mobile: cleanMobile,
            resume_url: input.resume_url !== undefined ? input.resume_url : existing.resume_url,
            resume_file_name: input.resume_file_name !== undefined ? input.resume_file_name : existing.resume_file_name,
            created_at: existing.created_at,
            updated_at: new Date().toISOString(),
          };
        }
      } else {
        // Step B: Insert brand new profile in candidate_profiles
        console.log('[candidateProfileService] Creating brand new candidate profile');
        const insertPayload: CandidateProfileInsert = {
          name: cleanName,
          email: cleanEmail,
          mobile: cleanMobile,
          resume_url: input.resume_url || null,
          resume_file_name: input.resume_file_name || null,
          updated_at: new Date().toISOString(),
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('candidate_profiles')
          .insert(insertPayload)
          .select()
          .maybeSingle();

        if (!insertErr && inserted) {
          savedCandidate = inserted as CandidateProfile;
        } else {
          console.warn('[candidateProfileService] candidate_profiles insert warning, running visitor_profiles fallback:', insertErr?.message);
          // Dual-insert into visitor_profiles for fallback
          const { data: visitorIns } = await supabase
            .from('visitor_profiles')
            .insert({
              name: cleanName,
              email: cleanEmail,
              phone: cleanMobile,
              resume_url: input.resume_url || null,
            })
            .select()
            .maybeSingle();

          savedCandidate = {
            id: visitorIns?.id || `cand_${Date.now()}`,
            name: cleanName,
            email: cleanEmail,
            mobile: cleanMobile,
            resume_url: input.resume_url || null,
            resume_file_name: input.resume_file_name || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
      }

      // Also ensure visitor_profiles has a synchronized record so legacy foreign keys work
      if (savedCandidate?.id) {
        try {
          await supabase.from('visitor_profiles').upsert({
            id: savedCandidate.id,
            name: savedCandidate.name,
            email: savedCandidate.email,
            phone: savedCandidate.mobile,
            resume_url: savedCandidate.resume_url,
          });
        } catch {
          // ignore secondary sync warning
        }
      }

      // Step C: Update localStorage
      if (savedCandidate) {
        this.saveLocalProfile({
          id: savedCandidate.id,
          name: savedCandidate.name,
          email: savedCandidate.email,
          mobile: savedCandidate.mobile,
          resume_url: savedCandidate.resume_url,
          resume_file_name: savedCandidate.resume_file_name,
        });
      }

      return { data: savedCandidate!, error: null };
    } catch (err: any) {
      console.error('[candidateProfileService] saveOrUpdateProfile exception:', err);
      // Ensure local storage is at least populated so candidate does not get blocked
      const fallbackLocal = this.saveLocalProfile({
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
        resume_url: input.resume_url,
        resume_file_name: input.resume_file_name,
      });

      return {
        data: {
          id: fallbackLocal.id,
          name: fallbackLocal.name,
          email: fallbackLocal.email,
          mobile: fallbackLocal.mobile,
          resume_url: fallbackLocal.resume_url,
          resume_file_name: fallbackLocal.resume_file_name,
          created_at: fallbackLocal.updated_at,
          updated_at: fallbackLocal.updated_at,
        },
        error: null,
      };
    }
  },

  /**
   * 5. Check if Candidate has already applied to this specific job
   * (Enforces Duplicate Application Prevention)
   */
  async checkJobApplication(
    jobId: string,
    profileId?: string,
    email?: string,
    mobile?: string
  ): Promise<{ hasApplied: boolean; appliedAt?: string }> {
    if (!jobId) return { hasApplied: false };

    // 1. Check LocalStorage Cache
    const local = this.getLocalProfile();
    if (local?.applied_jobs && local.applied_jobs[jobId]) {
      return {
        hasApplied: true,
        appliedAt: local.applied_jobs[jobId],
      };
    }

    const targetProfileId = profileId || local?.id;
    const targetEmail = normalizeEmail(email || local?.email);
    const targetMobile = normalizeMobile(mobile || local?.mobile);

    // 2. Query Supabase Applicants Table
    try {
      if (targetProfileId) {
        // Query by visitor_id first (guaranteed standard column)
        const { data: appData, error: appErr } = await supabase
          .from('applicants')
          .select('id, created_at')
          .eq('job_id', jobId)
          .eq('visitor_id', targetProfileId)
          .limit(1)
          .maybeSingle();

        if (!appErr && appData) {
          const appliedDate = appData.created_at || new Date().toISOString();
          // Update local cache
          if (local) {
            this.markJobAsApplied(jobId, appliedDate);
          }
          return { hasApplied: true, appliedAt: appliedDate };
        }
      }

      // Check by candidate_profile_id if distinct from visitor_id (safely caught)
      if (targetProfileId) {
        try {
          const { data: candAppData } = await (supabase as any)
            .from('applicants')
            .select('id, created_at')
            .eq('job_id', jobId)
            .eq('candidate_profile_id', targetProfileId)
            .limit(1)
            .maybeSingle();

          if (candAppData) {
            const appliedDate = candAppData.created_at || new Date().toISOString();
            if (local) {
              this.markJobAsApplied(jobId, appliedDate);
            }
            return { hasApplied: true, appliedAt: appliedDate };
          }
        } catch {
          // ignore column missing
        }
      }

      // If no ID match, check by joined visitor email if available
      if (targetEmail) {
        try {
          const { data: emailAppData } = await supabase
            .from('applicants')
            .select('id, created_at, visitor:visitor_profiles!inner(email)')
            .eq('job_id', jobId)
            .ilike('visitor.email', targetEmail)
            .limit(1)
            .maybeSingle();

          if (emailAppData) {
            const appliedDate = emailAppData.created_at || new Date().toISOString();
            if (local) {
              this.markJobAsApplied(jobId, appliedDate);
            }
            return { hasApplied: true, appliedAt: appliedDate };
          }
        } catch {
          // ignore query error
        }
      }

      return { hasApplied: false };
    } catch (err) {
      console.warn('[candidateProfileService] checkJobApplication query warning:', err);
      return { hasApplied: false };
    }
  },

  /**
   * 6. Record Application with Deduplication Guarantee
   * Prevents same candidate from applying twice to the same job.
   */
  async recordApplication(payload: {
    jobId: string;
    candidateProfile: CandidateProfile;
    notes?: string;
  }): Promise<{
    data: any;
    hasAppliedBefore?: boolean;
    appliedAt?: string;
    error: any;
  }> {
    const { jobId, candidateProfile, notes } = payload;
    console.log('[candidateProfileService.recordApplication] Starting application check for job:', jobId, 'Candidate:', candidateProfile.name);

    // Step 1: Pre-flight Deduplication check
    const existingCheck = await this.checkJobApplication(
      jobId,
      candidateProfile.id,
      candidateProfile.email,
      candidateProfile.mobile
    );

    if (existingCheck.hasApplied) {
      console.warn('[candidateProfileService] Duplicate application prevented! Already applied on:', existingCheck.appliedAt);
      return {
        data: null,
        hasAppliedBefore: true,
        appliedAt: existingCheck.appliedAt,
        error: new Error('You have already applied for this job.'),
      };
    }

    // Step 2: Insert into applicants table with safe column handling
    const nowIso = new Date().toISOString();
    try {
      // 1. Prepare base payload using guaranteed columns of applicants table
      const basePayload: any = {
        job_id: jobId,
        visitor_id: candidateProfile.id,
        resume_url: candidateProfile.resume_url || null,
        status: 'New',
        notes: notes || null,
      };

      // Try inserting with candidate_profile_id first
      let { data, error } = await supabase
        .from('applicants')
        .insert({
          ...basePayload,
          candidate_profile_id: candidateProfile.id,
        })
        .select()
        .maybeSingle();

      // If candidate_profile_id column does not exist (PGRST204 or 42703), retry with verified base columns
      if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('candidate_profile_id'))) {
        console.warn('[candidateProfileService] Retrying insert with verified base applicants columns:', error.message);
        const retryRes = await supabase
          .from('applicants')
          .insert(basePayload)
          .select()
          .maybeSingle();
        data = retryRes.data;
        error = retryRes.error;
      }

      // Minimal fallback (only visitor_id and job_id) if schema has strict legacy structure
      if (error && (error.code === 'PGRST204' || error.code === '42703')) {
        console.warn('[candidateProfileService] Retrying insert with minimal (visitor_id, job_id) columns:', error.message);
        const minRes = await supabase
          .from('applicants')
          .insert({
            visitor_id: candidateProfile.id,
            job_id: jobId,
          })
          .select()
          .maybeSingle();
        data = minRes.data;
        error = minRes.error;
      }

      if (error) {
        // Postgres error code 23505 = unique_violation (idx_applicants_job_candidate_unique)
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          console.warn('[candidateProfileService] Unique constraint violation prevented duplicate application:', error.message);
          this.markJobAsApplied(jobId, nowIso);
          return {
            data: null,
            hasAppliedBefore: true,
            appliedAt: nowIso,
            error: new Error('You have already applied for this job.'),
          };
        }
        console.error('[candidateProfileService] Error recording applicant:', error);
        return { data: null, error };
      }

      console.log('[candidateProfileService] ✅ Application recorded successfully in Supabase:', data);

      // Step 3: Record in local cache
      this.markJobAsApplied(jobId, nowIso);

      return { data, hasAppliedBefore: false, appliedAt: nowIso, error: null };
    } catch (err: any) {
      console.error('[candidateProfileService] recordApplication exception:', err);
      // If error indicates duplicate unique key
      if (err.code === '23505' || String(err.message).includes('duplicate') || String(err.message).includes('unique')) {
        this.markJobAsApplied(jobId, nowIso);
        return {
          data: null,
          hasAppliedBefore: true,
          appliedAt: nowIso,
          error: new Error('You have already applied for this job.'),
        };
      }
      return { data: null, error: err };
    }
  },

  /**
   * 7. Update candidate's resume (file upload or replacement)
   */
  async updateResume(
    candidateProfileId: string,
    resumeUrl: string,
    fileName: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      console.log('[candidateProfileService.updateResume] Updating resume for candidate:', candidateProfileId, fileName);

      // Update in Supabase candidate_profiles
      await supabase
        .from('candidate_profiles')
        .update({
          resume_url: resumeUrl,
          resume_file_name: fileName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidateProfileId);

      // Also sync visitor_profiles
      await supabase
        .from('visitor_profiles')
        .update({
          resume_url: resumeUrl,
        })
        .eq('id', candidateProfileId);

      // Update in localStorage
      const local = this.getLocalProfile();
      if (local) {
        local.resume_url = resumeUrl;
        local.resume_file_name = fileName;
        local.updated_at = new Date().toISOString();
        if (typeof window !== 'undefined') {
          localStorage.setItem(CANDIDATE_STORAGE_KEY, JSON.stringify(local));
        }
      }

      return { success: true, error: null };
    } catch (err: any) {
      console.error('[candidateProfileService] updateResume exception:', err);
      return { success: false, error: err };
    }
  },

  /**
   * 8. Mark job as applied in local storage
   */
  markJobAsApplied(jobId: string, appliedAt: string = new Date().toISOString()): void {
    try {
      const local = this.getLocalProfile();
      if (local) {
        if (!local.applied_jobs) local.applied_jobs = {};
        local.applied_jobs[jobId] = appliedAt;
        if (typeof window !== 'undefined') {
          localStorage.setItem(CANDIDATE_STORAGE_KEY, JSON.stringify(local));
        }
      }
    } catch (e) {
      console.warn('[candidateProfileService] Error marking job as applied:', e);
    }
  },

  /**
   * 9. Record Reapply on Existing Application Record
   * Maintains one application record per (candidate_profile_id, job_id).
   * Does NOT insert duplicate rows. Updates last_reapplied_at and increments attempt_count.
   */
  async recordReapply(payload: {
    jobId: string;
    candidateProfileId: string;
    candidateEmail?: string;
  }): Promise<{
    success: boolean;
    lastReappliedAt: string;
    attemptCount: number;
    error: any;
  }> {
    const { jobId, candidateProfileId } = payload;
    const nowIso = new Date().toISOString();
    console.log('[candidateProfileService.recordReapply] Executing reapply for Job:', jobId, 'Candidate:', candidateProfileId);

    try {
      let existingAppId: string | null = null;
      let nextAttemptCount = 2;

      // 1. Locate existing applicant record
      const { data: appData } = await (supabase as any)
        .from('applicants')
        .select('id, attempt_count')
        .eq('job_id', jobId)
        .eq('visitor_id', candidateProfileId)
        .limit(1)
        .maybeSingle();

      if (appData) {
        existingAppId = (appData as any).id;
        const currentCount = (appData as any).attempt_count;
        nextAttemptCount = typeof currentCount === 'number' ? currentCount + 1 : 2;
      } else {
        try {
          const { data: candData } = await (supabase as any)
            .from('applicants')
            .select('id, attempt_count')
            .eq('job_id', jobId)
            .eq('candidate_profile_id', candidateProfileId)
            .limit(1)
            .maybeSingle();
          if (candData) {
            existingAppId = candData.id;
            const currentCount = candData.attempt_count;
            nextAttemptCount = typeof currentCount === 'number' ? currentCount + 1 : 2;
          }
        } catch {}
      }

      if (existingAppId) {
        // Update existing record: attempt_count + last_reapplied_at
        try {
          const { error: updErr } = await (supabase as any)
            .from('applicants')
            .update({
              last_reapplied_at: nowIso,
              attempt_count: nextAttemptCount,
              updated_at: nowIso,
            })
            .eq('id', existingAppId);

          if (updErr && (updErr.code === 'PGRST204' || updErr.code === '42703')) {
            // Fallback to updated_at if new columns not yet in schema cache
            await supabase
              .from('applicants')
              .update({ updated_at: nowIso })
              .eq('id', existingAppId);
          }
        } catch {
          await supabase
            .from('applicants')
            .update({ updated_at: nowIso })
            .eq('id', existingAppId);
        }
      }

      // Update local storage
      this.markJobAsApplied(jobId, nowIso);

      return {
        success: true,
        lastReappliedAt: nowIso,
        attemptCount: nextAttemptCount,
        error: null,
      };
    } catch (err: any) {
      console.warn('[candidateProfileService.recordReapply] Error:', err);
      this.markJobAsApplied(jobId, nowIso);
      return {
        success: true,
        lastReappliedAt: nowIso,
        attemptCount: 2,
        error: null,
      };
    }
  },
};
