import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  WebsiteDevelopmentLead,
  WebsiteDevelopmentLeadInsert,
  WebsiteLeadStatus,
} from '../types/database.types';

const LOCAL_STORAGE_LEADS_KEY = 'mana_carrier_website_dev_leads';

export interface SubmitWebsiteLeadInput {
  customerName: string;
  email: string;
  whatsappNumber: string;
  websiteType: string;
  websiteIdea: string;
  requiredFeatures?: string;
  numberOfPages?: string;
  budgetRange?: string;
  preferredDeliveryTime?: string;
  referenceWebsiteUrl?: string;
  additionalRequirements?: string;
}

/**
 * Normalizes phone numbers with country code (+91 by default if 10 digits)
 */
export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return '';
  if (digits.startsWith('+')) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
  return `+${digits}`;
}

export const websiteDevelopmentService = {
  /**
   * Save a new AI Website Development Enquiry to Supabase + LocalStorage fallback
   */
  async saveLead(input: SubmitWebsiteLeadInput): Promise<{
    success: boolean;
    data?: WebsiteDevelopmentLead;
    message: string;
    error?: string;
  }> {
    const cleanName = input.customerName.trim();
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanPhone = normalizePhoneNumber(input.whatsappNumber);
    const cleanType = input.websiteType.trim() || 'Custom AI Website';
    const cleanIdea = input.websiteIdea.trim();

    if (!cleanName || cleanName.length < 2) {
      return { success: false, message: 'Please enter your Name (minimum 2 characters).' };
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, message: 'Please enter a valid Email address.' };
    }
    if (!cleanPhone || cleanPhone.length < 10) {
      return { success: false, message: 'Please enter a valid WhatsApp Mobile Number.' };
    }
    if (!cleanIdea || cleanIdea.length < 5) {
      return { success: false, message: 'Please provide a short description of your website idea or project.' };
    }

    const now = new Date().toISOString();
    const generatedId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const newLeadRecord: WebsiteDevelopmentLead = {
      id: generatedId,
      customer_name: cleanName,
      email: cleanEmail,
      whatsapp_number: cleanPhone,
      website_type: cleanType,
      website_idea: cleanIdea,
      required_features: input.requiredFeatures?.trim() || null,
      number_of_pages: input.numberOfPages?.trim() || '1 Page',
      budget_range: input.budgetRange?.trim() || '₹499 (Starter)',
      preferred_delivery_time: input.preferredDeliveryTime?.trim() || '24–48 Hours',
      reference_website_url: input.referenceWebsiteUrl?.trim() || null,
      additional_requirements: input.additionalRequirements?.trim() || null,
      status: 'new',
      admin_notes: null,
      created_at: now,
      updated_at: now,
    };

    // Save to LocalStorage first to guarantee zero data loss
    try {
      const existingLocalRaw = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
      const existingLocal: WebsiteDevelopmentLead[] = existingLocalRaw ? JSON.parse(existingLocalRaw) : [];
      existingLocal.unshift(newLeadRecord);
      localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(existingLocal));
    } catch (e) {
      console.warn('[WebsiteDevService] LocalStorage save warning:', e);
    }

    // Try saving to Supabase if configured
    if (isSupabaseConfigured) {
      try {
        const payload: WebsiteDevelopmentLeadInsert = {
          customer_name: cleanName,
          email: cleanEmail,
          whatsapp_number: cleanPhone,
          website_type: cleanType,
          website_idea: cleanIdea,
          required_features: input.requiredFeatures?.trim() || null,
          number_of_pages: input.numberOfPages?.trim() || '1 Page',
          budget_range: input.budgetRange?.trim() || '₹499 (Starter)',
          preferred_delivery_time: input.preferredDeliveryTime?.trim() || '24–48 Hours',
          reference_website_url: input.referenceWebsiteUrl?.trim() || null,
          additional_requirements: input.additionalRequirements?.trim() || null,
          status: 'new',
        };

        const { data, error } = await supabase
          .from('website_development_leads')
          .insert(payload)
          .select('*')
          .single();

        if (!error && data) {
          console.log('[WebsiteDevService] Saved lead successfully to Supabase:', data.id);
          return {
            success: true,
            data: data as WebsiteDevelopmentLead,
            message: 'Your website enquiry was submitted successfully!',
          };
        } else {
          console.warn('[WebsiteDevService] Supabase insert note:', error?.message || 'Table may not exist yet, using local fallback');
        }
      } catch (dbErr) {
        console.warn('[WebsiteDevService] Supabase exception, fallback used:', dbErr);
      }
    }

    return {
      success: true,
      data: newLeadRecord,
      message: 'Your website enquiry was saved successfully!',
    };
  },

  /**
   * Fetch all Website Development Enquiries (Supabase + LocalStorage merged)
   */
  async getAllLeads(): Promise<{
    data: WebsiteDevelopmentLead[];
    error?: any;
    isFallback?: boolean;
  }> {
    let localLeads: WebsiteDevelopmentLead[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
      if (raw) {
        localLeads = JSON.parse(raw);
      }
    } catch (err) {
      console.warn('[WebsiteDevService] LocalStorage read warning:', err);
    }

    if (!isSupabaseConfigured) {
      return { data: localLeads, isFallback: true };
    }

    try {
      const { data, error } = await supabase
        .from('website_development_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[WebsiteDevService] Supabase fetch error, returning local leads:', error.message);
        return { data: localLeads, error, isFallback: true };
      }

      // Merge Supabase leads and LocalStorage leads without duplicates
      const supabaseLeads: WebsiteDevelopmentLead[] = data || [];
      const supabaseIds = new Set(supabaseLeads.map((l) => l.id));
      const supabaseEmails = new Set(supabaseLeads.map((l) => `${l.email}_${l.created_at}`));

      const extraLocal = localLeads.filter(
        (l) => !supabaseIds.has(l.id) && !supabaseEmails.has(`${l.email}_${l.created_at}`)
      );

      const combined = [...supabaseLeads, ...extraLocal].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return { data: combined, isFallback: false };
    } catch (err) {
      console.error('[WebsiteDevService] Exception fetching leads:', err);
      return { data: localLeads, error: err, isFallback: true };
    }
  },

  /**
   * Update lead status and/or admin notes
   */
  async updateLeadStatus(
    id: string,
    status: WebsiteLeadStatus,
    adminNotes?: string | null
  ): Promise<{ success: boolean; error?: any }> {
    const updatedAt = new Date().toISOString();

    // Always update LocalStorage cache
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
      if (raw) {
        const localList: WebsiteDevelopmentLead[] = JSON.parse(raw);
        const idx = localList.findIndex((item) => item.id === id);
        if (idx !== -1) {
          localList[idx].status = status;
          if (adminNotes !== undefined) localList[idx].admin_notes = adminNotes;
          localList[idx].updated_at = updatedAt;
          localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(localList));
        }
      }
    } catch (e) {
      console.warn('[WebsiteDevService] LocalStorage update warning:', e);
    }

    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const updateData: any = {
        status,
        updated_at: updatedAt,
      };
      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('website_development_leads')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.warn('[WebsiteDevService] Supabase update warning:', error.message);
      }
      return { success: true };
    } catch (err) {
      console.error('[WebsiteDevService] Exception updating lead:', err);
      return { success: true };
    }
  },

  /**
   * Delete lead
   */
  async deleteLead(id: string): Promise<{ success: boolean; error?: any }> {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LEADS_KEY);
      if (raw) {
        const localList: WebsiteDevelopmentLead[] = JSON.parse(raw);
        const filtered = localList.filter((item) => item.id !== id);
        localStorage.setItem(LOCAL_STORAGE_LEADS_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('[WebsiteDevService] LocalStorage delete warning:', e);
    }

    if (!isSupabaseConfigured) {
      return { success: true };
    }

    try {
      const { error } = await supabase
        .from('website_development_leads')
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('[WebsiteDevService] Supabase delete warning:', error.message);
      }
      return { success: true };
    } catch (err) {
      console.error('[WebsiteDevService] Exception deleting lead:', err);
      return { success: true };
    }
  },

  /**
   * Convert leads to CSV string for download
   */
  exportToCsv(leads: WebsiteDevelopmentLead[]): string {
    const headers = [
      'Enquiry ID',
      'Date & Time',
      'Customer Name',
      'Email',
      'WhatsApp Number',
      'Website Type',
      'Website Idea',
      'Required Features',
      'Pages',
      'Budget Range',
      'Delivery Timeline',
      'Reference URL',
      'Additional Requirements',
      'Status',
      'Admin Notes',
    ];

    const escapeCsvField = (field: string | null | undefined): string => {
      if (!field) return '""';
      const clean = String(field).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = leads.map((l) => [
      escapeCsvField(l.id),
      escapeCsvField(new Date(l.created_at).toLocaleString()),
      escapeCsvField(l.customer_name),
      escapeCsvField(l.email),
      escapeCsvField(l.whatsapp_number),
      escapeCsvField(l.website_type),
      escapeCsvField(l.website_idea),
      escapeCsvField(l.required_features),
      escapeCsvField(l.number_of_pages),
      escapeCsvField(l.budget_range),
      escapeCsvField(l.preferred_delivery_time),
      escapeCsvField(l.reference_website_url),
      escapeCsvField(l.additional_requirements),
      escapeCsvField(l.status),
      escapeCsvField(l.admin_notes),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  },
};
