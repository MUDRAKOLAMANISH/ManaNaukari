import { supabase } from '../lib/supabase';
import { Job, JobInsert, JobUpdate, Category } from '../types/database.types';

export interface AdminJobsQueryFilters {
  search?: string;
  category?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminJobsResponse {
  data: Job[];
  totalCount: number;
  error: Error | null;
}

export const adminJobsService = {
  /**
   * Fetch paginated jobs with search and filtering
   */
  async getJobs(filters: AdminJobsQueryFilters = {}): Promise<AdminJobsResponse> {
    try {
      const page = filters.page && filters.page > 0 ? filters.page : 1;
      const pageSize = filters.pageSize || 10;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from('jobs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Search keyword across title or company
      if (filters.search && filters.search.trim()) {
        const term = `%${filters.search.trim()}%`;
        query = query.or(`title.ilike.${term},company.ilike.${term}`);
      }

      // Filter by category
      if (filters.category && filters.category !== 'all') {
        query = query.eq('category', filters.category);
      }

      // Filter by status (active / expired / draft)
      if (filters.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      // Apply server-side pagination range
      query = query.range(from, to);

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        data: (data as Job[]) || [],
        totalCount: count || 0,
        error: null,
      };
    } catch (err: any) {
      console.error('Error fetching admin jobs:', err);
      return {
        data: [],
        totalCount: 0,
        error: err instanceof Error ? err : new Error('Failed to load jobs'),
      };
    }
  },

  /**
   * Fetch single job by ID for edit mode
   */
  async getJobById(id: string | number): Promise<{ data: Job | null; error: Error | null }> {
    try {
      console.log(`[adminJobsService.getJobById] Fetching job requisition for ID: ${id}`);
      const cleanId = String(id).trim();

      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', cleanId)
        .single();

      if (error) {
        console.error(`[adminJobsService.getJobById] Supabase error for ID ${id}:`, error);
        throw error;
      }

      console.log(`[adminJobsService.getJobById] Successfully fetched job for edit:`, {
        id: data?.id,
        title: data?.title,
        company: data?.company,
        status: data?.status,
        category: data?.category,
      });

      return { data: data as Job, error: null };
    } catch (err: any) {
      console.error(`[adminJobsService.getJobById] Exception fetching job ${id}:`, err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetch categories list for form selection
   */
  async getCategories(): Promise<Category[]> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('category_name', { ascending: true });

      if (error) throw error;
      return (data as Category[]) || [];
    } catch (err) {
      console.warn('Could not fetch categories from DB:', err);
      return [];
    }
  },

  /**
   * Create a new job in Supabase
   */
  async createJob(payload: JobInsert): Promise<{ data: Job | null; error: Error | null }> {
    try {
      console.log('[adminJobsService.createJob] Creating job in Supabase:', payload.title);
      const isFeatured = Boolean(payload.is_featured ?? payload.featured);

      // Requirement 6 & 7: If admin marks this job as featured, replace previous featured jobs
      if (isFeatured) {
        try {
          await (supabase as any).from('jobs').update({ is_featured: false, featured: false }).neq('id', 'temp_id');
        } catch {
          try {
            await supabase.from('jobs').update({ featured: false }).neq('id', 'temp_id');
          } catch {}
        }
      }

      // Try inserting with both is_featured and featured
      let { data, error } = await supabase
        .from('jobs')
        .insert([{
          ...payload,
          featured: isFeatured,
          is_featured: isFeatured,
        }])
        .select()
        .single();

      // Fallback retry if schema columns are missing or cached incorrectly (such as review_date, review_reason, is_featured)
      if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('review_date') || error.message?.includes('review_reason') || error.message?.includes('is_featured'))) {
        console.warn('[adminJobsService.createJob] Schema mismatch detected. Stripping pending columns and retrying insertion.');
        
        const fallbackPayload: any = { ...payload };
        delete fallbackPayload.review_date;
        delete fallbackPayload.review_reason;
        delete fallbackPayload.is_featured;
        fallbackPayload.featured = isFeatured;

        const fallbackRes = await supabase
          .from('jobs')
          .insert([fallbackPayload])
          .select()
          .single();
        
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) throw error;

      console.log('[adminJobsService.createJob] Job created successfully, ID:', data?.id);

      // When a new job is created and marked 'active', trigger automatic job alert broadcast
      if (data && data.status === 'active') {
        this.triggerJobAlertBroadcastAsync(data);
      }

      return { data: data as Job, error: null };
    } catch (err: any) {
      console.error('Error creating job in Supabase:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Update an existing job in Supabase
   * Preserves historical applications, analytics, and recruiter records permanently
   */
  async updateJob(id: string | number, payload: JobUpdate): Promise<{ data: Job | null; error: Error | null }> {
    try {
      const cleanId = String(id).trim();
      console.log(`[adminJobsService.updateJob] Initiating update for job ID: ${cleanId}`, payload);

      const isFeatured = (payload.is_featured !== undefined || payload.featured !== undefined)
        ? Boolean(payload.is_featured ?? payload.featured)
        : undefined;

      // Requirement 6 & 7: If admin marks this job as featured, unmark any other featured jobs
      if (isFeatured) {
        try {
          await (supabase as any).from('jobs').update({ is_featured: false, featured: false }).neq('id', cleanId);
        } catch {
          try {
            await supabase.from('jobs').update({ featured: false }).neq('id', cleanId);
          } catch {}
        }
      }

      const updates: any = {
        ...payload,
        updated_at: new Date().toISOString(),
      };
      if (isFeatured !== undefined) {
        updates.featured = isFeatured;
        updates.is_featured = isFeatured;
      }

      let { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', cleanId)
        .select()
        .single();

      // Fallback retry if schema columns are missing or cached incorrectly (such as review_date, review_reason, is_featured)
      if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message?.includes('review_date') || error.message?.includes('review_reason') || error.message?.includes('is_featured'))) {
        console.warn('[adminJobsService.updateJob] Schema mismatch detected. Stripping pending columns and retrying update.');
        
        const fallbackUpdates = { ...updates };
        delete fallbackUpdates.review_date;
        delete fallbackUpdates.review_reason;
        delete fallbackUpdates.is_featured;

        const fallbackRes = await supabase
          .from('jobs')
          .update(fallbackUpdates)
          .eq('id', cleanId)
          .select()
          .single();
        
        data = fallbackRes.data;
        error = fallbackRes.error;
      }

      if (error) {
        console.error(`[adminJobsService.updateJob] Supabase update failed for job ID ${cleanId}:`, error);
        throw error;
      }

      console.log(`[adminJobsService.updateJob] Successfully updated job ${cleanId} in Supabase:`, {
        id: data?.id,
        title: data?.title,
        status: data?.status,
        updated_at: data?.updated_at,
      });

      // If job was updated to 'active', trigger alert broadcast
      if (data && data.status === 'active' && payload.status === 'active') {
        this.triggerJobAlertBroadcastAsync(data);
      }

      return { data: data as Job, error: null };
    } catch (err: any) {
      console.error(`[adminJobsService.updateJob] Exception updating job ${id}:`, err);
      return { data: null, error: err };
    }
  },

  /**
   * Soft toggle: Change status between 'active' and 'expired'
   */
  async toggleExpireJob(id: string, currentStatus: string): Promise<{ success: boolean; newStatus: string; error: Error | null }> {
    try {
      const newStatus = currentStatus === 'active' ? 'expired' : 'active';
      const { error } = await supabase
        .from('jobs')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true, newStatus, error: null };
    } catch (err: any) {
      console.error(`Error toggling job status ${id}:`, err);
      return { success: false, newStatus: currentStatus, error: err };
    }
  },

  /**
   * Pause/Resume toggle: Change status between 'paused' and 'active'
   */
  async togglePauseJob(id: string, currentStatus: string): Promise<{ success: boolean; newStatus: string; error: Error | null }> {
    try {
      const newStatus = currentStatus === 'paused' ? 'active' : 'paused';
      const { error } = await supabase
        .from('jobs')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true, newStatus, error: null };
    } catch (err: any) {
      console.error(`Error toggling pause status ${id}:`, err);
      return { success: false, newStatus: currentStatus, error: err };
    }
  },

  /**
   * Set specific status (active, paused, expired, closed, deleted)
   */
  async updateJobStatus(id: string, status: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error(`Error updating job status ${id}:`, err);
      return { success: false, error: err };
    }
  },

  /**
   * Soft-delete a job in Supabase (status = 'deleted')
   * Does NOT remove database rows. Applications, applicants, analytics, views,
   * recruiter info, and contact history remain 100% permanently preserved.
   */
  async deleteJob(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'deleted', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error(`Error soft-deleting job ${id}:`, err);
      return { success: false, error: err };
    }
  },

  /**
   * Permanently delete a job row from the jobs table.
   * If there are applicants or views, we preserve them by transferring
   * their references to an archived placeholder job before deleting the original row.
   */
  async deleteJobPermanently(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const ARCHIVE_JOB_ID = '00000000-0000-0000-0000-000000000000';
      
      // Let's check if the archive job already exists
      const { data: existingArchive } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', ARCHIVE_JOB_ID)
        .maybeSingle();

      if (!existingArchive) {
        console.log('[Admin Service] Archive placeholder job not found. Creating it now...');
        
        // Grab any existing category to satisfy foreign key link
        const { data: firstCategory } = await supabase
          .from('categories')
          .select('category_name')
          .limit(1)
          .maybeSingle();
        
        const targetCategory = firstCategory?.category_name || 'General';

        const { error: createErr } = await supabase
          .from('jobs')
          .insert({
            id: ARCHIVE_JOB_ID,
            title: 'Archived Job Opportunity (Original Deleted)',
            company: 'Mana Naukari Archive',
            status: 'deleted',
            apply_link: 'https://mana-naukari.netlify.app',
            category: targetCategory,
            experience: 'Fresher',
            job_type: 'Full Time',
            location: 'Hyderabad, India',
            salary: 'N/A',
            description: 'Archived placeholder for permanently deleted jobs to preserve candidate application records.',
          });
        if (createErr) {
          console.warn('[Admin Service] Notice: Could not create archive placeholder. Trying direct delete.', createErr.message);
        }
      }

      // Transfer applicants of the target job to the archive placeholder to bypass RESTRICT
      const { error: updateApplicantsErr } = await supabase
        .from('applicants')
        .update({ job_id: ARCHIVE_JOB_ID })
        .eq('job_id', id);

      if (updateApplicantsErr) {
        console.warn('[Admin Service] Notice: Re-associating applicants encountered:', updateApplicantsErr.message);
      }

      // Transfer job views of the target job to the archive placeholder
      const { error: updateViewsErr } = await supabase
        .from('job_views')
        .update({ job_id: ARCHIVE_JOB_ID })
        .eq('job_id', id);

      if (updateViewsErr) {
        console.warn('[Admin Service] Notice: Re-associating job views encountered:', updateViewsErr.message);
      }

      // Safely perform hard delete on target job
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error(`Error permanently deleting job ${id}:`, err);
      return { success: false, error: err };
    }
  },

  /**
   * Restore a soft-deleted or closed job back to active status
   */
  async restoreJob(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error(`Error restoring job ${id}:`, err);
      return { success: false, error: err };
    }
  },

  /**
   * Asynchronously triggers automatic job alert email notifications.
   * Runs in the background (fire-and-forget) so job creation/publishing is never blocked.
   */
  async triggerJobAlertBroadcastAsync(job: Job): Promise<void> {
    try {
      console.log(`[JobAlertService] Triggering email broadcast for active job: "${job.title}" (${job.category})`);
      const res = await fetch('/api/alerts/send-job-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ job }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.warn('[JobAlertService] Server returned error during alert broadcast:', res.status, text);
        return;
      }

      if (res.headers.get('content-type')?.includes('application/json')) {
        const result = await res.json();
        console.log('[JobAlertService] Broadcast completed result:', result);
      }
    } catch (err) {
      console.error('[JobAlertService] Broadcast exception (non-blocking):', err);
    }
  },

  /**
   * Fetches real-time alert delivery metrics and logs for the Admin Dashboard
   */
  async getAlertDeliveryStats(): Promise<any> {
    try {
      const res = await fetch('/api/alerts/delivery-stats');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const json = await res.json();
        return json.data || json.stats;
      }
      return null;
    } catch (err) {
      console.warn('[JobAlertService] Could not load alert delivery stats:', err);
      return null;
    }
  },
};
