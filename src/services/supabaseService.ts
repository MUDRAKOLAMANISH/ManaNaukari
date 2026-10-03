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

      // Always hide deleted jobs from public portal listings
      query = query.neq('status', 'deleted');

      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
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
        }
      } catch {
        // column is_featured may not exist in schema cache
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
          }
        } catch {
          // ignore
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

      if (latestErr) throw latestErr;

      return {
        job: (latestData as Job) || null,
        isFeatured: false,
        error: null,
      };
    } catch (err: any) {
      console.error('[jobsService.getTopAnnouncementJob] Error:', err);
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
      const { error } = await supabase
        .from('jobs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
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
      // Step A: Attempt lookup by email first in case email unique constraint is not present or differs
      const cleanEmail = profile.email.trim().toLowerCase();
      console.log(`[visitorProfilesService.upsert] Checking existing profile for email: ${cleanEmail}`);
      
      const existingQuery = await supabase
        .from('visitor_profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      console.log('[visitorProfilesService.upsert] Existing profile query result:', existingQuery);

      if (existingQuery.error && existingQuery.error.code !== 'PGRST116') {
        console.warn('[visitorProfilesService.upsert] Query check warning:', existingQuery.error);
      }

      if (existingQuery.data?.id) {
        console.log(`[visitorProfilesService.upsert] Found existing profile id ${existingQuery.data.id}. Updating name and phone...`);
        const updateRes = await supabase
          .from('visitor_profiles')
          .update({
            name: profile.name.trim(),
            phone: profile.phone.trim(),
          })
          .eq('id', existingQuery.data.id)
          .select()
          .single();

        console.log('[visitorProfilesService.upsert] Update result:', updateRes);
        if (updateRes.error) {
          console.error('[visitorProfilesService.upsert] Error updating profile:', updateRes.error);
          return { data: null, error: updateRes.error };
        }
        return { data: updateRes.data as VisitorProfile, error: null };
      }

      // Step B: Insert brand new profile
      console.log('[visitorProfilesService.upsert] No existing profile found. Inserting new record...');
      const insertRes = await supabase
        .from('visitor_profiles')
        .insert({
          name: profile.name.trim(),
          email: cleanEmail,
          phone: profile.phone.trim(),
        })
        .select()
        .single();

      console.log('[visitorProfilesService.upsert] Insert result:', insertRes);

      if (insertRes.error) {
        console.error('[visitorProfilesService.upsert] Insert error:', insertRes.error);
        return { data: null, error: insertRes.error };
      }

      return { data: insertRes.data as VisitorProfile, error: null };
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
  async recordApplication(applicant: ApplicantInsert): Promise<{ data: Applicant | null; error: any }> {
    console.log('[applicantsService.recordApplication] Starting application record with payload:', applicant);
    try {
      console.log('[applicantsService.recordApplication] Executing supabase.from("applicants").insert(...)');
      const { data, error } = await supabase
        .from('applicants')
        .insert({
          visitor_id: applicant.visitor_id,
          job_id: applicant.job_id,
        })
        .select()
        .single();

      console.log('[applicantsService.recordApplication] Insert completed. Result:', { data, error });

      if (error) {
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

  async updateStatus(id: string, status: string): Promise<{ success: boolean; error: any }> {
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

  async updateNotes(id: string, notes: string): Promise<{ success: boolean; error: any }> {
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

  async delete(id: string): Promise<{ success: boolean; error: any }> {
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
      const { data, error } = await supabase
        .from('contact_messages')
        .insert(message)
        .select()
        .single();
      return { data: data as ContactMessage | null, error };
    } catch (err: any) {
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
   * Subscribes an email with category and frequency preferences into `job_alert_subscribers`.
   * Checks for duplicate emails to prevent multiple subscriptions.
   */
  async subscribe({
    email,
    categories,
    frequency,
  }: SubscribeJobAlertsInput): Promise<SubscribeJobAlertsResult> {
    const cleanEmail = email.trim().toLowerCase();

    // Step 1: Check if email already exists in job_alert_subscribers
    try {
      const { data: existing, error: checkError } = await supabase
        .from('job_alert_subscribers')
        .select('id, email')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (!checkError && existing) {
        return {
          success: false,
          isDuplicate: true,
          message: 'This email is already subscribed to job alerts.',
          error: 'Email already exists',
        };
      }
    } catch (checkErr) {
      console.warn('[jobAlertSubscribersService] Pre-check notice:', checkErr);
    }

    // Step 2: Insert into job_alert_subscribers
    const createdAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('job_alert_subscribers')
        .insert({
          email: cleanEmail,
          categories,
          frequency,
          is_active: true,
          created_at: createdAt,
        });

      if (error) {
        // Detect PostgreSQL duplicate key violation (code 23505) or unique constraint
        if (
          error.code === '23505' ||
          error.message?.toLowerCase().includes('duplicate') ||
          error.message?.toLowerCase().includes('already exists') ||
          error.message?.toLowerCase().includes('unique')
        ) {
          return {
            success: false,
            isDuplicate: true,
            message: 'This email is already subscribed to job alerts.',
            error: error.message,
          };
        }

        // If is_active column is not present (code 42703), fallback without is_active
        if (error.code === '42703' && error.message?.includes('is_active')) {
          const fallbackRes = await supabase
            .from('job_alert_subscribers')
            .insert({
              email: cleanEmail,
              categories,
              frequency,
              created_at: createdAt,
            });

          if (fallbackRes.error) {
            if (
              fallbackRes.error.code === '23505' ||
              fallbackRes.error.message?.toLowerCase().includes('duplicate') ||
              fallbackRes.error.message?.toLowerCase().includes('already exists')
            ) {
              return {
                success: false,
                isDuplicate: true,
                message: 'This email is already subscribed to job alerts.',
                error: fallbackRes.error.message,
              };
            }
            return {
              success: false,
              message: fallbackRes.error.message || 'Failed to subscribe.',
              error: fallbackRes.error.message,
            };
          }

          // Async trigger welcome email notification (fire-and-forget: failure does not block subscription)
          this.sendWelcomeEmailAsync(cleanEmail, categories, frequency);

          return {
            success: true,
            message: 'Successfully subscribed to job alerts.',
          };
        }

        return {
          success: false,
          message: error.message || 'Failed to subscribe.',
          error: error.message,
        };
      }

      // Async trigger welcome email notification (fire-and-forget: failure does not block subscription)
      this.sendWelcomeEmailAsync(cleanEmail, categories, frequency);

      return {
        success: true,
        message: 'Successfully subscribed to job alerts.',
      };
    } catch (insertErr: any) {
      if (
        insertErr?.code === '23505' ||
        insertErr?.message?.toLowerCase().includes('duplicate') ||
        insertErr?.message?.toLowerCase().includes('already exists')
      ) {
        return {
          success: false,
          isDuplicate: true,
          message: 'This email is already subscribed to job alerts.',
          error: insertErr.message,
        };
      }
      return {
        success: false,
        message: insertErr?.message || 'An unexpected error occurred.',
        error: insertErr?.message,
      };
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

