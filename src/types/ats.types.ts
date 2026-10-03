/**
 * TypeScript Interfaces for ATS Resume Matcher
 * Corresponds to LinkedIn Premium style ATS analysis and Supabase table resume_match_results
 */

export interface AtsMatchScores {
  overall: number; // 0 - 100
  skills: number; // 0 - 100
  experience: number; // 0 - 100
  education: number; // 0 - 100
  keywords: number; // 0 - 100
}

export interface AtsMatchResult {
  id?: string;
  job_id: string;
  job_title: string;
  company: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_phone?: string;
  resume_file_name?: string;
  match_percentage: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  keyword_score: number;
  matched_skills: string[];
  missing_skills: string[];
  recommendations: string[];
  strengths: string[];
  summary: string;
  analysis_source?: 'ai' | 'fallback_keywords';
  created_at?: string;
}

export interface AtsAnalyzeRequest {
  jobId: string;
  jobTitle: string;
  company: string;
  description: string;
  skillsRequired?: string[] | string;
  experience?: string;
  jobType?: string;
  category?: string;
  candidateName?: string;
  candidateEmail?: string;
  candidatePhone?: string;
}
