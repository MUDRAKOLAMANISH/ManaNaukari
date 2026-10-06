import { supabase } from '../lib/supabase';
import { Material, MaterialInsert, MaterialStatus } from '../types/database.types';

export const materialsService = {
  /**
   * Fetches materials from the database with search and category filtering
   * Supports sorting by featured first, then newest
   */
  async getMaterials(options?: {
    search?: string;
    category?: string;
    status?: MaterialStatus;
    limit?: number;
  }): Promise<{ data: Material[] | null; error: Error | null }> {
    try {
      let query = supabase.from('materials').select('*');

      // Default to active materials for public view
      const statusFilter = options?.status || 'active';
      query = query.eq('status', statusFilter);

      if (options?.category && options.category !== 'All') {
        query = query.eq('category', options.category);
      }

      if (options?.search) {
        query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
      }

      // Sort: Featured first, then newest
      query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data: data as Material[], error: null };
    } catch (err: any) {
      console.error('[MaterialsService.getMaterials] Error:', err.message || err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetches all materials for administrators (both active and draft)
   */
  async getAllMaterialsForAdmin(): Promise<{ data: Material[] | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data as Material[], error: null };
    } catch (err: any) {
      console.error('[MaterialsService.getAllMaterialsForAdmin] Error:', err.message || err);
      return { data: null, error: err };
    }
  },

  /**
   * Upload a file to the Supabase Storage bucket 'materials'
   */
  async uploadMaterialFile(file: File): Promise<{ url: string | null; error: Error | null }> {
    try {
      const fileExt = file.name.split('.').pop();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const fileName = `${Date.now()}_${sanitizedName}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('materials')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage.from('materials').getPublicUrl(filePath);

      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      console.error('[MaterialsService.uploadMaterialFile] Error:', err.message || err);
      return { url: null, error: err };
    }
  },

  /**
   * Create a new study material resource
   */
  async createMaterial(payload: MaterialInsert): Promise<{ data: Material | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .insert({
          ...payload,
          views: 0,
          downloads: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as Material, error: null };
    } catch (err: any) {
      console.error('[MaterialsService.createMaterial] Error:', err.message || err);
      return { data: null, error: err };
    }
  },

  /**
   * Update an existing study material resource
   */
  async updateMaterial(id: string, payload: Partial<Material>): Promise<{ data: Material | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data: data as Material, error: null };
    } catch (err: any) {
      console.error('[MaterialsService.updateMaterial] Error:', err.message || err);
      return { data: null, error: err };
    }
  },

  /**
   * Delete a study material resource
   */
  async deleteMaterial(id: string, fileUrl?: string | null): Promise<{ success: boolean; error: Error | null }> {
    try {
      // 1. Delete from database
      const { error: dbError } = await supabase
        .from('materials')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // 2. Safely attempt to delete the file from Storage if applicable
      if (fileUrl) {
        try {
          // Extract file path from URL
          const urlParts = fileUrl.split('/storage/v1/object/public/materials/');
          if (urlParts.length > 1) {
            const filePath = decodeURIComponent(urlParts[1]);
            await supabase.storage.from('materials').remove([filePath]);
            console.log('[MaterialsService] Safely deleted associated file:', filePath);
          }
        } catch (storageErr) {
          console.warn('[MaterialsService] Notice: Could not remove stored file:', storageErr);
        }
      }

      return { success: true, error: null };
    } catch (err: any) {
      console.error('[MaterialsService.deleteMaterial] Error:', err.message || err);
      return { success: false, error: err };
    }
  },

  /**
   * Increments the view count for a study material resource
   */
  async trackView(id: string): Promise<void> {
    try {
      // We read the current count, increment, and write.
      // This is safe since high concurrency is not critical for view counts here
      const { data, error } = await supabase
        .from('materials')
        .select('views')
        .eq('id', id)
        .single();

      if (!error && data) {
        await supabase
          .from('materials')
          .update({ views: (data.views || 0) + 1 })
          .eq('id', id);
        console.log('[MaterialsService] Tracked view for ID:', id);
      }
    } catch (err) {
      console.debug('[MaterialsService] Failed to track view:', err);
    }
  },

  /**
   * Increments the download count for a study material resource
   */
  async trackDownload(id: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('downloads')
        .eq('id', id)
        .single();

      if (!error && data) {
        await supabase
          .from('materials')
          .update({ downloads: (data.downloads || 0) + 1 })
          .eq('id', id);
        console.log('[MaterialsService] Tracked download for ID:', id);
      }
    } catch (err) {
      console.debug('[MaterialsService] Failed to track download:', err);
    }
  }
};
