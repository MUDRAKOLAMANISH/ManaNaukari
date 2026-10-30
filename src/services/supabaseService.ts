import { supabase } from '../lib/supabase';
import {
  Job,
  JobStatus,
  JobInsert,
  JobUpdate,
  Category,
  CategoryInsert,
  VisitorProfile,
  VisitorProfileInsert,
  Applicant,
  ApplicantInsert,
  ContactMessage,
  ContactMessageInsert,
} from '../types/database.types';

/**
 * Service Layer for Supabase PostgreSQL Operations.
 * No dummy data. Direct database interactions with typed responses.
 */

// ==========================================
// 1. JOBS SERVICE
// ==========================================

export interface FetchJobsFilters {
  category?: string;
  job_type?: string;
  status?: string;
  search?: string;
  limit?: number;
}

export const jobsService = {
  async getAll(filters: FetchJobsFilters = {}): Promise<{ data: Job[] | null; error: Error | null }> {
    try {
      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });

      // Ensure draft and deleted jobs are not visible to public users
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      } else if (!filters.status) {
        query = query.eq('status', 'active');
      } else {
        query = query.neq('status', 'deleted').neq('status', 'draft');
      }

      if (filters.category) {
        query = query.eq('category', filters.category);
      }

      if (filters.job_type) {
        query = query.eq('job_type', filters.job_type);
      }

      if (filters.search) {
        query = query.ilike('title', `%${filters.search}%`);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      return { data: data as Job[] | null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async getById(id: string): Promise<{ data: Job | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single();
      return { data: data as Job | null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async getActiveCount(): Promise<{ count: number; error: Error | null }> {
    try {
      const { count, error } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active');
      return { count: count || 0, error };
    } catch (err: any) {
      return { count: 0, error: err };
    }
  },

  async getDistinctActiveCompaniesCount(): Promise<{ count: number; companies: string[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('company')
        .eq('status', 'active');
      if (error || !data) return { count: 0, companies: [], error };
      const unique = Array.from(new Set(data.map((j) => (j.company || '').trim()).filter(Boolean)));
      return { count: unique.length, companies: unique, error: null };
    } catch (err: any) {
      return { count: 0, companies: [], error: err };
    }
  },

  /**
   * Top Job Announcement Ticker:
   * Priority A: Job with is_featured = true (or featured = true), status = 'active'
   * Priority B: Most recently uploaded active job (status = 'active', created_at DESC)
   */
  async getTopAnnouncementJob(): Promise<{
    job: Job | null;
    isFeatured: boolean;
    error: Error | null;
  }> {
    try {
      let featuredJob: Job | null = null;

      // Priority A1: Query active job with is_featured = true
      try {
        const { data: featData, error: featErr } = await (supabase as any)
          .from('jobs')
          .select('*')
          .eq('status', 'active')
          .eq('is_featured', true)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!featErr && featData) {
          featuredJob = featData as Job;
        } else if (featErr && (featErr.message?.includes('Failed to fetch') || featErr.name === 'TypeError')) {
          return { job: null, isFeatured: false, error: featErr as any };
        }
      } catch (e: any) {
        if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
          return { job: null, isFeatured: false, error: e };
        }
      }

      // Priority A2: If is_featured returned nothing, check legacy featured column
      if (!featuredJob) {
        try {
          const { data: legFeatData, error: legFeatErr } = await supabase
            .from('jobs')
            .select('*')
            .eq('status', 'active')
            .eq('featured', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!legFeatErr && legFeatData) {
            featuredJob = legFeatData as Job;
          } else if (legFeatErr && (legFeatErr.message?.includes('Failed to fetch') || legFeatErr.name === 'TypeError')) {
            return { job: null, isFeatured: false, error: legFeatErr as any };
          }
        } catch (e: any) {
          if (e?.message?.includes('Failed to fetch') || e?.name === 'TypeError') {
            return { job: null, isFeatured: false, error: e };
          }
        }
      }

      if (featuredJob) {
        return { job: featuredJob, isFeatured: true, error: null };
      }

      // Priority B: If no featured job exists, fetch the newest active job
      const { data: latestData, error: latestErr } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestErr) {
        console.warn('[jobsService.getTopAnnouncementJob] Notice:', latestErr.message || latestErr);
        return { job: null, isFeatured: false, error: latestErr as any };
      }

      return {
        job: (latestData as Job) || null,
        isFeatured: false,
        error: null,
      };
    } catch (err: any) {
      console.warn('[jobsService.getTopAnnouncementJob] Exception:', err?.message || err);
      return { job: null, isFeatured: false, error: err };
    }
  },

  async create(job: JobInsert): Promise<{ data: Job | null; error: Error | null }> {
    try {
      // 1. Primary insert attempt
      let { data, error } = await supabase.from('jobs').insert(job).select().single();

      // 2. Safe Fallback: Handle missing is_featured or stale schema cache (PGRST204 / 42703)
      if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('is_featured'))) {
        console.warn('[jobsService.create] Column is_featured missing or stale in schema cache, retrying without is_featured');
        const fallbackJob = { ...(job as any) };
        delete fallbackJob.is_featured;

        const fallbackRes = await supabase.from('jobs').insert(fallbackJob).select().single();
        data = fallbackRes.data;
        error = fallbackRes.error;

        // 3. Fallback for any other optional column issues
        if (error && (error.code === 'PGRST204' || error.code === '42703')) {
          console.warn('[jobsService.create] Secondary schema cache warning, inserting core required fields:', error.message);
          const coreJob: any = {
            title: job.title,
            company: job.company,
            location: job.location || 'Pan India',
            experience: job.experience || 'Fresher',
            job_type: job.job_type || 'Fresher',
            category: job.category || 'Software Engineering',
            description: job.description,
            apply_link: job.apply_link,
            status: job.status || 'active',
            posted_date: job.posted_date || new Date().toISOString().split('T')[0],
            featured: Boolean(job.featured),
          };
          if (job.skills_required) coreJob.skills_required = job.skills_required;
          if (job.salary) coreJob.salary = job.salary;
          if (job.source) coreJob.source = job.source;

          const coreRes = await supabase.from('jobs').insert(coreJob).select().single();
          data = coreRes.data;
          error = coreRes.error;
        }
      }

      return { data: data as Job | null, error };
    } catch (err: any) {
      console.error('[jobsService.create] Unexpected insertion error:', err);
      return { data: null, error: err };
    }
  },

  async update(id: string, updates: JobUpdate): Promise<{ data: Job | null; error: Error | null }> {
    try {
      const payload = { ...updates, updated_at: new Date().toISOString() };
      let { data, error } = await supabase
        .from('jobs')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('is_featured'))) {
        console.warn('[jobsService.update] Retrying update without is_featured');
        const fallback = { ...(payload as any) };
        delete fallback.is_featured;
        const res = await supabase.from('jobs').update(fallback).eq('id', id).select().single();
        data = res.data;
        error = res.error;
      }

      return { data: data as Job | null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },

  async restore(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', id);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },

  async setStatus(id: string, status: JobStatus): Promise<{ error: Error | null }> {
    try {
      let { error } = await supabase
        .from('jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error && (error.code === '23514' || error.message?.includes('jobs_status_check') || error.message?.includes('check constraint'))) {
        console.warn(`[supabaseService.setStatus] Status '${status}' restricted by DB constraint. Falling back to status 'expired'.`);
        let fallbackStatus = 'expired';
        let reviewNote = `[${status}] Applications status updated`;

        if (status === 'paused') {
          reviewNote = '[Paused] Applications temporarily paused by admin';
        } else if (status === 'needs_review') {
          reviewNote = '[Needs Review] Flagged for manual review';
        }

        const res = await supabase
          .from('jobs')
          .update({
            status: fallbackStatus as JobStatus,
            review_reason: reviewNote,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        error = res.error;
      }

      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },
};

// ==========================================
// 2. CATEGORIES SERVICE
// ==========================================

export const categoriesService = {
  async getAll(): Promise<{ data: Category[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('category_name', { ascending: true });
      return { data: data as Category[] | null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async getCount(): Promise<{ count: number; error: Error | null }> {
    try {
      const { count, error } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true });
      return { count: count || 0, error };
    } catch (err: any) {
      return { count: 0, error: err };
    }
  },

  async getWithJobCounts(): Promise<{ data: Array<Category & { activeJobsCount: number; slug: string }> | null; error: Error | null }> {
    try {
      const [catsRes, jobsRes] = await Promise.all([
        supabase.from('categories').select('*').order('category_name', { ascending: true }),
        supabase.from('jobs').select('category').eq('status', 'active'),
      ]);

      if (catsRes.error) return { data: null, error: catsRes.error };

      const jobCounts: Record<string, number> = {};
      (jobsRes.data || []).forEach((j) => {
        const cat = (j.category || '').trim().toLowerCase();
        if (cat) {
          jobCounts[cat] = (jobCounts[cat] || 0) + 1;
        }
      });

      const categories = (catsRes.data || []).map((cat) => {
        const lowerName = cat.category_name.trim().toLowerCase();
        const count = jobCounts[lowerName] || 0;
        const slug = cat.category_name
          .toLowerCase()
          .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, '')
          .trim()
          .replace(/\s+/g, '-');

        return {
          ...cat,
          activeJobsCount: count,
          slug,
        };
      });

      return { data: categories, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async create(category: CategoryInsert): Promise<{ data: Category | null; error: Error | null }> {
    try {
      const { data, error } = await supabase.from('categories').insert(category).select().single();
      return { data: data as Category | null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async delete(id: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  },
};

// ==========================================
// 3. VISITOR PROFILES SERVICE (LEAD CAPTURE)
// ==========================================

export const visitorProfilesService = {
  async upsert(profile: VisitorProfileInsert): Promise<{ data: VisitorProfile | null; error: any }> {
    console.log('[visitorProfilesService.upsert] Starting profile upsert with payload:', profile);
    try {
      const cleanEmail = (profile.email || '').trim().toLowerCase();
      const cleanPhone = (profile.phone || '').trim();
      const cleanName = (profile.name || '').trim() || 'Candidate';

      // Step A: Find existing visitor profile using email
      if (cleanEmail) {
        const { data: existingByEmail } = await supabase
          .from('visitor_profiles')
          .select('id, name, email, phone, created_at')
          .ilike('email', cleanEmail)
          .limit(1)
          .maybeSingle();

        if (existingByEmail && existingByEmail.id) {
          const numId = Number(existingByEmail.id);
          if (!isNaN(numId) && numId > 0) {
            console.log('[visitorProfilesService.upsert] Found existing profile by email with numeric id:', numId);
            // Update name and phone if provided
            await supabase
              .from('visitor_profiles')
              .update({
                name: cleanName,
                phone: cleanPhone || existingByEmail.phone,
              })
              .eq('id', numId);

            return {
              data: {
                ...existingByEmail,
                id: String(numId),
                name: cleanName,
                phone: cleanPhone || existingByEmail.phone,
              } as VisitorProfile,
              error: null,
            };
          }
        }
      }

      // Step B: Find existing visitor profile using phone
      if (cleanPhone) {
        const { data: existingByPhone } = await supabase
          .from('visitor_profiles')
          .select('id, name, email, phone, created_at')
          .eq('phone', cleanPhone)
          .limit(1)
          .maybeSingle();

        if (existingByPhone && existingByPhone.id) {
          const numId = Number(existingByPhone.id);
          if (!isNaN(numId) && numId > 0) {
            console.log('[visitorProfilesService.upsert] Found existing profile by phone with numeric id:', numId);
            return {
              data: {
                ...existingByPhone,
                id: String(numId),
              } as VisitorProfile,
              error: null,
            };
          }
        }
      }

      // Step C: Create new visitor profile if not found
      // Only insert core columns: name, email, phone
      console.log('[visitorProfilesService.upsert] No existing profile found. Inserting new visitor_profiles record...');
      const { data: insertRes, error: insertErr } = await supabase
        .from('visitor_profiles')
        .insert({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
        })
        .select('id, name, email, phone, created_at')
        .single();

      if (insertErr) {
        console.warn('[visitorProfilesService.upsert] Insert error, checking race condition:', insertErr.message);
        // Retry check on email
        if (cleanEmail) {
          const { data: retryData } = await supabase
            .from('visitor_profiles')
            .select('id, name, email, phone, created_at')
            .ilike('email', cleanEmail)
            .limit(1)
            .maybeSingle();
          if (retryData && retryData.id) {
            return {
              data: {
                ...retryData,
                id: String(Number(retryData.id)),
              } as VisitorProfile,
              error: null,
            };
          }
        }
        return { data: null, error: insertErr };
      }

      const numId = Number(insertRes.id);
      return {
        data: {
          ...insertRes,
          id: String(numId),
        } as VisitorProfile,
        error: null,
      };
    } catch (err: any) {
      console.error('[visitorProfilesService.upsert] Unexpected caught exception:', err);
      return { data: null, error: err };
    }
  },

  async getAll(): Promise<{ data: VisitorProfile[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('visitor_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as VisitorProfile[] | null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
};

// ==========================================
// 4. APPLICANTS SERVICE (JOB APPLICATION JUNCTION)
// ==========================================

export const applicantsService = {
  /**
   * Record Application in applicants table with guaranteed numeric bigint foreign key.
   * Requirements fulfilled:
   * 1. Find existing visitor profile using email or phone
   * 2. Create visitor profile if not found
   * 3. Get numeric visitor_profiles.id
   * 4. Save that numeric ID into applicants.visitor_id
   * 5. Never save cand_* strings into applicants.visitor_id
   * 6. Keep foreign key relationships intact
   * 7. Proper error handling and success messages
   */
  async recordApplication(applicant: ApplicantInsert): Promise<{ data: Applicant | null; error: any }> {
    console.log('[applicantsService.recordApplication] Starting application record with payload:', applicant);
    try {
      // 1. Resolve and validate numeric job_id (bigint)
      const numericJobId = Number(applicant.job_id);
      if (isNaN(numericJobId) || numericJobId <= 0) {
        return {
          data: null,
          error: new Error(`Invalid job ID: "${applicant.job_id}". Expected positive numeric ID.`),
        };
      }

      // 2. Resolve and validate numeric visitor_id (bigint)
      // NEVER save or pass "cand_*" strings into applicants.visitor_id
      let numericVisitorId: number | null = null;
      const rawVisitorId = String(applicant.visitor_id || '');

      if (rawVisitorId && !rawVisitorId.startsWith('cand_') && !isNaN(Number(rawVisitorId)) && Number(rawVisitorId) > 0) {
        numericVisitorId = Number(rawVisitorId);
      } else {
        // Resolve or create visitor profile using email or phone
        const targetEmail = applicant.email || applicant.visitor?.email || '';
        const targetPhone = applicant.phone || applicant.visitor?.phone || '';
        const targetName = applicant.name || applicant.visitor?.name || 'Candidate';

        const { data: profileRes, error: profErr } = await visitorProfilesService.upsert({
          name: targetName,
          email: targetEmail,
          phone: targetPhone,
        });

        if (profErr || !profileRes || !profileRes.id) {
          return {
            data: null,
            error: new Error(profErr?.message || 'Could not resolve visitor profile for application.'),
          };
        }

        numericVisitorId = Number(profileRes.id);
      }

      if (!numericVisitorId || isNaN(numericVisitorId) || numericVisitorId <= 0) {
        return {
          data: null,
          error: new Error('Failed to resolve numeric visitor ID for application.'),
        };
      }

      console.log(`[applicantsService.recordApplication] Verified foreign keys: visitor_id=${numericVisitorId} (bigint), job_id=${numericJobId} (bigint)`);

      // 3. Check for duplicate application
      const { data: existingApp } = await supabase
        .from('applicants')
        .select('id, created_at')
        .eq('job_id', numericJobId)
        .eq('visitor_id', numericVisitorId)
        .limit(1)
        .maybeSingle();

      if (existingApp) {
        console.log('[applicantsService.recordApplication] Application already exists for (visitor_id, job_id):', existingApp);
        return {
          data: existingApp as Applicant,
          error: null,
        };
      }

      // 4. Insert into applicants table with guaranteed numeric bigint foreign keys
      const { data, error } = await supabase
        .from('applicants')
        .insert({
          visitor_id: numericVisitorId,
          job_id: numericJobId,
        })
        .select()
        .single();

      console.log('[applicantsService.recordApplication] Insert completed. Result:', { data, error });

      if (error) {
        // Handle unique constraint violation gracefully
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          console.warn('[applicantsService.recordApplication] Duplicate prevented by DB constraint');
          return { data: { visitor_id: numericVisitorId, job_id: numericJobId } as any, error: null };
        }
        console.error('[applicantsService.recordApplication] Error recording applicant:', error);
        return { data: null, error };
      }

      return { data: data as Applicant | null, error: null };
    } catch (err: any) {
      console.error('[applicantsService.recordApplication] Unexpected caught exception:', err);
      return { data: null, error: err };
    }
  },

  async getAll(): Promise<{ data: Applicant[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('applicants')
        .select('*, visitor:visitor_profiles(*), job:jobs(*)')
        .order('created_at', { ascending: false });
      return { data: data as Applicant[] | null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  async getCount(): Promise<{ count: number; error: Error | null }> {
    try {
      const { count, error } = await supabase
        .from('applicants')
        .select('id', { count: 'exact', head: true });
      return { count: count || 0, error };
    } catch (err: any) {
      return { count: 0, error: err };
    }
  },

  async updateStatus(id: string | number, status: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('applicants')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('[applicantsService.updateStatus] Error:', err);
      return { success: false, error: err };
    }
  },

  async updateNotes(id: string | number, notes: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('applicants')
        .update({
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('[applicantsService.updateNotes] Error:', err);
      return { success: false, error: err };
    }
  },

  async delete(id: string | number): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('applicants')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('[applicantsService.delete] Error:', err);
      return { success: false, error: err };
    }
  },
};

// ==========================================
// 5. CONTACT MESSAGES SERVICE
// ==========================================

export const contactMessagesService = {
  async create(message: ContactMessageInsert): Promise<{ data: ContactMessage | null; error: Error | null }> {
    try {
      // Execute insert directly without .select() to ensure unauthenticated users with INSERT RLS permissions can submit without hitting SELECT RLS restrictions.
      const { error } = await supabase
        .from('contact_messages')
        .insert({
          name: message.name.trim(),
          email: message.email.trim(),
          message: message.message.trim(),
        });

      if (error) {
        console.error('[contactMessagesService.create] Supabase insert error:', error);
        return { data: null, error };
      }

      return { data: message as ContactMessage, error: null };
    } catch (err: any) {
      console.error('[contactMessagesService.create] Unexpected exception:', err);
      return { data: null, error: err };
    }
  },

  async getAll(): Promise<{ data: ContactMessage[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });
      return { data: data as ContactMessage[] | null, error };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },
};

// ==========================================
// 6. JOB ALERT SUBSCRIBERS SERVICE
// ==========================================

export interface SubscribeJobAlertsInput {
  email: string;
  categories: string[];
  frequency: string;
}

export interface SubscribeJobAlertsResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
  isDuplicate?: boolean;
}

export const jobAlertSubscribersService = {
  /**
   * Subscribes an email with category and frequency preferences securely into `job_alert_subscribers`.
   * Uses SECURITY DEFINER RPC or server proxy to protect subscriber records from public SELECT inspection.
   */
  async subscribe({
    email,
    categories,
    frequency,
  }: SubscribeJobAlertsInput): Promise<SubscribeJobAlertsResult> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Primary: Security-definer RPC 'subscribe_job_alerts'
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('subscribe_job_alerts', {
        p_email: cleanEmail,
        p_categories: categories,
        p_frequency: frequency,
      });

      if (!rpcErr && rpcRes && typeof rpcRes === 'object') {
        const resObj = rpcRes as any;
        if (resObj.success) {
          this.sendWelcomeEmailAsync(cleanEmail, categories, frequency);
          return {
            success: true,
            message: resObj.message || 'Successfully subscribed to job alerts!',
          };
        }
      }
    } catch (rpcCatch) {
      console.warn('[jobAlertSubscribersService] RPC notice:', rpcCatch);
    }

    // 2. Secondary: Backend server proxy endpoint '/api/alerts/subscribe'
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, categories, frequency }),
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.success) {
          this.sendWelcomeEmailAsync(cleanEmail, categories, frequency);
          return {
            success: true,
            message: resData.message || 'Successfully subscribed to job alerts!',
          };
        }
      }
    } catch (apiErr) {
      console.warn('[jobAlertSubscribersService] Server proxy notice:', apiErr);
    }

    // 3. Fallback: Direct insert for anonymous visitors
    try {
      const { error: insertErr } = await supabase
        .from('job_alert_subscribers')
        .insert({
          email: cleanEmail,
          categories,
          frequency,
          is_active: true,
        });

      if (!insertErr) {
        this.sendWelcomeEmailAsync(cleanEmail, categories, frequency);
        return {
          success: true,
          message: 'Successfully subscribed to daily job alerts!',
        };
      }

      return {
        success: false,
        message: insertErr.message || 'Failed to subscribe.',
        error: insertErr.message,
      };
    } catch (fallbackErr: any) {
      return {
        success: false,
        message: fallbackErr?.message || 'An unexpected error occurred.',
        error: fallbackErr?.message,
      };
    }
  },

  /**
   * Unsubscribes an email using unsubscribe token or secure verification
   */
  async unsubscribe(email: string, token?: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('unsubscribe_job_alerts', {
        p_email: cleanEmail,
        p_token: token || null,
      });

      if (!rpcErr && rpcRes && (rpcRes as any).success) {
        return { success: true, message: (rpcRes as any).message };
      }
    } catch (err) {
      console.warn('[jobAlertSubscribersService] Unsubscribe RPC notice:', err);
    }

    try {
      const res = await fetch('/api/alerts/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, token }),
      });
      const data = await res.json();
      return { success: Boolean(data.success), message: data.message || 'Unsubscribed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Failed to unsubscribe' };
    }
  },

  /**
   * Helper to check if an email already exists in job_alert_subscribers
   */
  async isEmailSubscribed(email: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('job_alert_subscribers')
        .select('id')
        .ilike('email', email.trim().toLowerCase())
        .maybeSingle();

      return !error && !!data;
    } catch {
      return false;
    }
  },

  /**
   * Dispatches welcome email via server proxy using Resend.
   * If email fails or RESEND_API_KEY is not configured, logs the error without interrupting subscriber flow.
   */
  async sendWelcomeEmailAsync(email: string, categories: string[], frequency: string): Promise<void> {
    try {
      const res = await fetch('/api/alerts/send-welcome-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          categories,
          frequency,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('[Welcome Email Error] Server returned error:', res.status, errText);
        return;
      }

      if (!res.headers.get('content-type')?.includes('application/json')) {
        console.warn('[Welcome Email Notice] Non-JSON response received, skipping parse.');
        return;
      }

      const result = await res.json();
      if (!result.success && !result.skipped) {
        console.error('[Welcome Email Error] Resend dispatch failed:', result.error || result.message);
        if (result.resendResponse) {
          console.error('[Welcome Email Error] Full Resend Error Object:', result.resendResponse);
        }
      } else if (result.skipped) {
        console.info('[Welcome Email Notice]', result.warning || result.message || 'Email skipped due to testing mode');
        if (result.resendResponse) {
          console.info('[Welcome Email Notice] Full Resend Response Object:', result.resendResponse);
        }
      } else if (result.success) {
        console.log('[Welcome Email] Successfully sent welcome email to:', email);
        console.log('[Welcome Email] Full Resend Response Object:', result.resendResponse || result.data);
      }
    } catch (err: any) {
      console.error('[Welcome Email Exception] Failed to call welcome email endpoint:', err?.message || err);
    }
  },

  /**
   * Admin: Fetch all job alert subscribers
   */
  async getAllSubscribers(): Promise<{ data: any[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('job_alert_subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      return { data: data || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  /**
   * Admin: Delete a subscriber
   */
  async deleteSubscriber(id: string): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await supabase
        .from('job_alert_subscribers')
        .delete()
        .eq('id', id);

      return { success: !error, error };
    } catch (err: any) {
      return { success: false, error: err };
    }
  },
};

