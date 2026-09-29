import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ResumeOrder, ResumeOrderInsert } from '../types/database.types';

export interface SubmitResumeOrderInput {
  fullName: string;
  email: string;
  phone: string;
  file: File;
}

export interface SubmitResumeOrderResult {
  success: boolean;
  message: string;
  data?: ResumeOrder;
  error?: string;
}

/**
 * Service to handle ATS Resume Review submissions:
 * 1. Uploads the resume file to Supabase Storage ('resumes' bucket).
 * 2. Retrieves the public or direct URL for the uploaded resume.
 * 3. Inserts a record into the 'resume_orders' Supabase table.
 */
export const resumeReviewService = {
  /**
   * Upload file to Supabase Storage
   * Returns the real public URL (e.g. https://...supabase.co/storage/v1/object/public/resumes/...)
   */
  async uploadResumeFile(file: File): Promise<{ fileUrl: string | null; error: string | null }> {
    try {
      if (!isSupabaseConfigured) {
        return {
          fileUrl: null,
          error: 'Supabase configuration is missing. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.',
        };
      }

      // Generate a unique, sanitized file path with timestamp
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      const cleanFileName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .substring(0, 40);
      const uniquePath = `${Date.now()}_${cleanFileName}.${fileExt}`;

      // Upload directly to Supabase storage bucket 'resumes'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(uniquePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream',
        });

      if (uploadError) {
        console.error('[resumeReviewService] Storage upload error:', uploadError);
        const errorMsg = uploadError.message || 'Storage upload failed';
        if (errorMsg.includes('Bucket not found') || errorMsg.includes('The resource was not found') || errorMsg.includes('not found')) {
          return {
            fileUrl: null,
            error: "The Supabase Storage bucket 'resumes' was not found or is not public. Please create a public bucket named 'resumes' in your Supabase dashboard under Storage.",
          };
        }
        return { fileUrl: null, error: errorMsg };
      }

      const filePath = uploadData?.path || uniquePath;

      // Get public URL from Supabase Storage
      const { data: publicUrlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);

      let fileUrl = publicUrlData?.publicUrl || '';

      // Verify and guarantee full URL format
      if (!fileUrl && isSupabaseConfigured) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
        fileUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/resumes/${filePath}`;
      }

      if (!fileUrl || !fileUrl.startsWith('http')) {
        return {
          fileUrl: null,
          error: 'Failed to retrieve public download URL from Supabase Storage.',
        };
      }

      return { fileUrl, error: null };
    } catch (err: any) {
      console.error('[resumeReviewService] Upload exception:', err);
      return { fileUrl: null, error: err?.message || 'Failed to upload resume file to Supabase Storage' };
    }
  },

  /**
   * Submit complete resume review order:
   * 1. Uploads file to Supabase Storage.
   * 2. Retrieves real public URL.
   * 3. Only if upload succeeds, saves order into `resume_orders`.
   * 4. If upload fails, aborts immediately without saving any database record.
   */
  async submitOrder({
    fullName,
    email,
    phone,
    file,
  }: SubmitResumeOrderInput): Promise<SubmitResumeOrderResult> {
    const cleanFullName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanFullName) {
      return { success: false, message: 'Please enter your Full Name.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (!cleanPhone) {
      return { success: false, message: 'Please enter your WhatsApp Number.' };
    }
    if (!file) {
      return { success: false, message: 'Please upload your resume file (PDF, DOC, DOCX).' };
    }

    // Step 1: Upload file to Supabase Storage
    const { fileUrl, error: uploadError } = await this.uploadResumeFile(file);

    // If upload fails, abort and do NOT insert into database
    if (uploadError || !fileUrl || !fileUrl.startsWith('http')) {
      console.error('[resumeReviewService] Upload failed. Database insertion aborted.');
      return {
        success: false,
        message: uploadError || 'Failed to upload resume file to Supabase Storage. Database record was not created.',
        error: uploadError || 'Storage upload failed',
      };
    }

    // Step 2: Insert into resume_orders table with the real Supabase Storage URL
    return this.insertOrderRecord({
      full_name: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      resume_file_url: fileUrl,
      notes: `File: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`,
    });
  },

  /**
   * Inserts the order record into Supabase `resume_orders` table
   */
  async insertOrderRecord(payload: ResumeOrderInsert): Promise<SubmitResumeOrderResult> {
    const createdAt = new Date().toISOString();

    try {
      // Attempt insert without selecting if RLS restricts public SELECT
      const { error } = await supabase
        .from('resume_orders')
        .insert({
          full_name: payload.full_name,
          email: payload.email,
          phone: payload.phone,
          resume_file_url: payload.resume_file_url,
          status: 'pending',
          notes: payload.notes || null,
          created_at: createdAt,
          updated_at: createdAt,
        });

      if (error) {
        console.error('[resumeReviewService] Supabase insert error:', error);
        
        // Check if table missing (e.g. 42P01) or column mismatch
        return {
          success: false,
          message: error.message || 'Failed to submit resume order.',
          error: error.message,
        };
      }

      return {
        success: true,
        message: 'Your resume has been submitted successfully. Our team will contact you on WhatsApp.',
      };
    } catch (insertErr: any) {
      console.error('[resumeReviewService] Insert exception:', insertErr);
      return {
        success: false,
        message: insertErr?.message || 'Failed to save resume order.',
        error: insertErr?.message,
      };
    }
  },

  /**
   * Admin: Fetch all submitted resume orders
   */
  async getAllOrders(): Promise<{ data: ResumeOrder[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('resume_orders')
        .select('*')
        .order('created_at', { ascending: false });

      return { data: (data as ResumeOrder[]) || [], error };
    } catch (err: any) {
      return { data: [], error: err };
    }
  },

  /**
   * Admin: Update order status (e.g., 'in_progress', 'completed')
   */
  async updateOrderStatus(id: string, status: string, notes?: string): Promise<{ success: boolean; error: any }> {
    try {
      console.log('[resumeReviewService.updateOrderStatus] Updating order:', { id, status });
      const updates: any = {
        status,
        updated_at: new Date().toISOString(),
      };
      if (notes !== undefined) {
        updates.notes = notes;
      }

      const { data, error } = await supabase
        .from('resume_orders')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) {
        console.error('[resumeReviewService.updateOrderStatus] ❌ Supabase update error:', error);
        return { success: false, error };
      }

      console.log('[resumeReviewService.updateOrderStatus] ✅ Update successful:', data);
      return { success: true, error: null };
    } catch (err: any) {
      console.error('[resumeReviewService.updateOrderStatus] ❌ Exception during update:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Public stats: Get real count of completed resume reviews (or total reviews)
   */
  async getCompletedCount(): Promise<number> {
    try {
      if (!isSupabaseConfigured) return 0;
      const { count, error } = await supabase
        .from('resume_orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');

      if (!error && typeof count === 'number' && count > 0) {
        return count;
      }

      // If no completed yet, get total active orders
      const { count: totalCount } = await supabase
        .from('resume_orders')
        .select('*', { count: 'exact', head: true });

      return totalCount || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Admin: Delete order
   */
  async deleteOrder(id: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('resume_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('[resumeReviewService] Delete order error:', err);
      return { success: false, error: err };
    }
  },
};
