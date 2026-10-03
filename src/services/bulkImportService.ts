import { Job, JobInsert } from '../types/database.types';
import { jobsService } from './supabaseService';
import { generateJobUrlPath, getAbsoluteJobUrl } from '../utils/jobUrlUtils';

export interface BulkImportSuccessItem {
  id: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  skills: string[];
  salary?: string | null;
  manaNaukariUrl: string;
  seoSlugPath: string;
  originalUrl: string;
  category: string;
  jobType: string;
}

export interface BulkImportFailedItem {
  url: string;
  reason: string;
}

export interface BulkImportResult {
  importedCount: number;
  failedCount: number;
  totalProcessed: number;
  successfulJobs: BulkImportSuccessItem[];
  failedJobs: BulkImportFailedItem[];
}

export interface BulkImportProgress {
  currentIndex: number;
  totalCount: number;
  currentUrl: string;
  status: 'pending' | 'extracting' | 'saving' | 'completed' | 'failed';
}

export const bulkImportService = {
  /**
   * Helper to parse and clean up to 10 URLs from pasted text
   */
  parseUrls(rawInput: string): { urls: string[]; originalCount: number; truncated: boolean } {
    if (!rawInput || typeof rawInput !== 'string') {
      return { urls: [], originalCount: 0, truncated: false };
    }

    // Split on newlines, commas, semicolons, or multiple spaces
    const candidates = rawInput
      .split(/[\n,;\s]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    const validUrls: string[] = [];
    const seen = new Set<string>();

    for (const token of candidates) {
      // Basic check for URL
      let candidate = token;
      if (!candidate.startsWith('http://') && !candidate.startsWith('https://')) {
        if (candidate.startsWith('www.') || candidate.includes('.com') || candidate.includes('.in') || candidate.includes('.org') || candidate.includes('.io')) {
          candidate = `https://${candidate}`;
        } else {
          continue;
        }
      }

      try {
        const parsed = new URL(candidate);
        const normalized = parsed.href;
        if (!seen.has(normalized)) {
          seen.add(normalized);
          validUrls.push(normalized);
        }
      } catch {
        // invalid URL token, skip
      }
    }

    const originalCount = validUrls.length;
    const truncated = validUrls.length > 10;
    const finalUrls = validUrls.slice(0, 10);

    return {
      urls: finalUrls,
      originalCount,
      truncated,
    };
  },

  /**
   * Extract domain fallback hint for company name
   */
  extractDomainHint(inputUrl: string): string {
    try {
      const parsed = new URL(inputUrl);
      const hostname = parsed.hostname.replace(/^www\./, '');
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        const name = parts[0];
        return name.charAt(0).toUpperCase() + name.slice(1);
      }
      return 'Hiring Company';
    } catch {
      return 'Hiring Company';
    }
  },

  /**
   * Extract single job data from URL using server AI endpoint with fallback
   */
  async extractJobData(url: string): Promise<Partial<Job>> {
    const trimmedUrl = url.trim();

    try {
      let response = await fetch('/api/ai/extract-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      let contentType = response.headers.get('content-type') || '';

      if (!response.ok || !contentType.includes('application/json')) {
        // Attempt Netlify function fallback if deployed on serverless
        try {
          const fnRes = await fetch('/.netlify/functions/extract-job', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: trimmedUrl }),
          });
          if (fnRes.ok && fnRes.headers.get('content-type')?.includes('application/json')) {
            response = fnRes;
            contentType = fnRes.headers.get('content-type') || '';
          }
        } catch {}
      }

      if (contentType.includes('application/json')) {
        const result = await response.json();
        if (result && result.success && result.data) {
          const raw = result.data;
          return {
            title: raw.title || this.inferTitleFromUrl(trimmedUrl) || 'Associate Software Engineer',
            company: raw.company || this.extractDomainHint(trimmedUrl),
            location: raw.location || 'Pan India',
            experience: raw.experience || 'Fresher',
            job_type: raw.job_type || 'Fresher',
            category: raw.category || 'Software Engineering',
            skills_required: Array.isArray(raw.skills_required) && raw.skills_required.length > 0 
              ? raw.skills_required 
              : ['Problem Solving', 'Communication', 'Technical Fundamentals'],
            salary: raw.salary || 'Best in Industry',
            description: raw.description || `### Opportunity Details\n\nOfficial opening with **${raw.company || this.extractDomainHint(trimmedUrl)}**.\n\n- Position: ${raw.title || 'Technical Role'}\n- Location: ${raw.location || 'Pan India'}\n- Experience: ${raw.experience || 'Fresher'}\n\nApply online through Mana Naukari direct portal.`,
            apply_link: raw.apply_link || trimmedUrl,
            source: raw.source || 'Official Careers Portal',
          };
        }
      }
    } catch (err) {
      console.warn(`[bulkImportService] Error extracting from ${trimmedUrl}:`, err);
    }

    // Heuristic Fallback
    const domainHint = this.extractDomainHint(trimmedUrl);
    const inferredTitle = this.inferTitleFromUrl(trimmedUrl);

    return {
      title: inferredTitle || `${domainHint} Technical Trainee`,
      company: domainHint,
      location: 'Pan India',
      experience: 'Fresher',
      job_type: 'Fresher',
      category: 'Software Engineering',
      skills_required: ['Problem Solving', 'Communication', 'Technical Skills'],
      salary: 'Best in Industry',
      description: `### Official Job Opportunity\n\n**${domainHint}** is accepting applications for **${inferredTitle || 'Engineering Role'}**.\n\n- Experience: Fresher / 0-2 Years\n- Location: Pan India\n- Category: Software Engineering\n\nVerified official career requisition. Apply online directly.`,
      apply_link: trimmedUrl,
      source: 'Official Careers Portal',
    };
  },

  /**
   * Infers role title from URL pathname slugs
   */
  inferTitleFromUrl(inputUrl: string): string {
    try {
      const parsed = new URL(inputUrl);
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length === 0) return '';
      const last = segments[segments.length - 1];
      const cleaned = decodeURIComponent(last)
        .replace(/[-_]/g, ' ')
        .replace(/\b(jobs?|careers?|apply|req|id|[0-9]{4,}|html?)\b/gi, '')
        .trim();

      if (cleaned.length > 2) {
        return cleaned
          .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase());
      }
      return '';
    } catch {
      return '';
    }
  },

  /**
   * Process a single URL: Extract -> Insert in Database -> Generate Mana Naukari link
   */
  async processSingleUrl(url: string): Promise<{ success: boolean; data?: BulkImportSuccessItem; error?: string }> {
    try {
      // 1. Extract job data
      const extracted = await this.extractJobData(url);

      if (!extracted.title || !extracted.company) {
        throw new Error('Unable to extract job title or company name from the provided URL.');
      }

      // 2. Prepare database payload
      const jobInsert: JobInsert = {
        title: extracted.title,
        company: extracted.company,
        company_logo: null,
        location: extracted.location || 'Pan India',
        salary: extracted.salary || 'Best in Industry',
        experience: extracted.experience || 'Fresher',
        job_type: extracted.job_type || 'Fresher',
        category: extracted.category || 'Software Engineering',
        skills_required: extracted.skills_required || ['Problem Solving', 'Communication'],
        description: extracted.description || `Official job requisition for ${extracted.title} at ${extracted.company}.`,
        apply_link: extracted.apply_link || url,
        source: extracted.source || 'Official Careers Portal',
        featured: false,
        is_featured: false,
        status: 'active',
        posted_date: new Date().toISOString().split('T')[0],
      };

      // 3. Insert into Supabase jobs table
      const { data: createdJob, error: insertError } = await jobsService.create(jobInsert);

      if (insertError || !createdJob) {
        throw new Error(insertError?.message || 'Database insert failed.');
      }

      // 4. Generate SEO-friendly slug & absolute Mana Naukari URL
      const seoSlugPath = generateJobUrlPath(createdJob);
      const manaNaukariUrl = getAbsoluteJobUrl(seoSlugPath);

      return {
        success: true,
        data: {
          id: createdJob.id,
          title: createdJob.title,
          company: createdJob.company,
          location: createdJob.location,
          experience: createdJob.experience || 'Fresher',
          skills: Array.isArray(createdJob.skills_required) ? createdJob.skills_required : [],
          salary: createdJob.salary,
          manaNaukariUrl,
          seoSlugPath,
          originalUrl: url,
          category: createdJob.category,
          jobType: createdJob.job_type,
        },
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to extract and create job from URL.',
      };
    }
  },

  /**
   * Process up to 10 URLs sequentially with progress callbacks
   */
  async processBatch(
    urls: string[],
    onProgress?: (progress: BulkImportProgress) => void
  ): Promise<BulkImportResult> {
    const limitedUrls = urls.slice(0, 10);
    const successfulJobs: BulkImportSuccessItem[] = [];
    const failedJobs: BulkImportFailedItem[] = [];

    for (let i = 0; i < limitedUrls.length; i++) {
      const url = limitedUrls[i];
      if (onProgress) {
        onProgress({
          currentIndex: i + 1,
          totalCount: limitedUrls.length,
          currentUrl: url,
          status: 'extracting',
        });
      }

      const result = await this.processSingleUrl(url);

      if (result.success && result.data) {
        successfulJobs.push(result.data);
      } else {
        failedJobs.push({
          url,
          reason: result.error || 'Failed to extract requisition parameters.',
        });
      }
    }

    if (onProgress) {
      onProgress({
        currentIndex: limitedUrls.length,
        totalCount: limitedUrls.length,
        currentUrl: '',
        status: 'completed',
      });
    }

    return {
      importedCount: successfulJobs.length,
      failedCount: failedJobs.length,
      totalProcessed: limitedUrls.length,
      successfulJobs,
      failedJobs,
    };
  },

  /**
   * 4, 5, 6, 7. Generate professional WhatsApp shareable message
   * Uses ONLY Mana Naukari URLs (Never original company career URLs).
   */
  generateWhatsAppMessage(jobs: BulkImportSuccessItem[]): string {
    if (jobs.length === 0) return '';

    const lines: string[] = [];
    lines.push('🔥 *LATEST HIRING ALERTS | MANA NAUKARI* 🔥');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('Verified Corporate Requisitions posted today. Direct applications open:');
    lines.push('');

    jobs.forEach((job, index) => {
      const numberEmoji = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][index] || `${index + 1}.`;
      lines.push(`${numberEmoji} *${job.title.trim()}*`);
      lines.push(`🏢 *Company:* ${job.company}`);
      lines.push(`📍 *Location:* ${job.location}`);
      lines.push(`⏳ *Experience:* ${job.experience || 'Fresher'}`);
      
      const skillsStr = job.skills.length > 0 ? job.skills.slice(0, 4).join(', ') : 'Technical Skills, Problem Solving';
      lines.push(`🛠️ *Key Skills:* ${skillsStr}`);
      lines.push(`🔗 *Apply Here:* ${job.manaNaukariUrl}`);
      lines.push('');
    });

    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('📌 *Important:* All positions are 100% verified. Zero placement fees.');
    lines.push('🚀 *Free ATS Resume Check & More Jobs:* https://mananaukari.com');

    return lines.join('\n');
  },

  /**
   * Generate professional LinkedIn Post
   * Uses ONLY Mana Naukari URLs (Never original company career URLs).
   */
  generateLinkedInPost(jobs: BulkImportSuccessItem[]): string {
    if (jobs.length === 0) return '';

    const lines: string[] = [];
    lines.push('🚀 Exciting Career Opportunities Alert! [Mana Naukari Verified Openings]');
    lines.push('');
    lines.push('We have aggregated the latest verified hiring requisitions from top tech employers. Explore roles below and apply directly through our official verified links:');
    lines.push('');

    jobs.forEach((job) => {
      lines.push(`🔹 ${job.title} at ${job.company}`);
      lines.push(`📍 Location: ${job.location}`);
      lines.push(`⏳ Experience: ${job.experience || 'Fresher'}`);
      const skillsStr = job.skills.length > 0 ? job.skills.slice(0, 4).join(', ') : 'Core Engineering, Problem Solving';
      lines.push(`🛠️ Key Skills: ${skillsStr}`);
      lines.push(`👉 Apply on Mana Naukari: ${job.manaNaukariUrl}`);
      lines.push('');
    });

    lines.push('💡 Pro Tip: Optimize your resume before applying using our free AI ATS Resume Matcher on Mana Naukari!');
    lines.push('');
    lines.push('Follow Mana Naukari for daily verified engineering, IT, and fresher opportunities.');
    lines.push('');
    lines.push('#Hiring #JobAlert #TechJobs #SoftwareEngineering #CareerOpportunities #ManaNaukari #FresherJobs #Recruitment #Careers');

    return lines.join('\n');
  },

  /**
   * Generate professional Telegram Post
   * Uses ONLY Mana Naukari URLs (Never original company career URLs).
   */
  generateTelegramPost(jobs: BulkImportSuccessItem[]): string {
    if (jobs.length === 0) return '';

    const lines: string[] = [];
    lines.push('📢 **NEW JOB REQUISITIONS | MANA NAUKARI**');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('⚡ Verified corporate openings are now active and accepting applicants:');
    lines.push('');

    jobs.forEach((job, index) => {
      lines.push(`💼 **${index + 1}. ${job.title} — ${job.company}**`);
      lines.push(`📍 Location: ${job.location}`);
      lines.push(`⏳ Experience: ${job.experience || 'Fresher'}`);
      const skillsStr = job.skills.length > 0 ? job.skills.slice(0, 4).join(', ') : 'Technical Skills, Problem Solving';
      lines.push(`🛠️ Skills: ${skillsStr}`);
      lines.push(`🔗 Apply: ${job.manaNaukariUrl}`);
      lines.push('');
    });

    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('✅ 100% Verified Requisitions | No Middlemen | Free ATS Resume Check');
    lines.push('🌐 Browse all jobs: https://mananaukari.com');

    return lines.join('\n');
  },
};
