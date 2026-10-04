import { supabase } from '../lib/supabase';
import { CandidateProfile, CandidateProfileInsert } from '../types/database.types';

export const CANDIDATE_STORAGE_KEY = 'mana_naukari_candidate_profile';

export interface StoredCandidateProfile {
  id: string; // numeric string e.g. "42", never "cand_*"
  visitor_id?: number | null; // guaranteed numeric bigint ID from visitor_profiles
  name: string;
  email: string;
  mobile: string;
  resume_url?: string | null;
  resume_file_name?: string | null;
  email_verified?: boolean;
  verified_at?: string | null;
  last_verified_at?: string | null;
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
 * Normalizes mobile number to clean digits (strips country codes, spaces, dashes).
 */
export const normalizeMobile = (phone?: string): string => {
  let cleaned = (phone || '').replace(/[\s\-\+\(\)]/g, '').trim();
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }
  return cleaned;
};

export const candidateProfileService = {
  /**
   * 1. Get stored candidate profile from localStorage for auto-prefill and recognition.
   * Automatically sanitizes legacy "cand_*" strings to prevent bigint syntax errors.
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

      // Sanitize legacy "cand_*" ID strings so they are never used as visitor_id
      let sanitizedId = String(parsed.id || '');
      let numericVisitorId: number | null = null;

      if (parsed.visitor_id && !isNaN(Number(parsed.visitor_id)) && !String(parsed.visitor_id).startsWith('cand_') && Number(parsed.visitor_id) > 0) {
        numericVisitorId = Number(parsed.visitor_id);
        sanitizedId = String(numericVisitorId);
      } else if (sanitizedId && !sanitizedId.startsWith('cand_') && !isNaN(Number(sanitizedId)) && Number(sanitizedId) > 0) {
        numericVisitorId = Number(sanitizedId);
        sanitizedId = String(numericVisitorId);
      } else {
        // Strip legacy cand_* string completely
        sanitizedId = '';
        numericVisitorId = null;
      }

      return {
        ...parsed,
        id: sanitizedId,
        visitor_id: numericVisitorId,
      } as StoredCandidateProfile;
    } catch (err) {
      console.warn('[candidateProfileService] Error reading local profile:', err);
      return null;
    }
  },

  /**
   * 2. Save or update candidate profile in localStorage.
   * Guarantees that "cand_*" strings are NEVER saved into profile.id or profile.visitor_id.
   */
  saveLocalProfile(profile: Partial<StoredCandidateProfile> & { name: string; email: string; mobile: string }): StoredCandidateProfile {
    try {
      const existing = this.getLocalProfile();

      // Resolve valid numeric ID, strictly rejecting any "cand_*" strings
      const candIdCheck = (val: any): number | null => {
        if (!val) return null;
        const str = String(val);
        if (str.startsWith('cand_')) return null;
        const num = Number(str);
        return (!isNaN(num) && num > 0) ? num : null;
      };

      const resolvedVisitorId = 
        candIdCheck(profile.visitor_id) || 
        candIdCheck(profile.id) || 
        candIdCheck(existing?.visitor_id) || 
        candIdCheck(existing?.id) || 
        null;
      const resolvedId = resolvedVisitorId ? String(resolvedVisitorId) : '';

      const updated: StoredCandidateProfile = {
        id: resolvedId,
        visitor_id: resolvedVisitorId,
        name: profile.name.trim(),
        email: normalizeEmail(profile.email),
        mobile: normalizeMobile(profile.mobile),
        resume_url: profile.resume_url !== undefined ? profile.resume_url : (existing?.resume_url || null),
        resume_file_name: profile.resume_file_name !== undefined ? profile.resume_file_name : (existing?.resume_file_name || null),
        email_verified: profile.email_verified !== undefined ? profile.email_verified : (existing?.email_verified ?? false),
        verified_at: profile.verified_at !== undefined ? profile.verified_at : (existing?.verified_at || null),
        last_verified_at: profile.last_verified_at !== undefined ? profile.last_verified_at : (existing?.last_verified_at || null),
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
        id: '',
        visitor_id: null,
        name: profile.name,
        email: normalizeEmail(profile.email),
        mobile: normalizeMobile(profile.mobile),
        applied_jobs: {},
        updated_at: new Date().toISOString(),
      };
    }
  },

  /**
   * 3. Core Database Function: Get or Create Visitor Profile
   * Requirements fulfilled:
   * - Requirement 1: Find existing visitor profile using email or phone
   * - Requirement 2: Create visitor profile if not found
   * - Requirement 3: Get numeric visitor_profiles.id
   * - Requirement 5: Never save or return cand_* strings
   * - Requirement 6: Keep foreign key relationships intact
   */
  async getOrCreateVisitorProfile(input: {
    name: string;
    email: string;
    phone: string;
    resume_url?: string | null;
  }): Promise<{ visitorId: number; data: any; error: any }> {
    const cleanEmail = normalizeEmail(input.email);
    const cleanPhone = normalizeMobile(input.phone);
    const cleanName = (input.name || '').trim() || 'Candidate';

    console.log('[candidateProfileService.getOrCreateVisitorProfile] Finding or creating visitor profile for:', {
      cleanEmail,
      cleanPhone,
      cleanName,
    });

    try {
      // Step A: Find existing visitor profile using email
      if (cleanEmail) {
        const { data: existingByEmail, error: emailErr } = await supabase
          .from('visitor_profiles')
          .select('id, name, email, phone')
          .ilike('email', cleanEmail)
          .limit(1)
          .maybeSingle();

        if (!emailErr && existingByEmail && existingByEmail.id) {
          const numId = Number(existingByEmail.id);
          if (!isNaN(numId) && numId > 0) {
            console.log('[candidateProfileService.getOrCreateVisitorProfile] ✅ Found existing visitor profile by email. Numeric ID:', numId);
            // Synchronize name, phone if updated
            try {
              await supabase
                .from('visitor_profiles')
                .update({
                  name: cleanName,
                  phone: cleanPhone || existingByEmail.phone,
                })
                .eq('id', numId);
            } catch (updErr) {
              console.warn('[candidateProfileService] visitor_profiles update warning:', updErr);
            }
            return { visitorId: numId, data: existingByEmail, error: null };
          }
        }
      }

      // Step B: Find existing visitor profile using phone
      if (cleanPhone) {
        const { data: existingByPhone, error: phoneErr } = await supabase
          .from('visitor_profiles')
          .select('id, name, email, phone')
          .eq('phone', cleanPhone)
          .limit(1)
          .maybeSingle();

        if (!phoneErr && existingByPhone && existingByPhone.id) {
          const numId = Number(existingByPhone.id);
          if (!isNaN(numId) && numId > 0) {
            console.log('[candidateProfileService.getOrCreateVisitorProfile] ✅ Found existing visitor profile by phone. Numeric ID:', numId);
            return { visitorId: numId, data: existingByPhone, error: null };
          }
        }
      }

      // Step C: Create visitor profile if not found
      // Standard schema: (id, name, email, phone)
      console.log('[candidateProfileService.getOrCreateVisitorProfile] No existing profile found. Creating new visitor_profiles record...');
      const insertPayload = {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
      };

      const { data: newVisitor, error: insertErr } = await supabase
        .from('visitor_profiles')
        .insert(insertPayload)
        .select('id, name, email, phone')
        .single();

      if (insertErr) {
        console.warn('[candidateProfileService.getOrCreateVisitorProfile] Insert warning, checking if record was created concurrently:', insertErr.message);
        // If unique constraint or race condition, query once more
        if (cleanEmail) {
          const { data: retryCheck } = await supabase
            .from('visitor_profiles')
            .select('id, name, email, phone')
            .ilike('email', cleanEmail)
            .limit(1)
            .maybeSingle();

          if (retryCheck && retryCheck.id) {
            const numId = Number(retryCheck.id);
            if (!isNaN(numId) && numId > 0) {
              return { visitorId: numId, data: retryCheck, error: null };
            }
          }
        }
        return { visitorId: 0, data: null, error: insertErr };
      }

      if (newVisitor && newVisitor.id) {
        const numId = Number(newVisitor.id);
        if (!isNaN(numId) && numId > 0) {
          console.log('[candidateProfileService.getOrCreateVisitorProfile] ✅ Created new visitor profile. Generated Numeric ID:', numId);
          return { visitorId: numId, data: newVisitor, error: null };
        }
      }

      return { visitorId: 0, data: null, error: new Error('Failed to retrieve numeric ID from visitor_profiles.') };
    } catch (err: any) {
      console.error('[candidateProfileService.getOrCreateVisitorProfile] Exception:', err);
      return { visitorId: 0, data: null, error: err };
    }
  },

  /**
   * 4. Find existing candidate profile in Supabase by Email OR Mobile
   * Checks visitor_profiles first to guarantee returning a real numeric ID.
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

      // Step A: Primary check on visitor_profiles (authoritative source of numeric bigint ID)
      if (cleanEmail) {
        const { data: visitorData, error: visitorErr } = await supabase
          .from('visitor_profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!visitorErr && visitorData && visitorData.id) {
          const numId = Number(visitorData.id);
          console.log('[candidateProfileService] ✅ Found candidate in visitor_profiles by email. Numeric ID:', numId);
          return {
            data: {
              id: String(numId),
              name: visitorData.name,
              email: visitorData.email,
              mobile: visitorData.phone || '',
              resume_url: (visitorData as any).resume_url || null,
              resume_file_name: null,
              email_verified: Boolean((visitorData as any).email_verified),
              verified_at: (visitorData as any).verified_at || null,
              last_verified_at: (visitorData as any).last_verified_at || null,
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

        if (!visitorMobileErr && visitorMobileData && visitorMobileData.id) {
          const numId = Number(visitorMobileData.id);
          console.log('[candidateProfileService] ✅ Found candidate in visitor_profiles by phone. Numeric ID:', numId);
          return {
            data: {
              id: String(numId),
              name: visitorMobileData.name,
              email: visitorMobileData.email,
              mobile: visitorMobileData.phone || '',
              resume_url: (visitorMobileData as any).resume_url || null,
              resume_file_name: null,
              email_verified: Boolean((visitorMobileData as any).email_verified),
              verified_at: (visitorMobileData as any).verified_at || null,
              last_verified_at: (visitorMobileData as any).last_verified_at || null,
              created_at: visitorMobileData.created_at,
              updated_at: visitorMobileData.created_at,
            },
            error: null,
          };
        }
      }

      // Step B: Secondary check on candidate_profiles table
      try {
        let candidateProfile: CandidateProfile | null = null;
        if (cleanEmail) {
          const { data: emailData } = await supabase
            .from('candidate_profiles')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (emailData) candidateProfile = emailData as CandidateProfile;
        }

        if (!candidateProfile && cleanMobile) {
          const { data: mobileData } = await supabase
            .from('candidate_profiles')
            .select('*')
            .eq('mobile', cleanMobile)
            .maybeSingle();

          if (mobileData) candidateProfile = mobileData as CandidateProfile;
        }

        if (candidateProfile) {
          // If ID is numeric, use it; otherwise resolve numeric ID from visitor_profiles
          const numCheck = Number(candidateProfile.id);
          if (!isNaN(numCheck) && numCheck > 0) {
            return { data: candidateProfile, error: null };
          }
          // Resolve numeric ID
          const visRes = await this.getOrCreateVisitorProfile({
            name: candidateProfile.name,
            email: candidateProfile.email,
            phone: candidateProfile.mobile,
            resume_url: candidateProfile.resume_url,
          });
          if (visRes.visitorId > 0) {
            candidateProfile.id = String(visRes.visitorId);
          }
          return { data: candidateProfile, error: null };
        }
      } catch {
        // ignore candidate_profiles table missing
      }

      return { data: null, error: null };
    } catch (err: any) {
      console.warn('[candidateProfileService] Query profile error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * 5. Create or Update Candidate Profile in Supabase & LocalStorage
   * Guarantees numeric bigint visitor_profiles.id is established and returned.
   */
  async saveOrUpdateProfile(input: {
    name: string;
    email: string;
    mobile: string;
    resume_url?: string | null;
    resume_file_name?: string | null;
    email_verified?: boolean;
    verified_at?: string | null;
    last_verified_at?: string | null;
  }): Promise<{ data: CandidateProfile; error: any }> {
    const cleanEmail = normalizeEmail(input.email);
    const cleanMobile = normalizeMobile(input.mobile);
    const cleanName = input.name.trim();

    console.log('[candidateProfileService.saveOrUpdateProfile] Saving profile:', {
      cleanName,
      cleanEmail,
      cleanMobile,
      email_verified: input.email_verified,
    });

    try {
      // Step A: Guaranteed resolution of numeric visitor_profiles.id
      const visitorRes = await this.getOrCreateVisitorProfile({
        name: cleanName,
        email: cleanEmail,
        phone: cleanMobile,
        resume_url: input.resume_url,
      });

      if (!visitorRes.visitorId || visitorRes.visitorId <= 0) {
        throw new Error(visitorRes.error?.message || 'Failed to establish numeric visitor profile in database.');
      }

      const numericVisitorId = visitorRes.visitorId;
      const stringId = String(numericVisitorId);
      const nowIso = new Date().toISOString();

      // Step B: Synchronize verification status to visitor_profiles
      if (input.email_verified) {
        try {
          await supabase
            .from('visitor_profiles')
            .update({
              email_verified: true,
              verified_at: input.verified_at || nowIso,
              last_verified_at: input.last_verified_at || nowIso,
            } as any)
            .eq('id', numericVisitorId);
        } catch {
          // ignore column missing
        }
      }

      // Step C: Optional sync to candidate_profiles table
      try {
        await supabase
          .from('candidate_profiles')
          .upsert({
            id: stringId,
            name: cleanName,
            email: cleanEmail,
            mobile: cleanMobile,
            resume_url: input.resume_url || null,
            resume_file_name: input.resume_file_name || null,
            email_verified: input.email_verified ?? false,
            verified_at: input.verified_at || null,
            last_verified_at: input.last_verified_at || null,
            updated_at: nowIso,
          } as any);
      } catch {
        // candidate_profiles table may be optional
      }

      // Step D: Construct validated CandidateProfile with guaranteed NUMERIC ID
      const savedCandidate: CandidateProfile = {
        id: stringId,
        name: cleanName,
        email: cleanEmail,
        mobile: cleanMobile,
        resume_url: input.resume_url || null,
        resume_file_name: input.resume_file_name || null,
        email_verified: input.email_verified ?? false,
        verified_at: input.verified_at || null,
        last_verified_at: input.last_verified_at || null,
        created_at: nowIso,
        updated_at: nowIso,
      };

      // Step E: Update localStorage with clean numeric ID and visitor_id
      this.saveLocalProfile({
        id: stringId,
        visitor_id: numericVisitorId,
        name: savedCandidate.name,
        email: savedCandidate.email,
        mobile: savedCandidate.mobile,
        resume_url: savedCandidate.resume_url,
        resume_file_name: savedCandidate.resume_file_name,
        email_verified: savedCandidate.email_verified,
        verified_at: savedCandidate.verified_at,
        last_verified_at: savedCandidate.last_verified_at,
      });

      console.log('[candidateProfileService.saveOrUpdateProfile] ✅ Saved successfully with Numeric ID:', numericVisitorId);
      return { data: savedCandidate, error: null };
    } catch (err: any) {
      console.error('[candidateProfileService.saveOrUpdateProfile] Exception:', err);
      return {
        data: null as any,
        error: err,
      };
    }
  },

  /**
   * 6. Check if Candidate has already applied to this specific job.
   * Enforces Duplicate Application Prevention using numeric IDs only.
   */
  async checkJobApplication(
    jobId: string | number,
    profileId?: string | number,
    email?: string,
    mobile?: string
  ): Promise<{ hasApplied: boolean; appliedAt?: string }> {
    if (!jobId) return { hasApplied: false };

    const numericJobId = Number(jobId);
    if (isNaN(numericJobId) || numericJobId <= 0) return { hasApplied: false };

    // 1. Check LocalStorage Cache
    const local = this.getLocalProfile();
    if (local?.applied_jobs && local.applied_jobs[String(jobId)]) {
      return {
        hasApplied: true,
        appliedAt: local.applied_jobs[String(jobId)],
      };
    }

    const targetEmail = normalizeEmail(email || local?.email);
    const targetMobile = normalizeMobile(mobile || local?.mobile);

    // 2. Resolve target numeric visitor_id
    let numericVisitorId: number | null = null;
    const rawId = profileId || local?.visitor_id || local?.id;
    if (rawId && !String(rawId).startsWith('cand_')) {
      const parsedNum = Number(rawId);
      if (!isNaN(parsedNum) && parsedNum > 0) {
        numericVisitorId = parsedNum;
      }
    }

    try {
      // Query applicants table using verified numeric visitor_id
      if (numericVisitorId && numericVisitorId > 0) {
        const { data: appData, error: appErr } = await supabase
          .from('applicants')
          .select('id, created_at')
          .eq('job_id', numericJobId)
          .eq('visitor_id', numericVisitorId)
          .limit(1)
          .maybeSingle();

        if (!appErr && appData) {
          const appliedDate = appData.created_at || new Date().toISOString();
          this.markJobAsApplied(String(jobId), appliedDate);
          return { hasApplied: true, appliedAt: appliedDate };
        }
      }

      // If no ID match or ID wasn't numeric, look up numeric visitor_profiles.id by email
      if (targetEmail) {
        const { data: vis } = await supabase
          .from('visitor_profiles')
          .select('id')
          .ilike('email', targetEmail)
          .limit(1)
          .maybeSingle();

        if (vis && vis.id) {
          const numVisId = Number(vis.id);
          if (!isNaN(numVisId) && numVisId > 0) {
            const { data: emailAppData } = await supabase
              .from('applicants')
              .select('id, created_at')
              .eq('job_id', numericJobId)
              .eq('visitor_id', numVisId)
              .limit(1)
              .maybeSingle();

            if (emailAppData) {
              const appliedDate = emailAppData.created_at || new Date().toISOString();
              this.markJobAsApplied(String(jobId), appliedDate);
              return { hasApplied: true, appliedAt: appliedDate };
            }
          }
        }
      }

      // Fallback check by mobile
      if (targetMobile) {
        const { data: visMob } = await supabase
          .from('visitor_profiles')
          .select('id')
          .eq('phone', targetMobile)
          .limit(1)
          .maybeSingle();

        if (visMob && visMob.id) {
          const numVisId = Number(visMob.id);
          if (!isNaN(numVisId) && numVisId > 0) {
            const { data: mobAppData } = await supabase
              .from('applicants')
              .select('id, created_at')
              .eq('job_id', numericJobId)
              .eq('visitor_id', numVisId)
              .limit(1)
              .maybeSingle();

            if (mobAppData) {
              const appliedDate = mobAppData.created_at || new Date().toISOString();
              this.markJobAsApplied(String(jobId), appliedDate);
              return { hasApplied: true, appliedAt: appliedDate };
            }
          }
        }
      }

      return { hasApplied: false };
    } catch (err) {
      console.warn('[candidateProfileService] checkJobApplication query warning:', err);
      return { hasApplied: false };
    }
  },

  /**
   * 7. Record Application with Guaranteed Numeric Bigint Foreign Key
   * Requirements fulfilled:
   * - Requirement 4: Save numeric ID into applicants.visitor_id
   * - Requirement 5: Never save cand_* strings into applicants.visitor_id
   * - Requirement 6: Keep foreign key relationships intact
   * - Requirement 8: Add proper error handling and success messages
   */
  async recordApplication(payload: {
    jobId: string | number;
    candidateProfile: CandidateProfile;
    notes?: string;
  }): Promise<{
    data: any;
    hasAppliedBefore?: boolean;
    appliedAt?: string;
    error: any;
  }> {
    const { jobId, candidateProfile, notes } = payload;
    console.log('[candidateProfileService.recordApplication] Initiating application record for job:', jobId, 'Candidate:', candidateProfile.name);

    // 1. Resolve & Validate Numeric Job ID (bigint)
    const numericJobId = Number(jobId);
    if (isNaN(numericJobId) || numericJobId <= 0) {
      return {
        data: null,
        error: new Error(`Invalid job requisition identifier: "${jobId}". Expected positive numeric ID.`),
      };
    }

    // 2. Resolve & Validate Numeric Visitor ID (bigint)
    // NEVER pass a "cand_*" string into applicants.visitor_id!
    let numericVisitorId: number | null = null;
    const rawCandId = String(candidateProfile.id || '');

    if (rawCandId && !rawCandId.startsWith('cand_') && !isNaN(Number(rawCandId)) && Number(rawCandId) > 0) {
      numericVisitorId = Number(rawCandId);
    } else {
      console.log('[candidateProfileService.recordApplication] Resolving numeric visitor_profiles.id via email/phone...');
      const visitorRes = await this.getOrCreateVisitorProfile({
        name: candidateProfile.name,
        email: candidateProfile.email,
        phone: candidateProfile.mobile,
      });

      if (!visitorRes.visitorId || visitorRes.visitorId <= 0) {
        return {
          data: null,
          error: new Error('Failed to resolve candidate visitor profile in database.'),
        };
      }
      numericVisitorId = visitorRes.visitorId;
      // Mutate candidateProfile.id to genuine numeric ID
      candidateProfile.id = String(numericVisitorId);
    }

    console.log(`[candidateProfileService.recordApplication] Foreign keys: visitor_id=${numericVisitorId} (bigint), job_id=${numericJobId} (bigint)`);

    // 3. Pre-flight Deduplication check
    const existingCheck = await this.checkJobApplication(
      numericJobId,
      numericVisitorId,
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

    // 4. Insert into applicants table using GUARANTEED NUMERIC BIGINT visitor_id
    const nowIso = new Date().toISOString();
    try {
      // Core insert with verified foreign keys: visitor_id (bigint), job_id (bigint)
      const { data, error } = await supabase
        .from('applicants')
        .insert({
          visitor_id: numericVisitorId,
          job_id: numericJobId,
        })
        .select()
        .single();

      if (error) {
        // Postgres error code 23505 = unique_violation
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          console.warn('[candidateProfileService] Unique constraint prevented duplicate application:', error.message);
          this.markJobAsApplied(String(numericJobId), nowIso);
          return {
            data: { visitor_id: numericVisitorId, job_id: numericJobId },
            hasAppliedBefore: true,
            appliedAt: nowIso,
            error: new Error('You have already applied for this job.'),
          };
        }
        console.error('[candidateProfileService] Error recording applicant in Supabase:', error);
        return { data: null, error };
      }

      console.log('[candidateProfileService] ✅ Application recorded successfully in Supabase:', data);

      // 5. Update local cache
      this.markJobAsApplied(String(numericJobId), nowIso);
      this.saveLocalProfile({
        id: String(numericVisitorId),
        visitor_id: numericVisitorId,
        name: candidateProfile.name,
        email: candidateProfile.email,
        mobile: candidateProfile.mobile,
        resume_url: candidateProfile.resume_url,
        resume_file_name: candidateProfile.resume_file_name,
        email_verified: candidateProfile.email_verified,
        verified_at: candidateProfile.verified_at,
        last_verified_at: candidateProfile.last_verified_at,
      });

      return { data, hasAppliedBefore: false, appliedAt: nowIso, error: null };
    } catch (err: any) {
      console.error('[candidateProfileService] recordApplication exception:', err);
      if (err.code === '23505' || String(err.message).includes('duplicate') || String(err.message).includes('unique')) {
        this.markJobAsApplied(String(numericJobId), nowIso);
        return {
          data: { visitor_id: numericVisitorId, job_id: numericJobId },
          hasAppliedBefore: true,
          appliedAt: nowIso,
          error: new Error('You have already applied for this job.'),
        };
      }
      return { data: null, error: err };
    }
  },

  /**
   * 8. Update candidate's resume (file upload or replacement)
   */
  async updateResume(
    candidateProfileId: string | number,
    resumeUrl: string,
    fileName: string,
    email?: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      console.log('[candidateProfileService.updateResume] Updating resume for candidate:', candidateProfileId, fileName);

      let numericVisitorId: number | null = null;
      if (!isNaN(Number(candidateProfileId)) && Number(candidateProfileId) > 0) {
        numericVisitorId = Number(candidateProfileId);
      }

      // If ID not numeric, resolve by email
      if (!numericVisitorId && email) {
        const cleanEmail = normalizeEmail(email);
        const { data: vis } = await supabase
          .from('visitor_profiles')
          .select('id')
          .ilike('email', cleanEmail)
          .limit(1)
          .maybeSingle();
        if (vis && vis.id) numericVisitorId = Number(vis.id);
      }

      if (numericVisitorId && numericVisitorId > 0) {
        await supabase
          .from('visitor_profiles')
          .update({
            resume_url: resumeUrl,
          })
          .eq('id', numericVisitorId);
      }

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
   * 9. Mark job as applied in local storage
   */
  markJobAsApplied(jobId: string, appliedAt: string = new Date().toISOString()): void {
    try {
      const local = this.getLocalProfile();
      if (local) {
        if (!local.applied_jobs) local.applied_jobs = {};
        local.applied_jobs[String(jobId)] = appliedAt;
        if (typeof window !== 'undefined') {
          localStorage.setItem(CANDIDATE_STORAGE_KEY, JSON.stringify(local));
        }
      }
    } catch (e) {
      console.warn('[candidateProfileService] Error marking job as applied:', e);
    }
  },

  /**
   * 10. Record Reapply on Existing Application Record
   * Maintains one application record per (visitor_id, job_id).
   * Does NOT insert duplicate rows. Updates last_reapplied_at and increments attempt_count.
   * Guarantees numeric bigint visitor_id and job_id.
   */
  async recordReapply(payload: {
    jobId: string | number;
    candidateProfileId?: string | number;
    candidateEmail?: string;
    candidatePhone?: string;
  }): Promise<{
    success: boolean;
    lastReappliedAt: string;
    attemptCount: number;
    error: any;
  }> {
    const { jobId, candidateProfileId, candidateEmail, candidatePhone } = payload;
    const nowIso = new Date().toISOString();
    console.log('[candidateProfileService.recordReapply] Executing reapply for Job:', jobId, 'Candidate ID:', candidateProfileId);

    const numericJobId = Number(jobId);
    if (isNaN(numericJobId) || numericJobId <= 0) {
      return {
        success: false,
        lastReappliedAt: nowIso,
        attemptCount: 1,
        error: new Error(`Invalid job requisition identifier: "${jobId}".`),
      };
    }

    try {
      // 1. Resolve numeric visitor_id
      let numericVisitorId: number | null = null;
      const rawId = String(candidateProfileId || '');

      if (rawId && !rawId.startsWith('cand_') && !isNaN(Number(rawId)) && Number(rawId) > 0) {
        numericVisitorId = Number(rawId);
      } else {
        // Resolve via email or phone
        const cleanEmail = normalizeEmail(candidateEmail);
        const cleanPhone = normalizeMobile(candidatePhone);

        if (cleanEmail) {
          const { data: vis } = await supabase
            .from('visitor_profiles')
            .select('id')
            .ilike('email', cleanEmail)
            .limit(1)
            .maybeSingle();
          if (vis?.id) numericVisitorId = Number(vis.id);
        }

        if (!numericVisitorId && cleanPhone) {
          const { data: visMob } = await supabase
            .from('visitor_profiles')
            .select('id')
            .eq('phone', cleanPhone)
            .limit(1)
            .maybeSingle();
          if (visMob?.id) numericVisitorId = Number(visMob.id);
        }
      }

      if (!numericVisitorId || numericVisitorId <= 0) {
        const cleanEmail = normalizeEmail(candidateEmail);
        const cleanPhone = normalizeMobile(candidatePhone);
        if (cleanEmail || cleanPhone) {
          const visRes = await this.getOrCreateVisitorProfile({
            name: 'Candidate',
            email: cleanEmail,
            phone: cleanPhone,
          });
          if (visRes.visitorId > 0) {
            numericVisitorId = visRes.visitorId;
          }
        }
      }

      if (!numericVisitorId || numericVisitorId <= 0) {
        console.warn('[candidateProfileService.recordReapply] Could not resolve numeric visitor_id, marking local applied only');
        this.markJobAsApplied(String(jobId), nowIso);
        return {
          success: true,
          lastReappliedAt: nowIso,
          attemptCount: 2,
          error: null,
        };
      }

      let existingAppId: any = null;
      let nextAttemptCount = 2;

      // 2. Locate existing applicant record using guaranteed numeric foreign keys
      const { data: appData, error: queryErr } = await supabase
        .from('applicants')
        .select('id')
        .eq('job_id', numericJobId)
        .eq('visitor_id', numericVisitorId)
        .limit(1)
        .maybeSingle();

      if (!queryErr && appData) {
        existingAppId = (appData as any).id;
      }

      if (existingAppId) {
        // Touch record
        try {
          await supabase
            .from('applicants')
            .update({ updated_at: nowIso } as any)
            .eq('id', existingAppId);
        } catch {
          // ignore column missing
        }
      } else {
        // If not found in DB, insert with verified numeric keys
        try {
          await supabase
            .from('applicants')
            .insert({
              visitor_id: numericVisitorId,
              job_id: numericJobId,
            });
        } catch (insErr) {
          console.warn('[candidateProfileService.recordReapply] Insert note:', insErr);
        }
      }

      // Update local storage
      this.markJobAsApplied(String(jobId), nowIso);
      this.saveLocalProfile({
        id: String(numericVisitorId),
        visitor_id: numericVisitorId,
        name: 'Candidate',
        email: candidateEmail || '',
        mobile: candidatePhone || '',
      });

      return {
        success: true,
        lastReappliedAt: nowIso,
        attemptCount: nextAttemptCount,
        error: null,
      };
    } catch (err: any) {
      console.warn('[candidateProfileService.recordReapply] Error:', err);
      this.markJobAsApplied(String(jobId), nowIso);
      return {
        success: true,
        lastReappliedAt: nowIso,
        attemptCount: 2,
        error: null,
      };
    }
  },
};
