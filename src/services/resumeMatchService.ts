import { supabase } from '../lib/supabase';
import { AtsAnalyzeRequest, AtsMatchResult } from '../types/ats.types';
import { calculateFallbackAtsMatch } from '../utils/atsKeywordMatcher';

export const resumeMatchService = {
  /**
   * Analyze candidate resume against job description using Server AI (Gemini 3.8 Flash)
   * with automatic deterministic fallback if AI is unreachable or file parsing fails.
   */
  async analyzeResumeMatch(
    file: File,
    request: AtsAnalyzeRequest
  ): Promise<{ data: AtsMatchResult; error: Error | null }> {
    try {
      console.log('[resumeMatchService] Starting ATS analysis for job:', request.jobTitle, 'File:', file.name);

      const formData = new FormData();
      formData.append('resume', file);
      formData.append('job_id', request.jobId);
      formData.append('job_title', request.jobTitle);
      formData.append('company', request.company);
      formData.append('job_description', request.description);
      formData.append(
        'skills_required',
        Array.isArray(request.skillsRequired)
          ? request.skillsRequired.join(', ')
          : request.skillsRequired || ''
      );
      formData.append('experience', request.experience || 'Fresher');
      formData.append('job_type', request.jobType || 'Fresher');
      formData.append('category', request.category || 'General');

      if (request.candidateName) formData.append('candidate_name', request.candidateName);
      if (request.candidateEmail) formData.append('candidate_email', request.candidateEmail);
      if (request.candidatePhone) formData.append('candidate_phone', request.candidatePhone);

      // Call Express server-side ATS API
      const res = await fetch('/api/ats/analyze', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          console.log('[resumeMatchService] Server returned ATS analysis:', json.data);
          
          // Persist to Supabase in background
          this.saveMatchResult(json.data);
          
          return { data: json.data, error: null };
        }
      }

      console.warn('[resumeMatchService] Server API returned non-OK status or error, running client fallback.');
    } catch (apiErr) {
      console.warn('[resumeMatchService] Server API call exception, switching to client fallback:', apiErr);
    }

    // Client-side Fallback
    try {
      const clientText = await this.readClientText(file);
      const fallbackResult = calculateFallbackAtsMatch({
        resumeText: clientText || file.name,
        resumeFileName: file.name,
        jobId: request.jobId,
        jobTitle: request.jobTitle,
        company: request.company,
        jobDescription: request.description,
        skillsRequired: request.skillsRequired,
        experienceRequired: request.experience,
        candidateName: request.candidateName,
        candidateEmail: request.candidateEmail,
        candidatePhone: request.candidatePhone,
      });

      // Persist fallback to Supabase / LocalStorage
      this.saveMatchResult(fallbackResult);

      return { data: fallbackResult, error: null };
    } catch (fallbackErr: any) {
      console.error('[resumeMatchService] Client fallback error:', fallbackErr);
      const safeMinimal = calculateFallbackAtsMatch({
        resumeText: file.name,
        resumeFileName: file.name,
        jobId: request.jobId,
        jobTitle: request.jobTitle,
        company: request.company,
        jobDescription: request.description,
        skillsRequired: request.skillsRequired,
      });
      return { data: safeMinimal, error: null };
    }
  },

  /**
   * Client-side text extractor for plain text or fallback
   */
  async readClientText(file: File): Promise<string> {
    return new Promise((resolve) => {
      // If text/markdown, read as text
      if (file.type.includes('text') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsText(file);
        return;
      }

      // For binary files (PDF/DOCX) on client fallback, extract printable ASCII sequences
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const buffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          let text = '';
          for (let i = 0; i < bytes.length; i++) {
            const byte = bytes[i];
            if (byte >= 32 && byte <= 126) {
              text += String.fromCharCode(byte);
            } else if (byte === 10 || byte === 13) {
              text += ' ';
            }
          }
          resolve(text.slice(0, 50000));
        } catch {
          resolve('');
        }
      };
      reader.onerror = () => resolve('');
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Save match result to Supabase `resume_match_results` and backup to localStorage
   */
  async saveMatchResult(result: AtsMatchResult): Promise<void> {
    // 1. LocalStorage Backup
    try {
      const storageKey = 'mana_naukari_ats_results';
      const existingRaw = localStorage.getItem(storageKey);
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      const updated = [result, ...existing].slice(0, 30);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('[resumeMatchService] Could not cache to localStorage:', e);
    }

    // 2. Supabase Insert
    try {
      const payload = {
        job_id: result.job_id,
        job_title: result.job_title,
        company: result.company,
        candidate_name: result.candidate_name || null,
        candidate_email: result.candidate_email || null,
        candidate_phone: result.candidate_phone || null,
        resume_file_name: result.resume_file_name || null,
        match_percentage: result.match_percentage,
        skills_score: result.skills_score,
        experience_score: result.experience_score,
        education_score: result.education_score,
        keyword_score: result.keyword_score,
        matched_skills: result.matched_skills || [],
        missing_skills: result.missing_skills || [],
        recommendations: result.recommendations || [],
        strengths: result.strengths || [],
        summary: result.summary || null,
      };

      const { error } = await supabase.from('resume_match_results').insert([payload]);
      if (error) {
        console.warn('[resumeMatchService] Supabase insert warning (schema may be pending migration):', error.message);
      } else {
        console.log('[resumeMatchService] Saved ATS match result to Supabase successfully!');
      }
    } catch (err) {
      console.warn('[resumeMatchService] Supabase save exception:', err);
    }
  },
};
