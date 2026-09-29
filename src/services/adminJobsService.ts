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
  async getJobById(id: string): Promise<{ data: Job | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as Job, error: null };
    } catch (err: any) {
      console.error(`Error fetching job ${id}:`, err);
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
      const { data, error } = await supabase
        .from('jobs')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

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
   */
  async updateJob(id: string, payload: JobUpdate): Promise<{ data: Job | null; error: Error | null }> {
    try {
      const updates = {
        ...payload,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If job was updated to 'active', trigger alert broadcast
      if (data && data.status === 'active' && payload.status === 'active') {
        this.triggerJobAlertBroadcastAsync(data);
      }

      return { data: data as Job, error: null };
    } catch (err: any) {
      console.error(`Error updating job ${id}:`, err);
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
   * Delete a job from Supabase
   */
  async deleteJob(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error(`Error deleting job ${id}:`, err);
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

      const result = await res.json();
      console.log('[JobAlertService] Broadcast completed result:', result);
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
      if (res.ok) {
        const json = await res.json();
        return json.data;
      }
      return null;
    } catch (err) {
      console.warn('[JobAlertService] Could not load alert delivery stats:', err);
      return null;
    }
  },
};
