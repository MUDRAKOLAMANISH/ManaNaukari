/**
 * Database Models and TypeScript Interfaces for Mana Naukari
 * Corresponding to the Supabase PostgreSQL schema
 */

export type JobType = 'Fresher' | 'Internship' | 'Full Time' | 'Part Time' | 'Contract';
export type JobStatus = 'active' | 'paused' | 'closed' | 'deleted' | 'expired' | 'draft';
export type ExperienceLevel = 'Fresher' | '0-1 Years' | '1-3 Years' | 'Any';
export type AdminRole = 'super_admin' | 'editor';

// 1. Table: jobs
export interface Job {
  id: string;
  title: string;
  company: string;
  company_logo?: string | null;
  location: string;
  salary?: string | null;
  experience?: string | null;
  job_type: string;
  category: string;
  skills_required?: string[] | null;
  description: string;
  apply_link: string;
  source?: string | null;
  featured: boolean;
  is_featured?: boolean;
  status: JobStatus;
  posted_date: string;
  expiry_date?: string | null;
  created_at: string;
  updated_at: string;
}

export type JobInsert = Omit<Job, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type JobUpdate = Partial<JobInsert>;

// 2. Table: categories
export interface Category {
  id: string;
  category_name: string;
  created_at: string;
}

export type CategoryInsert = Omit<Category, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

export type CategoryUpdate = Partial<CategoryInsert>;

// 3. Table: admin_users
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

export type AdminUserInsert = Omit<AdminUser, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// 4. Table: contact_messages
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  created_at: string;
}

export type ContactMessageInsert = Omit<ContactMessage, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// 5. Table: visitor_profiles (Legacy Lead Capture)
export interface VisitorProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  resume_url?: string | null;
  created_at: string;
}

export type VisitorProfileInsert = Omit<VisitorProfile, 'id' | 'created_at'> & {
  id?: string;
  resume_url?: string | null;
  created_at?: string;
};

// 5b. Table: candidate_profiles (LinkedIn/Indeed style persistent candidate profile)
export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  resume_url?: string | null;
  resume_file_name?: string | null;
  email_verified?: boolean;
  verified_at?: string | null;
  last_verified_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type CandidateProfileInsert = {
  id?: string;
  name: string;
  email: string;
  mobile: string;
  resume_url?: string | null;
  resume_file_name?: string | null;
  email_verified?: boolean;
  verified_at?: string | null;
  last_verified_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type CandidateProfileUpdate = Partial<CandidateProfileInsert>;

// 6. Table: applicants
export type ApplicantStatus = 'New' | 'Reviewed' | 'Shortlisted' | 'Rejected' | 'new' | 'reviewed' | 'shortlisted' | 'rejected';

export interface Applicant {
  id: string | number;
  visitor_id: string | number;
  candidate_profile_id?: string | null;
  job_id: string | number;
  status?: ApplicantStatus;
  notes?: string | null;
  resume_url?: string | null;
  resume_file_name?: string | null;
  applied_at?: string;
  last_reapplied_at?: string | null;
  attempt_count?: number;
  application_status?: string;
  created_at: string;
  updated_at?: string;
  // Optional joined models
  visitor?: VisitorProfile;
  candidate?: CandidateProfile;
  job?: Job;
}

export type ApplicantInsert = {
  id?: string | number;
  visitor_id?: string | number;
  candidate_profile_id?: string | null;
  job_id: string | number;
  name?: string;
  email?: string;
  phone?: string;
  visitor?: VisitorProfile;
  status?: ApplicantStatus;
  notes?: string | null;
  resume_url?: string | null;
  resume_file_name?: string | null;
  applied_at?: string;
  last_reapplied_at?: string | null;
  attempt_count?: number;
  application_status?: string;
  created_at?: string;
  updated_at?: string;
};

export type RecruiterJobStatus = 'Pending Payment' | 'Pending Review' | 'pending_review' | 'Approved' | 'approved' | 'Rejected' | 'rejected' | 'Expired';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

// 7. Table: recruiters
export type RecruiterVerificationStatus = 'Pending' | 'Verified' | 'Rejected' | 'Suspended' | 'pending' | 'verified' | 'rejected' | 'suspended';

export interface Recruiter {
  id: string | number;
  name?: string;
  recruiter_name?: string;
  official_email?: string;
  recruiter_email?: string;
  email?: string;
  mobile_number?: string;
  phone_number?: string;
  phone?: string | null;
  designation?: string | null;
  company_name: string;
  company_website?: string;
  linkedin_profile?: string;
  linkedin_url?: string | null;
  company_logo?: string | null;
  gst_number?: string | null;
  registration_doc_url?: string | null;
  verification_status?: RecruiterVerificationStatus;
  is_verified?: boolean;
  rejection_reason?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type RecruiterInsert = Partial<Omit<Recruiter, 'id' | 'created_at' | 'updated_at'>> & {
  id?: string | number;
  name?: string;
  recruiter_name?: string;
  official_email?: string;
  recruiter_email?: string;
  email?: string;
  mobile_number?: string;
  phone_number?: string;
  phone?: string | null;
  designation?: string | null;
  company_name?: string;
  company_website?: string;
  linkedin_profile?: string;
  linkedin_url?: string | null;
  created_at?: string;
  updated_at?: string;
};

// 8. Table: recruiter_jobs
export interface RecruiterJob {
  id: string | number;
  recruiter_id: string | number;
  title: string;
  company?: string;
  company_name?: string;
  company_logo?: string | null;
  location: string;
  salary?: string | null;
  experience?: string | null;
  job_type?: string;
  category?: string;
  skills_required?: string[] | null;
  description: string;
  apply_link: string;
  status: string; // 'pending_review' | 'Pending Review' | 'approved' | 'rejected'
  verification_status?: string; // 'pending'
  rejection_reason?: string | null;
  approved_job_id?: string | null; // references jobs.id once approved
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  created_at?: string;
  updated_at?: string;
  // Join properties
  recruiter?: Recruiter;
  payment?: JobPayment;
}

export type RecruiterJobInsert = Omit<RecruiterJob, 'id' | 'created_at' | 'updated_at' | 'recruiter' | 'payment'> & {
  id?: string | number;
  created_at?: string;
  updated_at?: string;
};

// 9. Table: job_payments
export interface JobPayment {
  id: string;
  recruiter_job_id: string;
  recruiter_id: string;
  amount: number; // in INR
  currency: string; // 'INR'
  status: PaymentStatus;
  payment_method?: string; // 'UPI' | 'Card' | 'NetBanking'
  transaction_id: string;
  payment_date?: string;
  created_at: string;
  updated_at?: string;
}

export type JobPaymentInsert = Omit<JobPayment, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

// 10. Table: visitor_analytics
export interface VisitorAnalytic {
  id: string | number;
  page_url: string;
  page_name?: string | null;
  session_id?: string | null;
  visitor_id: string;
  visit_date?: string | null;
  timestamp?: string | null;
  visited_at?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  page_type?: string | null;
  path?: string | null;
  referrer?: string | null;
  created_at?: string;
}

export type VisitorAnalyticInsert = {
  id?: string | number;
  page_url: string;
  page_name?: string | null;
  session_id?: string | null;
  visitor_id: string;
  visit_date?: string | null;
  timestamp?: string | null;
  visited_at?: string;
  ip_address?: string | null;
  user_agent?: string | null;
  page_type?: string | null;
  path?: string | null;
  referrer?: string | null;
  created_at?: string;
};

// 11. Table: job_views
export interface JobView {
  id: string | number;
  job_id: string | number;
  visitor_id: string;
  session_id?: string | null;
  job_title?: string | null;
  company?: string | null;
  viewed_at?: string;
  created_at?: string;
}

export type JobViewInsert = {
  id?: string | number;
  job_id: string | number;
  visitor_id: string;
  session_id?: string | null;
  job_title?: string | null;
  company?: string | null;
  viewed_at?: string;
  created_at?: string;
};

// 12. Table: whatsapp_popup_events
export type WhatsAppPopupEventType = 'view' | 'join_click' | 'close_click' | 'maybe_later_click';

export interface WhatsAppPopupEvent {
  id: string;
  session_id: string;
  event_type: WhatsAppPopupEventType;
  path: string;
  created_at: string;
}

export type WhatsAppPopupEventInsert = Omit<WhatsAppPopupEvent, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// 13. Table: job_alert_subscriptions (legacy)
export interface JobAlertSubscription {
  id: string;
  email: string;
  categories: string[];
  frequency: string;
  status: 'active' | 'unsubscribed';
  source?: string;
  created_at: string;
}

export type JobAlertSubscriptionInsert = Omit<JobAlertSubscription, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// 14. Table: job_alert_subscribers
export interface JobAlertSubscriber {
  id?: string;
  email: string;
  categories: string[];
  frequency: string;
  is_active?: boolean;
  created_at?: string;
}

export type JobAlertSubscriberInsert = {
  id?: string;
  email: string;
  categories: string[];
  frequency: string;
  is_active?: boolean;
  created_at?: string;
};

// 15. Table / Log: job_alert_deliveries
export interface JobAlertDeliveryLog {
  id?: string;
  job_id: string;
  job_title: string;
  job_category: string;
  company: string;
  recipient_email: string;
  status: 'sent' | 'failed' | 'skipped';
  resend_id?: string | null;
  error_message?: string | null;
  created_at?: string;
}

export interface AlertDeliveryStats {
  totalAlertsSent: number;
  totalSubscribers: number;
  activeSubscribers: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  recentDeliveries: JobAlertDeliveryLog[];
}

// 16. Table: resume_orders (ATS Resume Review & Optimization)
export interface ResumeOrder {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  resume_file_url: string;
  status?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ResumeOrderInsert = {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  resume_file_url: string;
  status?: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
};

// Analytics Aggregation Models
export interface DailyMetricPoint {
  date: string; // 'YYYY-MM-DD'
  label: string; // 'Sep 24'
  count: number;
}

export interface TopViewedJobMetric {
  job_id: string;
  title: string;
  company: string;
  views: number;
  applications: number;
  conversionRate: number;
}

export interface WhatsAppPopupStats {
  views: number;
  joins: number;
  dismisses: number;
  conversionRate: number;
}

export interface AnalyticsOverview {
  totalVisitors: number;
  todayVisitors: number;
  weeklyVisitors: number;
  monthlyVisitors: number;
  totalApplications: number;
  todayApplications: number;
  activeJobs: number;
  pausedJobs?: number;
  expiredJobs: number;
  closedJobs?: number;
  deletedJobs?: number;
  totalJobViews: number;
  conversionRate: number; // percentage
  visitorsByDay: DailyMetricPoint[];
  applicationsByDay: DailyMetricPoint[];
  topViewedJobs: TopViewedJobMetric[];
  whatsAppPopupStats?: WhatsAppPopupStats;
  alertDeliveryStats?: AlertDeliveryStats;
  tablesReady: boolean;
  tableErrorMessage?: string | null;
}

// 12. Table: resume_match_results
export interface ResumeMatchResultRecord {
  id: string;
  job_id: string;
  job_title: string;
  company: string;
  candidate_name?: string | null;
  candidate_email?: string | null;
  candidate_phone?: string | null;
  resume_file_name?: string | null;
  match_percentage: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  keyword_score: number;
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
  strengths: string[];
  summary?: string | null;
  created_at: string;
}
