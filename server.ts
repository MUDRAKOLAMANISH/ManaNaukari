import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import {
  ingestDocument,
  addTextKnowledgeEntry,
  editTextKnowledgeEntry,
  deleteDocument,
  addFaq,
  deleteFaq,
  rebuildKnowledgeIndex,
  getKnowledgeStats,
  listDocuments,
  getDocumentPreview,
  listFaqs,
  queryRag,
  KNOWLEDGE_CATEGORIES,
} from './src/server/knowledgeEngine';

const app = express();
const port = 3000;

app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// Helper to parse meaningful company name and title from URL slugs as an intelligent fallback
function parseFallbackFromUrl(inputUrl: string) {
  try {
    const parsed = new URL(inputUrl);
    const hostname = parsed.hostname.replace(/^www\./, '');
    const domainParts = hostname.split('.');
    let companyName = '';
    if (domainParts.length >= 2) {
      const candidate = domainParts[0];
      companyName = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      if (companyName.toLowerCase() === 'jobs' || companyName.toLowerCase() === 'careers') {
        companyName = domainParts[1] ? domainParts[1].charAt(0).toUpperCase() + domainParts[1].slice(1) : '';
      }
    }

    // Extract title keywords from pathname (e.g. /careers/software-engineer-intern)
    const segments = parsed.pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1] || '';
    const cleanSegment = decodeURIComponent(lastSegment)
      .replace(/[-_]/g, ' ')
      .replace(/\b(jobs?|careers?|apply|req|id|[0-9]{4,})\b/gi, '')
      .trim();

    const title = cleanSegment
      ? cleanSegment.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.substring(1).toLowerCase())
      : '';

    return {
      title,
      company: companyName,
      location: 'Pan India',
      experience: 'Fresher',
      job_type: 'Fresher',
      category: 'Software Engineering',
      skills_required: [],
      salary: '',
      description: '',
      apply_link: inputUrl,
      source: 'Official Careers Portal',
    };
  } catch {
    return {
      title: '',
      company: '',
      location: 'Pan India',
      experience: 'Fresher',
      job_type: 'Fresher',
      category: 'Software Engineering',
      skills_required: [],
      salary: '',
      description: '',
      apply_link: inputUrl,
      source: 'Official Careers Portal',
    };
  }
}

// Server-side AI Job Extraction endpoint
app.post('/api/ai/extract-job', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Valid job URL is required.' });
  }

  const trimmedUrl = url.trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return res.status(400).json({ error: 'URL must start with http:// or https://' });
  }

  // Pre-calculate URL heuristic fallback
  const urlFallbackData = parseFallbackFromUrl(trimmedUrl);

  // Step 1: Attempt to fetch page content (handle 403, 404, CORS or anti-bot gracefully)
  let htmlContent = '';
  try {
    const response = await fetch(trimmedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000), // 8s timeout
    });

    if (response.ok) {
      htmlContent = await response.text();
    }
  } catch (fetchErr: any) {
    // Non-fatal: Many corporate ATS block scraping with 403.
    // Continue with URL and metadata inference.
  }

  // Clean html content if available
  const cleanedText = htmlContent
    ? htmlContent
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
        .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 16000)
    : '';

  // Step 2: Call Gemini API with automatic model failover
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // No API key - return fallback data with status flag
    return res.json({
      success: true,
      data: urlFallbackData,
      isFallback: true,
      message: 'AI key not available. Using URL structure.',
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are an expert technical recruitment data extraction assistant for an Indian job portal (Career Vault Jobs).
Extract structured job posting fields accurately from the provided job requisition webpage or URL.

Rules:
1. title: The job title (e.g., "Associate Software Engineer", "Data Analyst Intern", "Graduate Engineer Trainee").
2. company: The official hiring company name (e.g., "Tata Consultancy Services", "Infosys", "Amazon", "Cognizant").
3. location: The workplace location (e.g., "Bengaluru", "Hyderabad", "Pune", "Remote", "Pan India").
4. experience: Experience required (e.g., "Fresher", "0-1 Years", "1-3 Years", "Fresher / Final Year").
5. job_type: Choose best from: "Fresher", "Internship", "Full Time", "Part Time", "Contract".
6. category: Choose best from: "Software Engineering", "Data & Analytics", "QA & Testing", "Cloud & DevOps", "Operations & Support", "Product & Business", "Internship".
7. skills_required: An array of key required technical and soft skills (e.g., ["Java", "SQL", "Spring Boot", "Git"]).
8. salary: Explicit salary or stipend if mentioned (e.g., "₹3.5 - 4.5 LPA", "₹25,000 / month"), or null if undisclosed.
9. description: Comprehensive, structured job description in markdown formatting including About Opportunity, Responsibilities, and Eligibility Criteria.
10. apply_link: Keep the official URL provided as the apply_link.
11. source: The platform or company portal (e.g., "Workday", "Greenhouse", "TCS iON", "Careers Portal").`;

  const prompt = `Please extract the job information from this job posting:
Target URL: ${trimmedUrl}

Webpage text content:
${cleanedText || 'No page content could be directly scraped due to firewall. Infer company and role strictly from the URL structure and domain.'}
`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING },
      company: { type: Type.STRING },
      location: { type: Type.STRING },
      experience: { type: Type.STRING },
      job_type: { type: Type.STRING },
      category: { type: Type.STRING },
      skills_required: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      salary: { type: Type.STRING },
      description: { type: Type.STRING },
      apply_link: { type: Type.STRING },
      source: { type: Type.STRING },
    },
    required: ['title', 'company', 'location', 'experience', 'job_type', 'category', 'description'],
  };

  // Models to try in order: 'gemini-3.1-flash-lite' (highest availability during peak demand) -> 'gemini-3.8-flash'
  const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

      const responseText = response.text;
      if (responseText) {
        const parsedData = JSON.parse(responseText);

        // Ensure apply_link is set
        if (!parsedData.apply_link || !parsedData.apply_link.startsWith('http')) {
          parsedData.apply_link = trimmedUrl;
        }

        return res.json({
          success: true,
          data: parsedData,
          isFallback: false,
        });
      }
    } catch (modelErr: any) {
      // If 503 high demand or unavailable, attempt next model or fall through to graceful fallback
      console.warn(`Model ${model} extraction failed (${modelErr?.status || modelErr?.message}), trying next fallback...`);
    }
  }

  // If both models are under high demand (503), return success: true with isFallback: true
  // so the client seamlessly opens the form with the prefilled URL without failing.
  return res.json({
    success: true,
    data: urlFallbackData,
    isFallback: true,
    message: 'AI models currently experiencing high demand. Opening manual entry mode.',
  });
});

// Endpoint to send Welcome Job Alerts Email via Resend
app.post('/api/alerts/send-welcome-email', async (req, res) => {
  const { email, categories, frequency } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('[Resend] RESEND_API_KEY is not configured in environment. Skipping welcome email.');
    return res.json({
      success: false,
      message: 'RESEND_API_KEY not configured.',
      skipped: true,
    });
  }

  const cleanEmail = email.trim();
  const selectedPrefs = Array.isArray(categories) && categories.length > 0
    ? categories.join(', ')
    : 'All Categories';
  const alertFrequency = frequency === 'instant' ? 'Instant Alerts' : 'Daily Digest';

  const plainTextContent = `Hello,

Thank you for subscribing to Mana Naukari Job Alerts.

You will now receive:

✅ Freshers Jobs
✅ Internship Opportunities
✅ Work From Home Jobs
✅ Off Campus Drives
✅ Entry Level Hiring Updates

based on your selected preferences (${selectedPrefs} - ${alertFrequency}).

We only share genuine opportunities from official company sources.

Best wishes for your career journey.

Team Mana Naukari`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to Mana Naukari Job Alerts</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; line-height: 1.6;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="margin-bottom: 24px;">
      <h2 style="color: #2563eb; margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">Mana Naukari</h2>
      <div style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
        Career Alerts Activated 🚀
      </div>
    </div>
    
    <p style="font-size: 15px; margin-top: 0; margin-bottom: 16px;">Hello,</p>
    
    <p style="font-size: 15px; margin-bottom: 20px;">
      Thank you for subscribing to <strong>Mana Naukari Job Alerts</strong>.
    </p>
    
    <p style="font-size: 15px; margin-bottom: 12px; font-weight: 600;">You will now receive:</p>
    <ul style="list-style: none; padding-left: 0; margin: 0 0 20px 0;">
      <li style="padding: 6px 0; font-size: 14px;">✅ <strong>Freshers Jobs</strong></li>
      <li style="padding: 6px 0; font-size: 14px;">✅ <strong>Internship Opportunities</strong></li>
      <li style="padding: 6px 0; font-size: 14px;">✅ <strong>Work From Home Jobs</strong></li>
      <li style="padding: 6px 0; font-size: 14px;">✅ <strong>Off Campus Drives</strong></li>
      <li style="padding: 6px 0; font-size: 14px;">✅ <strong>Entry Level Hiring Updates</strong></li>
    </ul>

    <div style="background-color: #f1f5f9; border-radius: 12px; padding: 14px 16px; margin-bottom: 24px; font-size: 13px; color: #475569;">
      <strong>Selected Preferences:</strong> ${selectedPrefs}<br/>
      <strong>Alert Schedule:</strong> ${alertFrequency}
    </div>

    <p style="font-size: 14px; color: #334155; margin-bottom: 24px;">
      We only share genuine opportunities from official company sources.
    </p>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px;">
      <p style="margin: 0 0 4px 0; color: #64748b;">Best wishes for your career journey,</p>
      <p style="margin: 0; font-weight: 700; color: #0f172a;">Team Mana Naukari</p>
    </div>
  </div>
</body>
</html>`;

  // If RESEND_FROM_EMAIL is provided (e.g. from a verified domain alerts@mananaukari.in), use it.
  // Otherwise default to onboarding@resend.dev
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: cleanEmail,
        subject: 'Welcome to Mana Naukari Job Alerts 🚀',
        text: plainTextContent,
        html: htmlContent,
      }),
    });

    const responseText = await resendResponse.text();
    let resendData: any = null;
    try {
      resendData = JSON.parse(responseText);
    } catch {
      resendData = { raw: responseText };
    }

    if (!resendResponse.ok) {
      console.error('[Resend Error] Status:', resendResponse.status);
      console.error('[Resend Error] Full Response Body:', JSON.stringify(resendData, null, 2));

      // Check for Resend testing domain restriction (sending to unverified recipient with onboarding@resend.dev)
      if (resendResponse.status === 403 && resendData?.name === 'validation_error' && responseText.includes('resend.com/domains')) {
        console.warn(
          `[Resend Notice] Email to ${cleanEmail} was skipped because onboarding@resend.dev is in testing mode on Resend. ` +
          `To send emails to arbitrary recipients, verify a custom domain at resend.com/domains and configure RESEND_FROM_EMAIL. ` +
          `Subscriber was successfully saved in Supabase.`
        );
        return res.status(200).json({
          success: false,
          warning: 'Testing domain restriction: domain verification required on Resend to send to non-account holders.',
          message: resendData?.message,
          resendResponse: resendData,
          skipped: true,
        });
      }

      return res.status(200).json({
        success: false,
        error: `Resend error (${resendResponse.status}): ${resendData?.message || responseText}`,
        resendResponse: resendData,
      });
    }

    console.log('[Resend Success] Full Resend Response Object:', JSON.stringify(resendData, null, 2));
    return res.status(200).json({
      success: true,
      data: resendData,
      resendResponse: resendData,
    });
  } catch (err: any) {
    console.error('[Resend Exception] Error sending welcome email:', err?.message || err);
    console.error('[Resend Exception] Stack trace:', err?.stack);
    return res.status(200).json({
      success: false,
      error: err?.message || 'Failed to dispatch welcome email via Resend.',
    });
  }
});

// In-memory persistent alert delivery audit log buffer (keeps recent 200 delivery attempts)
interface DeliveryAuditLog {
  id: string;
  job_id: string;
  job_title: string;
  job_category: string;
  company: string;
  recipient_email: string;
  status: 'sent' | 'failed' | 'skipped';
  resend_id?: string | null;
  error_message?: string | null;
  created_at: string;
}

const jobAlertDeliveryLogs: DeliveryAuditLog[] = [];

// Endpoint to send Job Alert Emails to matching active subscribers
app.post('/api/alerts/send-job-alert', async (req, res) => {
  const { job } = req.body;

  if (!job || !job.title || !job.category) {
    return res.status(400).json({ error: 'Valid job object with title and category is required.' });
  }

  // Only broadcast if job is active
  if (job.status !== 'active') {
    return res.json({
      success: true,
      message: 'Job status is not active. Alerts skipped.',
      sentCount: 0,
      matchedCount: 0,
    });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const appBaseUrl = process.env.APP_URL || 'https://mananaukari.in';

  const jobTitle = job.title.trim();
  const jobCategory = job.category.trim();
  const company = job.company ? job.company.trim() : 'Verified Employer';
  const location = job.location ? job.location.trim() : 'Pan India';
  const experience = job.experience ? job.experience.trim() : 'Fresher';
  const applyLink = job.apply_link || '#';
  const jobId = job.id || '';
  const jobDetailUrl = jobId ? `${appBaseUrl.replace(/\/$/, '')}/jobs/${jobId}` : applyLink;

  try {
    // Fetch all active subscribers from Supabase via REST / server
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    let subscribers: any[] = [];
    if (supabaseUrl && supabaseAnonKey) {
      const subRes = await fetch(`${supabaseUrl}/rest/v1/job_alert_subscribers?select=*`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });

      if (subRes.ok) {
        subscribers = await subRes.json();
      } else {
        console.warn('[JobAlert Broadcast] Could not fetch subscribers via REST:', subRes.status);
      }
    }

    // Filter subscribers:
    // 1. Must be active (is_active !== false)
    // 2. Must match the job category (case-insensitive substring or match in categories array)
    const normalizedJobCategory = jobCategory.toLowerCase();
    const matchingSubscribers = subscribers.filter((sub) => {
      if (sub.is_active === false) return false;
      const cats: string[] = Array.isArray(sub.categories) ? sub.categories : [];
      if (cats.length === 0) return true; // If subscribed to all
      return cats.some((c) => {
        const norm = (c || '').toLowerCase().trim();
        return norm === normalizedJobCategory || normalizedJobCategory.includes(norm) || norm.includes(normalizedJobCategory);
      });
    });

    console.log(`[JobAlert Broadcast] Job "${jobTitle}" (${jobCategory}) matched ${matchingSubscribers.length} of ${subscribers.length} total subscribers.`);

    if (matchingSubscribers.length === 0) {
      return res.json({
        success: true,
        message: 'No matching active subscribers for this category.',
        matchedCount: 0,
        sentCount: 0,
      });
    }

    if (!resendApiKey) {
      console.warn('[JobAlert Broadcast] RESEND_API_KEY is not configured. Delivery skipped.');
      matchingSubscribers.forEach((sub) => {
        jobAlertDeliveryLogs.unshift({
          id: Math.random().toString(36).substring(2, 9),
          job_id: jobId,
          job_title: jobTitle,
          job_category: jobCategory,
          company,
          recipient_email: sub.email,
          status: 'skipped',
          error_message: 'RESEND_API_KEY not configured',
          created_at: new Date().toISOString(),
        });
      });
      return res.json({
        success: false,
        message: 'RESEND_API_KEY not configured.',
        matchedCount: matchingSubscribers.length,
        sentCount: 0,
      });
    }

    let successCount = 0;
    let failCount = 0;
    const sendResults: any[] = [];

    // Send personalized alert email to each matching subscriber
    for (const sub of matchingSubscribers) {
      const recipientEmail = (sub.email || '').trim().toLowerCase();
      if (!recipientEmail) continue;

      const plainText = `New Job Opening Alert: ${jobTitle} at ${company}

Hello,

A new verified job opportunity matching your preferred category (${jobCategory}) is now active on Mana Naukari!

Job Details:
- Title: ${jobTitle}
- Company: ${company}
- Location: ${location}
- Experience: ${experience}
- Category: ${jobCategory}

View Job Details: ${jobDetailUrl}
Official Direct Application: ${applyLink}

We only share genuine opportunities directly from official career portals.

Best wishes,
Team Mana Naukari
      `;

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Job Alert: ${jobTitle} at ${company}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; line-height: 1.6;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    
    <!-- Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 24px;">
      <div>
        <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 800;">Mana Naukari</h2>
        <span style="font-size: 12px; color: #64748b;">Verified Career Alerts</span>
      </div>
      <div style="background-color: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
        ${jobCategory}
      </div>
    </div>

    <p style="font-size: 15px; margin: 0 0 16px 0;">Hello,</p>
    <p style="font-size: 15px; margin: 0 0 20px 0; color: #334155;">
      A new verified job opportunity matching your preferences was just posted!
    </p>

    <!-- Job Card Box -->
    <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 20px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 6px 0; color: #0f172a; font-size: 18px; font-weight: 800;">${jobTitle}</h3>
      <p style="margin: 0 0 14px 0; color: #2563eb; font-size: 14px; font-weight: 700;">🏢 ${company}</p>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #475569; margin-bottom: 20px;">
        <div style="padding: 6px 10px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong>📍 Location:</strong> ${location}
        </div>
        <div style="padding: 6px 10px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
          <strong>🎓 Experience:</strong> ${experience}
        </div>
      </div>

      <!-- Action Buttons -->
      <table width="100%" cellspacing="0" cellpadding="0" style="margin-top: 10px;">
        <tr>
          <td align="center" style="padding-right: 6px;">
            <a href="${applyLink}" target="_blank" style="display: block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 20px; border-radius: 10px; text-align: center;">
              Apply Directly ↗
            </a>
          </td>
          <td align="center" style="padding-left: 6px;">
            <a href="${jobDetailUrl}" target="_blank" style="display: block; background-color: #f1f5f9; color: #1e293b; border: 1px solid #cbd5e1; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 20px; border-radius: 10px; text-align: center;">
              View Details
            </a>
          </td>
        </tr>
      </table>
    </div>

    <p style="font-size: 13px; color: #64748b; margin-bottom: 24px;">
      🔒 100% Genuine: We curate exclusively from official employer career portals.
    </p>

    <!-- Footer -->
    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #94a3b8;">
      <p style="margin: 0 0 4px 0;">Best wishes for your job hunt,</p>
      <strong style="color: #475569;">Team Mana Naukari</strong>
    </div>
  </div>
</body>
</html>`;

      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey.trim()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: recipientEmail,
            subject: `New Job Opening: ${jobTitle} at ${company} 🚀`,
            text: plainText,
            html: htmlContent,
          }),
        });

        const resText = await resendRes.text();
        let resData: any = null;
        try {
          resData = JSON.parse(resText);
        } catch {
          resData = { raw: resText };
        }

        if (resendRes.ok) {
          successCount++;
          console.log(`[JobAlert Broadcast] Successfully delivered alert to ${recipientEmail}`);
          const logEntry: DeliveryAuditLog = {
            id: resData?.id || Math.random().toString(36).substring(2, 9),
            job_id: jobId,
            job_title: jobTitle,
            job_category: jobCategory,
            company,
            recipient_email: recipientEmail,
            status: 'sent',
            resend_id: resData?.id || null,
            created_at: new Date().toISOString(),
          };
          jobAlertDeliveryLogs.unshift(logEntry);
          sendResults.push({ email: recipientEmail, status: 'sent', id: resData?.id });
        } else {
          failCount++;
          console.warn(`[JobAlert Broadcast] Delivery to ${recipientEmail} failed:`, resendRes.status, resData?.message || resText);
          const isTestingLimit = resendRes.status === 403 && resText.includes('resend.com/domains');
          const logEntry: DeliveryAuditLog = {
            id: Math.random().toString(36).substring(2, 9),
            job_id: jobId,
            job_title: jobTitle,
            job_category: jobCategory,
            company,
            recipient_email: recipientEmail,
            status: isTestingLimit ? 'skipped' : 'failed',
            error_message: isTestingLimit ? 'Resend sandbox limit: unverified recipient with onboarding@resend.dev' : (resData?.message || resText),
            created_at: new Date().toISOString(),
          };
          jobAlertDeliveryLogs.unshift(logEntry);
          sendResults.push({ email: recipientEmail, status: logEntry.status, error: logEntry.error_message });
        }
      } catch (sendErr: any) {
        failCount++;
        console.error(`[JobAlert Broadcast] Exception sending to ${recipientEmail}:`, sendErr);
        jobAlertDeliveryLogs.unshift({
          id: Math.random().toString(36).substring(2, 9),
          job_id: jobId,
          job_title: jobTitle,
          job_category: jobCategory,
          company,
          recipient_email: recipientEmail,
          status: 'failed',
          error_message: sendErr?.message || 'Network exception',
          created_at: new Date().toISOString(),
        });
      }

      // Keep audit log capped at 200 entries
      if (jobAlertDeliveryLogs.length > 200) {
        jobAlertDeliveryLogs.length = 200;
      }
    }

    return res.status(200).json({
      success: true,
      message: `Alert broadcast finished: ${successCount} sent, ${failCount} failed/skipped.`,
      matchedCount: matchingSubscribers.length,
      sentCount: successCount,
      failedCount: failCount,
      results: sendResults,
    });
  } catch (err: any) {
    console.error('[JobAlert Broadcast Fatal Exception]:', err?.message || err);
    return res.status(200).json({
      success: false,
      error: err?.message || 'Failed to complete job alert broadcast.',
    });
  }
});

// Endpoint to retrieve Alert Delivery Statistics & Logs for Admin Dashboard
app.get('/api/alerts/delivery-stats', async (_req, res) => {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    let totalSubscribers = 0;
    let activeSubscribers = 0;

    if (supabaseUrl && supabaseAnonKey) {
      const subRes = await fetch(`${supabaseUrl}/rest/v1/job_alert_subscribers?select=id,is_active`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });

      if (subRes.ok) {
        const subs = await subRes.json();
        totalSubscribers = subs.length;
        activeSubscribers = subs.filter((s: any) => s.is_active !== false).length;
      }
    }

    const successfulDeliveries = jobAlertDeliveryLogs.filter((l) => l.status === 'sent').length;
    const failedDeliveries = jobAlertDeliveryLogs.filter((l) => l.status === 'failed' || l.status === 'skipped').length;
    const totalAlertsSent = jobAlertDeliveryLogs.length;

    return res.json({
      success: true,
      data: {
        totalAlertsSent,
        totalSubscribers,
        activeSubscribers,
        successfulDeliveries,
        failedDeliveries,
        recentDeliveries: jobAlertDeliveryLogs.slice(0, 30),
      },
    });
  } catch (err: any) {
    console.error('[Delivery Stats Error]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to get alert stats',
    });
  }
});

// ==========================================
// KNOWLEDGE BASE & AI RAG CHATBOT ENDPOINTS
// ==========================================

// 1. Get stats
app.get('/api/knowledge/stats', (_req, res) => {
  try {
    const stats = getKnowledgeStats();
    return res.json({ success: true, stats, categories: KNOWLEDGE_CATEGORIES });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 2. List documents and text entries with optional category & search filter
app.get('/api/knowledge/documents', (req, res) => {
  try {
    const { category, search } = req.query;
    const documents = listDocuments(category as string, search as string);
    return res.json({ success: true, documents });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Document preview inspection endpoint
app.get('/api/knowledge/preview/:id', (req, res) => {
  try {
    const { id } = req.params;
    const preview = getDocumentPreview(id);
    if (!preview) {
      return res.status(404).json({ success: false, error: 'Knowledge document not found.' });
    }
    return res.json({ success: true, ...preview });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Upload & index PDF, DOCX, TXT document
app.post('/api/knowledge/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' && ext !== '.docx' && ext !== '.txt') {
      return res.status(400).json({
        success: false,
        error: 'Supported file formats: PDF (.pdf), Word (.docx), and Plain Text (.txt).',
      });
    }

    const fileType = ext === '.pdf' ? 'pdf' : ext === '.docx' ? 'docx' : 'txt';
    const category = req.body?.category || 'General';
    const customTitle = req.body?.title ? req.body.title.trim() : undefined;

    const { document: doc, extraction } = await ingestDocument(
      file.originalname,
      file.buffer,
      fileType,
      category,
      customTitle
    );

    return res.json({
      success: true,
      document: doc,
      extraction: {
        fileName: extraction.fileName,
        pages: extraction.pages,
        charactersExtracted: extraction.charactersExtracted,
        previewText: extraction.previewText,
      },
    });
  } catch (err: any) {
    console.error('[Knowledge Upload Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Unable to extract text from this document. Please upload a readable PDF or add content manually.',
    });
  }
});

// 5. Add manual Text Knowledge Entry (Paste Text)
app.post('/api/knowledge/text-entry', async (req, res) => {
  try {
    const { title, category, content } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required for manual text entry.',
      });
    }

    const { document: doc, extraction } = await addTextKnowledgeEntry(
      title.trim(),
      category?.trim() || 'General',
      content.trim()
    );

    return res.json({
      success: true,
      document: doc,
      extraction: {
        fileName: extraction.fileName,
        pages: extraction.pages,
        charactersExtracted: extraction.charactersExtracted,
        previewText: extraction.previewText,
      },
    });
  } catch (err: any) {
    console.error('[Add Text Knowledge Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error saving text knowledge entry.',
    });
  }
});

// 6. Edit existing Text Knowledge Entry
app.put('/api/knowledge/text-entry/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, content } = req.body;
    if (!title || !title.trim() || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Title and content are required.',
      });
    }

    const doc = await editTextKnowledgeEntry(
      id,
      title.trim(),
      category?.trim() || 'General',
      content.trim()
    );

    return res.json({ success: true, document: doc });
  } catch (err: any) {
    console.error('[Edit Text Knowledge Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error updating text knowledge entry.',
    });
  }
});

// 7. Delete document or text entry
app.delete('/api/knowledge/documents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteDocument(id);
    return res.json({ success: deleted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 8. List FAQs
app.get('/api/knowledge/faqs', (_req, res) => {
  try {
    const faqs = listFaqs();
    return res.json({ success: true, faqs });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Add manual FAQ
app.post('/api/knowledge/faqs', async (req, res) => {
  try {
    const { question, answer, category } = req.body;
    if (!question || !question.trim() || !answer || !answer.trim()) {
      return res.status(400).json({ success: false, error: 'Question and answer are required.' });
    }

    const faq = await addFaq(question.trim(), answer.trim(), category?.trim() || 'General');
    return res.json({ success: true, faq });
  } catch (err: any) {
    console.error('[Add FAQ Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Delete FAQ
app.delete('/api/knowledge/faqs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteFaq(id);
    return res.json({ success: deleted });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 11. Rebuild knowledge vector embeddings index
app.post('/api/knowledge/rebuild-index', async (_req, res) => {
  try {
    const result = await rebuildKnowledgeIndex();
    return res.json({ success: true, result });
  } catch (err: any) {
    console.error('[Rebuild Index Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 12. AI Chatbot RAG query endpoint (strict anti-hallucination)
app.post('/api/knowledge/chat', async (req, res) => {
  try {
    const { message, history, retrievedContext } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message string is required.',
      });
    }

    const result = await queryRag(message, history || [], retrievedContext);
    return res.json({
      success: true,
      answer: result.answer,
      citations: result.citations,
      matched: result.matched,
    });
  } catch (err: any) {
    console.error('[Chatbot RAG Error]:', err);
    return res.status(500).json({
      success: false,
      answer: 'I could not find this information in the Mana Naukari Knowledge Base.',
      citations: [],
      matched: false,
      error: err.message,
    });
  }
});

// Mount Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Career Vault Jobs server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
