import { GoogleGenAI, Type } from '@google/genai';

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

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event: any) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  try {
    let body: any = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid JSON request body.' }),
      };
    }

    const { url } = body;
    if (!url || typeof url !== 'string') {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Valid job URL is required.' }),
      };
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'URL must start with http:// or https://' }),
      };
    }

    const urlFallbackData = parseFallbackFromUrl(trimmedUrl);

    // Step 1: Scrape webpage content
    let htmlContent = '';
    try {
      const response = await fetch(trimmedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        htmlContent = await response.text();
      }
    } catch (fetchErr) {
      console.warn('[Netlify Function extract-job] Page fetch notice:', fetchErr);
    }

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

    // Step 2: Call Gemini API
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[Netlify Function extract-job] GEMINI_API_KEY not configured in Netlify environment variables.');
      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          success: true,
          data: urlFallbackData,
          isFallback: true,
          message: 'GEMINI_API_KEY not configured in Netlify environment variables. Using URL structure.',
        }),
      };
    }

    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are an expert technical recruitment data extraction assistant for an Indian job portal (Career Vault Jobs / Mana Naukari).
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
${cleanedText || 'No page content could be directly scraped due to firewall. Infer company and role strictly from the URL structure and domain.'}`;

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
          if (!parsedData.apply_link || !parsedData.apply_link.startsWith('http')) {
            parsedData.apply_link = trimmedUrl;
          }

          return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: JSON.stringify({
              success: true,
              data: parsedData,
              isFallback: false,
            }),
          };
        }
      } catch (modelErr: any) {
        console.warn(`[Netlify Function extract-job] Model ${model} failed (${modelErr?.message}), trying fallback...`);
      }
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: true,
        data: urlFallbackData,
        isFallback: true,
        message: 'AI models under high demand. Using extracted URL structure.',
      }),
    };
  } catch (err: any) {
    console.error('[Netlify Function extract-job] Error:', err);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        success: false,
        error: err.message || 'Internal server error during job extraction.',
      }),
    };
  }
};
