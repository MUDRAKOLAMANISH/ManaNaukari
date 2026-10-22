import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  MockInterviewBooking,
  MockInterviewBookingInsert,
  MockInterviewBookingStatus,
  MockInterviewPaymentStatus,
} from '../types/database.types';

export const MOCK_INTERVIEW_PRICE_INR = 99;

export interface SubmitMockInterviewInput {
  fullName: string;
  email: string;
  whatsappNumber: string;
  interviewTopic: string;
  customTopic?: string;
  experienceLevel: string;
  interviewMode: string;
  preferredAvailability?: string;
  additionalInformation?: string;
  agreedToTerms: boolean;
}

export const INTERVIEW_TOPICS = [
  'Python',
  'Java',
  'SQL',
  'Data Analytics',
  'Excel',
  'Power BI',
  'Generative AI',
  'Artificial Intelligence',
  'Prompt Engineering',
  'Machine Learning Basics',
  'Frontend Development',
  'HTML, CSS and JavaScript',
  'React.js',
  'Full Stack Development',
  'Backend Development',
  'Data Structures and Algorithms',
  'Software Testing',
  'Computer Networks',
  'Operating Systems',
  'DBMS',
  'HR Interview',
  'Resume-Based Interview',
  'Business Analyst',
  'Other',
];

export const EXPERIENCE_LEVELS = [
  'Fresher',
  'Student',
  '0–1 Years',
  '1–3 Years',
];

export const INTERVIEW_MODES = [
  'Technical Interview',
  'Technical + HR Interview',
  'Topic-Based Practice',
];

/**
 * Normalizes phone/WhatsApp numbers to digits with +91 or country code
 */
export function normalizeWhatsAppNumber(phone: string): string {
  const digitsOnly = phone.replace(/[^\d+]/g, '');
  if (!digitsOnly) return '';
  if (digitsOnly.startsWith('+')) return digitsOnly;
  if (digitsOnly.length === 10) return `+91${digitsOnly}`;
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) return `+${digitsOnly}`;
  return `+${digitsOnly}`;
}

export const mockInterviewService = {
  /**
   * Submit candidate booking for ₹99 Mock Interview
   */
  async createBooking(input: SubmitMockInterviewInput): Promise<{
    success: boolean;
    data?: MockInterviewBooking;
    message: string;
    error?: string;
  }> {
    const cleanFullName = input.fullName.trim();
    const cleanEmail = input.email.trim().toLowerCase();
    const cleanWhatsApp = normalizeWhatsAppNumber(input.whatsappNumber);
    const cleanTopic = input.interviewTopic.trim();
    const cleanCustomTopic = input.interviewTopic === 'Other' && input.customTopic ? input.customTopic.trim() : null;

    if (!cleanFullName || cleanFullName.length < 2) {
      return { success: false, message: 'Please enter your Full Name (minimum 2 characters).' };
    }
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return { success: false, message: 'Please enter a valid email address.' };
    }
    if (!cleanWhatsApp || cleanWhatsApp.length < 10) {
      return { success: false, message: 'Please enter a valid WhatsApp mobile number.' };
    }
    if (!cleanTopic) {
      return { success: false, message: 'Please select an interview topic.' };
    }
    if (cleanTopic === 'Other' && !cleanCustomTopic) {
      return { success: false, message: 'Please specify your custom interview topic.' };
    }
    if (!input.agreedToTerms) {
      return { success: false, message: 'Please check the box agreeing to be contacted via WhatsApp and email.' };
    }

    const createdAt = new Date().toISOString();

    const payload: MockInterviewBookingInsert = {
      full_name: cleanFullName,
      email: cleanEmail,
      whatsapp_number: cleanWhatsApp,
      interview_topic: cleanTopic === 'Other' && cleanCustomTopic ? cleanCustomTopic : cleanTopic,
      custom_topic: cleanCustomTopic,
      experience_level: input.experienceLevel || 'Fresher',
      interview_mode: input.interviewMode || 'Technical Interview',
      preferred_availability: input.preferredAvailability ? input.preferredAvailability.trim() : null,
      additional_information: input.additionalInformation ? input.additionalInformation.trim() : null,
      price_inr: MOCK_INTERVIEW_PRICE_INR, // Always enforced server-side
      payment_status: 'pending',
      booking_status: 'pending_payment',
      created_at: createdAt,
      updated_at: createdAt,
    };

    try {
      const { data, error } = await supabase
        .from('mock_interview_bookings')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('[mockInterviewService.createBooking] Supabase insert error:', error);
        if (error.message?.includes('mock_interview_bookings') || error.message?.includes('relation') || error.message?.includes('schema cache')) {
          return {
            success: false,
            message: 'Database table "mock_interview_bookings" is missing or unconfigured. Please notify administrator.',
            error: error.message,
          };
        }
        return {
          success: false,
          message: error.message || 'Failed to submit mock interview booking.',
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as MockInterviewBooking,
        message: 'Your mock interview booking has been received! Our team will contact you on WhatsApp with payment details.',
      };
    } catch (err: any) {
      console.error('[mockInterviewService.createBooking] Exception:', err);
      return {
        success: false,
        message: err?.message || 'An unexpected error occurred while saving your booking.',
        error: err?.message,
      };
    }
  },

  /**
   * Admin: Fetch all mock interview bookings
   */
  async getAllBookings(): Promise<{ data: MockInterviewBooking[]; error: any }> {
    try {
      const { data, error } = await supabase
        .from('mock_interview_bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[mockInterviewService.getAllBookings] Error:', error);
        return { data: [], error };
      }

      return { data: (data as MockInterviewBooking[]) || [], error: null };
    } catch (err: any) {
      console.error('[mockInterviewService.getAllBookings] Exception:', err);
      return { data: [], error: err };
    }
  },

  /**
   * Admin: Update booking details (status, notes, scheduling, scores, results)
   */
  async updateBooking(id: string, updates: Partial<MockInterviewBooking>): Promise<{ success: boolean; data?: MockInterviewBooking; error: any }> {
    try {
      const payload = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('mock_interview_bookings')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[mockInterviewService.updateBooking] Error:', error);
        return { success: false, error };
      }

      return { success: true, data: data as MockInterviewBooking, error: null };
    } catch (err: any) {
      console.error('[mockInterviewService.updateBooking] Exception:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Admin: Delete booking
   */
  async deleteBooking(id: string): Promise<{ success: boolean; error: any }> {
    try {
      const { error } = await supabase
        .from('mock_interview_bookings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err: any) {
      console.error('[mockInterviewService.deleteBooking] Error:', err);
      return { success: false, error: err };
    }
  },

  /**
   * Admin: Compute summary metrics
   */
  async getBookingStats(): Promise<{
    total: number;
    pendingPayment: number;
    paymentReceived: number;
    scheduled: number;
    completed: number;
    resultSent: number;
    tablesReady: boolean;
  }> {
    try {
      if (!isSupabaseConfigured) {
        return { total: 0, pendingPayment: 0, paymentReceived: 0, scheduled: 0, completed: 0, resultSent: 0, tablesReady: false };
      }

      const { data, error } = await supabase
        .from('mock_interview_bookings')
        .select('booking_status, payment_status');

      if (error) {
        return { total: 0, pendingPayment: 0, paymentReceived: 0, scheduled: 0, completed: 0, resultSent: 0, tablesReady: false };
      }

      const bookings = (data as { booking_status: string; payment_status: string }[]) || [];
      const total = bookings.length;
      const pendingPayment = bookings.filter(b => b.payment_status === 'pending' || b.booking_status === 'pending_payment').length;
      const paymentReceived = bookings.filter(b => b.payment_status === 'paid' || b.booking_status === 'payment_received').length;
      const scheduled = bookings.filter(b => b.booking_status === 'scheduled').length;
      const completed = bookings.filter(b => b.booking_status === 'completed' || b.booking_status === 'in_progress').length;
      const resultSent = bookings.filter(b => b.booking_status === 'result_sent' || Boolean(b.booking_status === 'completed')).length;

      return {
        total,
        pendingPayment,
        paymentReceived,
        scheduled,
        completed,
        resultSent,
        tablesReady: true,
      };
    } catch {
      return { total: 0, pendingPayment: 0, paymentReceived: 0, scheduled: 0, completed: 0, resultSent: 0, tablesReady: false };
    }
  }
};
