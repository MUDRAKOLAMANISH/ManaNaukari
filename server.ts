import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import multer from 'multer';
import {
  extractTextFromPdf,
  extractTextFromDocx,
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
import { calculateFallbackAtsMatch } from './src/utils/atsKeywordMatcher';
import { jobAvailabilityService } from './src/services/jobAvailabilityService';

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

  const systemInstruction = `You are an expert technical recruitment data extraction assistant for an Indian job portal (Mana Career).
Extract structured job posting fields accurately and comprehensively from the provided job requisition webpage or URL.

Rules:
1. title: The exact job title (e.g., "Associate Software Engineer", "Data Analyst Intern", "Graduate Engineer Trainee").
2. company: The official hiring company name (e.g., "Tata Consultancy Services", "Infosys", "Amazon", "Cognizant").
3. location: The workplace location (e.g., "Bengaluru", "Hyderabad", "Pune", "Remote", "Pan India").
4. experience: Required experience (e.g., "Fresher", "0-1 Years", "1-3 Years", "Fresher / 2024-2026 Batch").
5. job_type: Choose best from: "Fresher", "Internship", "Full Time", "Part Time", "Contract".
6. category: Choose best from: "Software Engineering", "Data & Analytics", "QA & Testing", "Cloud & DevOps", "Operations & Support", "Product & Business", "Internship".
7. skills_required: An array of key required technical and soft skills (e.g., ["Java", "SQL", "Spring Boot", "Git"]).
8. salary: Explicit salary or stipend if mentioned (e.g., "₹3.5 - 4.5 LPA", "₹25,000 / month"), or "Best in Industry" if undisclosed.
9. description: Exceptionally detailed, well-structured job description formatted in clear Markdown containing:
   - ### About the Role & Opportunity: Comprehensive overview of the position at the company.
   - ### Key Responsibilities: Bullet points detailing day-to-day duties and deliverables.
   - ### Eligibility & Qualifications: Degree requirements (B.E / B.Tech / MCA / M.Tech / Degree), eligible batch years (e.g., 2023, 2024, 2025, 2026), and CGPA/Percentage criteria.
   - ### Technical & Skill Expectations: Core languages, frameworks, problem-solving, and communication skills required.
   - ### Application & Selection Process: Assessment rounds, technical interviews, and how to apply.
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

// Endpoint: ATS Resume Matcher & Score Engine (LinkedIn Premium / Workday style)
app.post('/api/ats/analyze', upload.single('resume'), async (req, res) => {
  try {
    const file = req.file;
    const {
      job_id,
      job_title = 'Job Requisition',
      company = 'Company',
      job_description = '',
      skills_required = '',
      experience = 'Fresher',
      category = 'General',
      candidate_name = '',
      candidate_email = '',
      candidate_phone = '',
    } = req.body;

    if (!file) {
      return res.status(400).json({ success: false, error: 'Resume file is required (PDF, DOCX, or TXT).' });
    }

    console.log(`[ATS Server] Analyzing resume for job "${job_title}" at "${company}", File: ${file.originalname} (${file.size} bytes)`);

    // 1. Extract text from uploaded resume buffer
    let resumeText = '';
    const ext = path.extname(file.originalname).toLowerCase();

    try {
      if (ext === '.pdf') {
        const pdfResult = await extractTextFromPdf(file.buffer);
        resumeText = pdfResult.text;
      } else if (ext === '.docx' || ext === '.doc') {
        const docxResult = await extractTextFromDocx(file.buffer);
        resumeText = docxResult.text;
      } else {
        resumeText = file.buffer.toString('utf-8');
      }
    } catch (extractErr) {
      console.warn('[ATS Server] Primary text extraction warning, extracting ASCII fallback:', extractErr);
      const bytes = new Uint8Array(file.buffer);
      let ascii = '';
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes[i];
        if (b >= 32 && b <= 126) ascii += String.fromCharCode(b);
        else if (b === 10 || b === 13) ascii += ' ';
      }
      resumeText = ascii.slice(0, 50000);
    }

    if (!resumeText || resumeText.trim().length < 10) {
      resumeText = file.originalname.replace(/[-_.]/g, ' ');
    }

    console.log(`[ATS Server] Extracted ${resumeText.length} characters from resume.`);

    // 2. Try Gemini 3.8 Flash AI Analysis if API key is configured
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are a world-class Applicant Tracking System (ATS) scoring engine (like LinkedIn Premium / Workday ATS).
Analyze the candidate's resume text against this job posting.

Target Job Details:
- Title: ${job_title}
- Company: ${company}
- Experience Requirement: ${experience}
- Category: ${category}
- Required Skills: ${skills_required}
- Job Description:
"""
${job_description.slice(0, 8000)}
"""

Candidate Resume Text:
"""
${resumeText.slice(0, 25000)}
"""

Provide an objective, enterprise-grade ATS evaluation:
1. match_percentage: Integer 0-100 reflecting overall ATS qualification.
2. skills_score: Integer 0-100 for core skill overlap.
3. experience_score: Integer 0-100 for work/project history alignment.
4. education_score: Integer 0-100 for academic/certification alignment.
5. keyword_score: Integer 0-100 for ATS keyword density.
6. matched_skills: Array of strings of skills identified in BOTH resume and job description.
7. missing_skills: Array of strings of required/preferred job skills that are absent from the resume.
8. recommendations: Array of 3-4 concise, high-value recommendations to optimize the resume.
9. strengths: Array of 2-3 specific advantages of this candidate.
10. summary: 2-sentence executive summary.

Return pure JSON.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [{ text: prompt }],
          config: {
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text ? response.text.trim() : '';
        if (rawText) {
          const aiJson = JSON.parse(rawText);
          const resultData = {
            job_id: String(job_id || ''),
            job_title,
            company,
            candidate_name: candidate_name || undefined,
            candidate_email: candidate_email || undefined,
            candidate_phone: candidate_phone || undefined,
            resume_file_name: file.originalname,
            match_percentage: Math.min(100, Math.max(20, Math.round(Number(aiJson.match_percentage) || 75))),
            skills_score: Math.min(100, Math.max(20, Math.round(Number(aiJson.skills_score) || 75))),
            experience_score: Math.min(100, Math.max(20, Math.round(Number(aiJson.experience_score) || 75))),
            education_score: Math.min(100, Math.max(20, Math.round(Number(aiJson.education_score) || 80))),
            keyword_score: Math.min(100, Math.max(20, Math.round(Number(aiJson.keyword_score) || 70))),
            matched_skills: Array.isArray(aiJson.matched_skills) ? aiJson.matched_skills : [],
            missing_skills: Array.isArray(aiJson.missing_skills) ? aiJson.missing_skills : [],
            recommendations: Array.isArray(aiJson.recommendations) ? aiJson.recommendations : [],
            strengths: Array.isArray(aiJson.strengths) ? aiJson.strengths : [],
            summary: aiJson.summary || `Resume shows high alignment with ${company}'s requirements for ${job_title}.`,
            analysis_source: 'ai',
            created_at: new Date().toISOString(),
          };

          console.log(`[ATS Server] AI analysis complete. Score: ${resultData.match_percentage}%`);
          return res.json({ success: true, data: resultData });
        }
      } catch (geminiErr: any) {
        console.warn('[ATS Server] Gemini AI scoring failed, engaging deterministic fallback:', geminiErr?.message);
      }
    } else {
      console.warn('[ATS Server] GEMINI_API_KEY not configured, engaging deterministic fallback.');
    }

    // 3. Fallback: Deterministic Keyword & Heuristics Matcher
    const fallback = calculateFallbackAtsMatch({
      resumeText,
      resumeFileName: file.originalname,
      jobId: String(job_id || ''),
      jobTitle: job_title,
      company,
      jobDescription: job_description,
      skillsRequired: skills_required,
      experienceRequired: experience,
      candidateName: candidate_name,
      candidateEmail: candidate_email,
      candidatePhone: candidate_phone,
    });

    console.log(`[ATS Server] Deterministic fallback complete. Score: ${fallback.match_percentage}%`);
    return res.json({ success: true, data: fallback });
  } catch (err: any) {
    console.error('[ATS Server] Uncaught error in /api/ats/analyze:', err);
    return res.status(500).json({ success: false, error: err.message || 'ATS analysis failed' });
  }
});

// --- AI MOCK INTERVIEW API ENDPOINTS ---

// Endpoint 1: Generate AI Mock Interview Questions
app.post('/api/ai/mock-interview/generate-questions', async (req, res) => {
  try {
    const { role = 'Software Engineer', customRole, experienceLevel = 'Fresher', companyType = 'IT Service', questionCount = 3, languageMode = 'English' } = req.body;
    const targetRole = customRole || role;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ success: false, message: 'GEMINI_API_KEY not configured. Using client fallback.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are an elite Technical Hiring Manager at an Indian technology company (${companyType} - e.g. TCS, Infosys, Wipro, Amazon, product startup).
Generate realistic, high-yield interview questions for an entry-level / fresher candidate applying for ${targetRole} (${experienceLevel}).
Language tone requested: ${languageMode}.

Generate exactly ${questionCount} structured questions.
Each question must include:
- id: string (e.g. "q1", "q2")
- questionText: clear, realistic interview question
- hints: array of 2-3 helpful hints
- expectedKeyPoints: array of 3-4 key concepts or terms the candidate should mention
- category: topic category (e.g., "Technical Core", "Behavioral / HR", "System Design & Logic", "Coding / Project")
- timeLimitSeconds: integer timer limit (120 or 180 seconds)

Return PURE JSON in this schema:
{
  "questions": [
    {
      "id": "q1",
      "questionText": "...",
      "hints": ["...", "..."],
      "expectedKeyPoints": ["...", "..."],
      "category": "...",
      "timeLimitSeconds": 120
    }
  ]
}`;

    const prompt = `Generate ${questionCount} realistic interview questions for:
Role: ${targetRole}
Experience: ${experienceLevel}
Company Context: ${companyType}
Language Preference: ${languageMode}`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ text: prompt }],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text ? response.text.trim() : '';
        if (rawText) {
          const jsonResult = JSON.parse(rawText);
          if (jsonResult.questions && Array.isArray(jsonResult.questions)) {
            return res.json({ success: true, questions: jsonResult.questions });
          }
        }
      } catch (mErr: any) {
        console.warn(`[MockInterview] Model ${model} question gen failed:`, mErr?.message);
      }
    }

    return res.json({ success: false, message: 'AI model unavailable. Using fallback.' });
  } catch (err: any) {
    console.error('[MockInterview] Question generation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint 2: Evaluate Answer for a Single Question
app.post('/api/ai/mock-interview/evaluate-answer', async (req, res) => {
  try {
    const { questionText, candidateAnswer, role, experienceLevel, expectedKeyPoints = [], languageMode = 'English' } = req.body;

    if (!candidateAnswer || typeof candidateAnswer !== 'string' || candidateAnswer.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Candidate answer is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ success: false, message: 'GEMINI_API_KEY not configured. Using client fallback.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are an expert interviewer scoring a candidate's answer for the role of ${role} (${experienceLevel}).
Evaluate the response constructively and strictly based on clarity, technical accuracy, communication, and STAR method (Situation, Task, Action, Result) structure.

Return PURE JSON in this schema:
{
  "score": 0-100 integer overall quality,
  "clarityScore": 0-100 integer,
  "technicalAccuracy": 0-100 integer,
  "communication": 0-100 integer,
  "starStructureScore": 0-100 integer,
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "improvedAnswer": "Comprehensive step-by-step model answer showing how to answer this question brilliantly using STAR method",
  "feedbackSummary": "Encouraging, actionable 2-sentence feedback summary"
}`;

    const prompt = `Question Asked: "${questionText}"
Expected Key Concepts: ${JSON.stringify(expectedKeyPoints)}

Candidate Answer:
"""
${candidateAnswer.trim()}
"""`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ text: prompt }],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text ? response.text.trim() : '';
        if (rawText) {
          const evalJson = JSON.parse(rawText);
          return res.json({ success: true, evaluation: evalJson });
        }
      } catch (mErr: any) {
        console.warn(`[MockInterview] Model ${model} answer eval failed:`, mErr?.message);
      }
    }

    return res.json({ success: false, message: 'AI model unavailable. Using fallback.' });
  } catch (err: any) {
    console.error('[MockInterview] Answer evaluation error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint 3: Generate Overall Interview Final Report
app.post('/api/ai/mock-interview/final-report', async (req, res) => {
  try {
    const { evaluations = [], config = {} } = req.body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ success: false, message: 'GEMINI_API_KEY not configured. Using client fallback.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = `You are an executive career coach for Indian tech graduates.
Analyze all candidate answers and evaluations from this mock interview session and produce a comprehensive diagnostic report.

Return PURE JSON in this schema:
{
  "overallScore": 0-100 integer average performance,
  "headline": "Short diagnostic headline e.g. 'Strong Technical Readiness with Minor Structure Gaps'",
  "readinessStatus": "Ready" | "Almost Ready" | "Needs Practice",
  "communicationRating": "e.g. Excellent / Good / Needs Work",
  "technicalRating": "e.g. Proficient / Fundamental / Advanced",
  "starMethodMastery": "e.g. 70% - Focus on explicitly stating Result metrics",
  "topStrengths": ["string", "string", "string"],
  "keySkillGaps": ["string", "string"],
  "actionableTips": ["string", "string", "string"],
  "recommendedStudyMaterials": ["string", "string", "string"]
}`;

    const prompt = `Candidate Session Details:
Role: ${config.customRole || config.role || 'Software Engineer'}
Experience: ${config.experienceLevel || 'Fresher'}
Evaluations JSON:
${JSON.stringify(evaluations)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{ text: prompt }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const rawText = response.text ? response.text.trim() : '';
    if (rawText) {
      const reportJson = JSON.parse(rawText);
      reportJson.createdAt = new Date().toISOString();
      return res.json({ success: true, report: reportJson });
    }

    return res.json({ success: false, message: 'AI model unavailable. Using fallback.' });
  } catch (err: any) {
    console.error('[MockInterview] Final report error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// --- AI CAREER ROADMAP GENERATION ENDPOINT ---
app.post('/api/ai/career-roadmap/generate', async (req, res) => {
  try {
    const { profile } = req.body;
    if (!profile) {
      return res.status(400).json({ success: false, error: 'Career profile data is required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({ success: false, message: 'GEMINI_API_KEY not configured. Using client fallback.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const roleName = profile.careerGoal?.primaryRole === 'Other' && profile.careerGoal?.customRole
      ? profile.careerGoal.customRole
      : profile.careerGoal?.primaryRole || 'Software Engineer';

    const systemInstruction = `You are an elite Indian Tech Career Strategist & Technical Hiring Advisor.
Generate a structured, highly actionable, beginner-friendly Personal Career Roadmap for a candidate in India.

Rules:
1. Tailor every phase, project, task, and resource specifically to the candidate's target role: "${roleName}".
2. Do NOT generate a generic roadmap. If target role is Data Analyst, use SQL, Excel, Pandas, Power BI. If Python Developer, use Python, REST APIs, Git, PostgreSQL. If AI Application Developer, use Python, Gemini API, RAG, ChromaDB, FastAPI.
3. Be realistic about the timeline (${profile.careerGoal?.targetTimeline || '90 days'}) and weekly learning hours (${profile.careerGoal?.weeklyHours || '6-10 hours'}).
4. Breakdown into 3 distinct phases. Each phase must contain 3 actionable tasks with timeframe and description.
5. Provide 2 practical portfolio project ideas with problem statement, core features, tech stack, and interview tips.
6. Provide specific technical topics, coding exercises, HR prep tips, and a weekly schedule.
7. Output pure JSON matching the requested schema exactly.

JSON Schema format:
{
  "id": "roadmap-string",
  "createdAt": "ISO string",
  "updatedAt": "ISO string",
  "targetRole": "${roleName}",
  "targetTimeline": "${profile.careerGoal?.targetTimeline || '90 days'}",
  "weeklyHours": "${profile.careerGoal?.weeklyHours || '6-10 hours'}",
  "readinessScore": 0-100 integer,
  "readinessAssessment": "2-3 sentence honest, encouraging summary of candidate readiness and path forward",
  "existingSkillsSummary": ["string"],
  "topSkillGaps": ["string"],
  "recommendedNextAction": "string (e.g., Start Phase 1: Python Syntax & Logic)",
  "phases": [
    {
      "id": "p1",
      "title": "Phase 1: ...",
      "duration": "3 Weeks",
      "objectives": ["string"],
      "topicsToStudy": ["string"],
      "practicalExercises": ["string"],
      "expectedOutcome": "string",
      "tasks": [
        {
          "id": "t1",
          "phaseId": "p1",
          "title": "string",
          "description": "string",
          "estimatedHours": 8,
          "status": "not_started",
          "timeframe": "Week 1"
        }
      ]
    }
  ],
  "projects": [
    {
      "id": "proj1",
      "name": "string",
      "problem": "string",
      "requiredSkills": ["string"],
      "coreFeatures": ["string"],
      "techStack": ["string"],
      "deliverable": "string",
      "interviewTip": "string"
    }
  ],
  "interviewPrep": {
    "technicalTopics": ["string"],
    "commonQuestions": ["string"],
    "codingExercises": ["string"],
    "hrPrepTips": ["string"],
    "weeklyMockTip": "string"
  },
  "resumePortfolioPlan": {
    "resumeHighlights": ["string"],
    "portfolioMustHaves": ["string"],
    "githubTips": ["string"],
    "honestDescriptionTips": ["string"]
  },
  "jobSearchStrategy": {
    "whenToStart": "string",
    "targetJobTitles": ["string"],
    "applicationPriorities": ["string"],
    "tailoringTips": ["string"],
    "trackingTips": ["string"]
  },
  "weeklySchedule": {
    "monday": "string",
    "tuesday": "string",
    "wednesday": "string",
    "thursday": "string",
    "friday": "string",
    "saturday": "string",
    "sunday": "string"
  },
  "learningResources": [
    {
      "title": "string",
      "type": "official_doc",
      "url": "https://...",
      "description": "string",
      "isFree": true
    }
  ],
  "manaServicesConnections": [
    {
      "title": "ATS Resume Review & Audit",
      "description": "Get an expert line-by-line review and technical keyword audit.",
      "route": "/resume-review",
      "badgeText": "Free ATS Check",
      "ctaText": "Scan My Resume",
      "priceTag": "Free / ₹49"
    },
    {
      "title": "AI & 1-on-1 Mock Interview Room",
      "description": "Practice role-specific questions with instant feedback or book a live mentor.",
      "route": "/mock-interview",
      "badgeText": "₹99 Human Mock",
      "ctaText": "Start Interview Practice",
      "priceTag": "Free / ₹99"
    },
    {
      "title": "Personal Developer Portfolio Service",
      "description": "Deploy a fast, responsive personal portfolio displaying live projects.",
      "route": "/portfolio-service",
      "badgeText": "Free Hosting",
      "ctaText": "Explore Portfolio Service",
      "priceTag": "From ₹499"
    },
    {
      "title": "Explore Verified Job Openings",
      "description": "Browse off-campus drives, internships, and entry-level positions.",
      "route": "/jobs",
      "badgeText": "100% Official Links",
      "ctaText": "Browse Jobs Now",
      "priceTag": "Free"
    }
  ]
}`;

    const prompt = `Candidate Profile:
- Target Role: ${roleName}
- Highest Education: ${profile.education?.qualification || 'Graduate'} in ${profile.education?.branch || 'Tech'} (${profile.education?.graduationYear || '2025'})
- Current Status: ${profile.education?.currentStatus || 'Student'}
- Selected Skills: ${JSON.stringify(profile.skills || [])}
- No Skills Yet: ${profile.noSkillsYet ? 'Yes' : 'No'}
- Target Timeline: ${profile.careerGoal?.targetTimeline || '90 days'}
- Weekly Learning Hours: ${profile.careerGoal?.weeklyHours || '6-10 hours'}
- Preferred Location: ${profile.careerGoal?.preferredLocation || 'Anywhere in India'}
- Preferred Work Arrangement: ${profile.careerGoal?.workArrangement || 'Any'}
- Biggest Challenge: ${profile.preferences?.biggestChallenge || 'Lack of projects'}
- Preferred Learning Style: ${profile.preferences?.learningStyle || 'Step-by-step roadmap'}
- Additional Notes: ${profile.preferences?.additionalGoals || 'None'}

Generate a complete, customized, zero-fluff JSON career roadmap for this user.`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{ text: prompt }],
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
          },
        });

        const rawText = response.text ? response.text.trim() : '';
        if (rawText) {
          const jsonResult = JSON.parse(rawText);
          if (jsonResult && jsonResult.phases && Array.isArray(jsonResult.phases)) {
            return res.json({ success: true, roadmap: jsonResult });
          }
        }
      } catch (mErr: any) {
        console.warn(`[CareerRoadmap] Model ${model} generation failed:`, mErr?.message);
      }
    }

    return res.json({ success: false, message: 'AI model response empty. Using client fallback.' });
  } catch (err: any) {
    console.error('[CareerRoadmap] Endpoint error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});


// In-memory idempotency tracker for welcome emails
const sentWelcomeEmailsSet = new Set<string>();

// Endpoint to send New User Registration Welcome Email via Resend
app.post('/api/auth/send-welcome-email', async (req, res) => {
  const { email, name } = req.body || {};

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = (name || '').trim();
  const greetingName = cleanName ? cleanName : 'there';

  if (sentWelcomeEmailsSet.has(cleanEmail)) {
    console.log(`[Welcome Email] Already sent welcome email to ${cleanEmail}. Skipping duplicate.`);
    return res.json({
      success: true,
      message: 'Welcome email already sent for this account.',
      skipped: true,
    });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('[Welcome Email] RESEND_API_KEY is not configured in server environment.');
    return res.json({
      success: false,
      message: 'RESEND_API_KEY not configured.',
      skipped: true,
    });
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const plainTextContent = `Hi ${greetingName},

Welcome to Mana Career!

We're excited to help you take the next step in your career.

With Mana Career, you can explore:
• Job opportunities for freshers and experienced candidates.
• Internships and work-from-home opportunities.
• Career development resources.
• Resume and portfolio services.
• AI-powered career planning and interview preparation, where available.

Visit Mana Career to explore the opportunities and services available to you.

Website: https://mana-naukari.netlify.app/

Wishing you success in your career journey!

Best regards,
Team Mana Career`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to Mana Career</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; line-height: 1.6;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
      <h2 style="color: #2563eb; margin: 0 0 6px 0; font-size: 24px; font-weight: 800;">Mana Career</h2>
      <span style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
        Career Account Activated 🚀
      </span>
    </div>

    <p style="font-size: 15px; margin-top: 0; margin-bottom: 16px; font-weight: 600;">
      Hi ${greetingName},
    </p>

    <p style="font-size: 15px; margin-bottom: 20px; color: #334155;">
      Welcome to <strong>Mana Career</strong>! We're excited to help you take the next step in your career.
    </p>

    <p style="font-size: 15px; margin-bottom: 12px; font-weight: 700; color: #0f172a;">
      With Mana Career, you can explore:
    </p>

    <ul style="padding-left: 0; list-style: none; margin: 0 0 24px 0;">
      <li style="padding: 8px 0; font-size: 14px; border-bottom: 1px border-dashed #f1f5f9;">• Job opportunities for freshers and experienced candidates.</li>
      <li style="padding: 8px 0; font-size: 14px; border-bottom: 1px border-dashed #f1f5f9;">• Internships and work-from-home opportunities.</li>
      <li style="padding: 8px 0; font-size: 14px; border-bottom: 1px border-dashed #f1f5f9;">• Career development resources.</li>
      <li style="padding: 8px 0; font-size: 14px; border-bottom: 1px border-dashed #f1f5f9;">• Resume and portfolio services.</li>
      <li style="padding: 8px 0; font-size: 14px;">• AI-powered career planning and interview preparation, where available.</li>
    </ul>

    <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 14px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="font-size: 14px; color: #334155; margin: 0 0 14px 0;">
        Visit Mana Career to explore the opportunities and services available to you.
      </p>
      <a href="https://mana-naukari.netlify.app/" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 12px; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);">
        Explore Mana Career ↗
      </a>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 14px;">
      <p style="margin: 0 0 4px 0; color: #64748b;">Wishing you success in your career journey!</p>
      <p style="margin: 0; font-weight: 700; color: #0f172a;">Best regards,<br>Team Mana Career</p>
    </div>
  </div>
</body>
</html>`;

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
        subject: 'Welcome to Mana Career – Your Career Journey Starts Here!',
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
      console.warn('[Welcome Email] Resend error:', resendResponse.status, resendData?.message || responseText);
      return res.json({
        success: false,
        error: `Resend error (${resendResponse.status}): ${resendData?.message || responseText}`,
        skipped: true,
      });
    }

    sentWelcomeEmailsSet.add(cleanEmail);
    console.log(`[Welcome Email] Dispatched welcome email to ${cleanEmail}`);
    return res.json({ success: true, data: resendData });
  } catch (err: any) {
    console.error('[Welcome Email Exception]:', err?.message || err);
    return res.json({ success: false, error: err?.message || 'Failed to dispatch welcome email.' });
  }
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

Thank you for subscribing to Mana Career Job Alerts.

You will now receive:

✅ Freshers Jobs
✅ Internship Opportunities
✅ Work From Home Jobs
✅ Off Campus Drives
✅ Entry Level Hiring Updates

based on your selected preferences (${selectedPrefs} - ${alertFrequency}).

We only share genuine opportunities from official company sources.

Best wishes for your career journey.

Team Mana Career`;

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Welcome to Mana Career Job Alerts</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 24px; margin: 0; line-height: 1.6;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="margin-bottom: 24px;">
      <h2 style="color: #2563eb; margin: 0 0 8px 0; font-size: 22px; font-weight: 800;">Mana Career</h2>
      <div style="display: inline-block; background-color: #eff6ff; color: #1d4ed8; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px;">
        Career Alerts Activated 🚀
      </div>
    </div>
    
    <p style="font-size: 15px; margin-top: 0; margin-bottom: 16px;">Hello,</p>
    
    <p style="font-size: 15px; margin-bottom: 20px;">
      Thank you for subscribing to <strong>Mana Career Job Alerts</strong>.
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
      <p style="margin: 0; font-weight: 700; color: #0f172a;">Team Mana Career</p>
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
        subject: 'Welcome to ManaCarrier Job Alerts 🚀',
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

A new verified job opportunity matching your preferred category (${jobCategory}) is now active on ManaCarrier!

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
Team ManaCarrier
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
        <h2 style="color: #2563eb; margin: 0; font-size: 22px; font-weight: 800;">ManaCarrier</h2>
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
      <strong style="color: #475569;">Team ManaCarrier</strong>
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

// Helper: Server-side Admin Authorization Verification
async function verifyAdminServerRequest(req: express.Request): Promise<boolean> {
  const authHeader = req.headers.authorization || '';
  const cronSecretHeader = req.headers['x-cron-secret'] || '';
  const expectedCronSecret = process.env.CRON_SECRET || '';

  // 1. Cron secret check for automated background jobs
  if (expectedCronSecret && cronSecretHeader === expectedCronSecret) {
    return true;
  }

  // 2. Bearer Token check against Supabase Auth & admin_users table
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7).trim();
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return false;
  }

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) return false;
    const userData = await userRes.json();
    const email = userData?.email?.toLowerCase();
    if (!email) return false;

    // Verify email exists in admin_users
    const adminRes = await fetch(`${supabaseUrl}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}&select=id`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!adminRes.ok) return false;
    const adminData = await adminRes.json();
    return Array.isArray(adminData) && adminData.length > 0;
  } catch {
    return false;
  }
}

// ============================================================================
// PUBLIC ALERTS ENDPOINTS (SERVER PROXY TO PROTECT SUBSCRIBERS TABLE)
// ============================================================================

// Public Subscription Endpoint (Anonymous visitors can subscribe or update preferences without table SELECT rights)
app.post('/api/alerts/subscribe', async (req, res) => {
  const { email, categories, frequency } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ success: false, message: 'Valid email address is required.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ success: false, message: 'Supabase configuration missing.' });
  }

  try {
    // 1. Try PostgreSQL RPC 'subscribe_job_alerts'
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/subscribe_job_alerts`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_email: cleanEmail,
        p_categories: Array.isArray(categories) ? categories : ['Freshers'],
        p_frequency: frequency || 'daily',
      }),
    });

    if (rpcRes.ok) {
      const rpcData = await rpcRes.json();
      return res.json(rpcData);
    }

    // 2. Fallback REST insert
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/job_alert_subscribers`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: cleanEmail,
        categories: Array.isArray(categories) ? categories : ['Freshers'],
        frequency: frequency || 'daily',
        is_active: true,
      }),
    });

    if (insertRes.ok) {
      return res.json({ success: true, message: 'Successfully subscribed to daily job alerts!' });
    }

    return res.status(400).json({ success: false, message: 'Unable to save subscription.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message || 'Server error saving subscription.' });
  }
});

// Public Unsubscribe Endpoint
app.post('/api/alerts/unsubscribe', async (req, res) => {
  const { email, token } = req.body || {};
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ success: false, message: 'Valid email is required.' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ success: false, message: 'Supabase configuration missing.' });
  }

  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/unsubscribe_job_alerts`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_email: cleanEmail,
        p_token: token || null,
      }),
    });

    if (rpcRes.ok) {
      const rpcData = await rpcRes.json();
      return res.json(rpcData);
    }

    return res.status(400).json({ success: false, message: 'Unsubscribe failed.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper: Verify Svix/Resend HMAC Webhook Signatures
function verifyResendWebhookSignature(
  payload: string | object,
  headers: Record<string, string | string[] | undefined>,
  secret: string
): boolean {
  if (!secret) return true; // If secret not set in environment, allow with warning

  const svixId = (headers['svix-id'] || headers['msg-id']) as string;
  const svixTimestamp = (headers['svix-timestamp'] || headers['msg-timestamp']) as string;
  const svixSignature = (headers['svix-signature'] || headers['msg-signature']) as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return false;
  }

  // Prevent replay attacks (check timestamp within 5 minutes)
  const timestampNum = parseInt(svixTimestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(timestampNum) || Math.abs(now - timestampNum) > 300) {
    return false;
  }

  const rawBody = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;

  try {
    const secretKey = secret.startsWith('whsec_') ? secret.substring(6) : secret;
    const secretBytes = Buffer.from(secretKey, 'base64');

    const computedHmac = crypto
      .createHmac('sha256', secretBytes)
      .update(toSign)
      .digest('base64');

    const signatures = svixSignature.split(' ');
    for (const sigPart of signatures) {
      const parts = sigPart.split(',');
      const signature = parts.length > 1 ? parts[1] : parts[0];
      if (signature === computedHmac) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// Resend Webhook Endpoint: Tracking Delivery, Bounces, and Failures with HMAC Verification
app.post('/api/webhooks/resend', async (req, res) => {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || process.env.SVIX_WEBHOOK_SECRET || '';

  // Enforce signature verification if webhook secret is configured
  if (webhookSecret && !verifyResendWebhookSignature(req.body, req.headers, webhookSecret)) {
    console.warn('[Resend Webhook] Signature verification failed! Request rejected.');
    return res.status(401).json({ error: 'Invalid webhook signature.' });
  }

  const event = req.body || {};
  const eventType = event.type || '';
  const emailId = event.data?.email_id || event.data?.id || '';

  console.log(`[Resend Webhook Received] Event: "${eventType}" | Message ID: "${emailId}"`);

  if (!emailId) {
    return res.status(200).json({ received: true, note: 'No email_id in payload' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseAnonKey) {
    try {
      let mappedStatus = 'sent';
      if (eventType === 'email.delivered') mappedStatus = 'delivered';
      else if (eventType === 'email.bounced') mappedStatus = 'bounced';
      else if (eventType === 'email.complained') mappedStatus = 'complained';
      else if (eventType === 'email.failed') mappedStatus = 'failed';

      // Update delivery log
      await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_logs?resend_id=eq.${encodeURIComponent(emailId)}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: mappedStatus,
          updated_at: new Date().toISOString(),
        }),
      });

      // Automatically deactivate bounced subscribers
      if (mappedStatus === 'bounced' || mappedStatus === 'complained') {
        const recipients = event.data?.to;
        const targetEmail = Array.isArray(recipients) ? recipients[0] : recipients;
        if (targetEmail) {
          await fetch(`${supabaseUrl}/rest/v1/job_alert_subscribers?email=ilike.${encodeURIComponent(targetEmail)}`, {
            method: 'PATCH',
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              is_active: false,
              updated_at: new Date().toISOString(),
            }),
          });
        }
      }
    } catch (err) {
      console.warn('[Resend Webhook Warning] Exception processing event:', err);
    }
  }

  return res.status(200).json({ received: true, event: eventType });
});

// Endpoint to handle Admin Daily Job Reminder dispatch (Strict Server-Side Admin Authorization)
app.post('/api/admin/daily-reminder-dispatch', async (req, res) => {
  // Server-side Admin Protection
  const isAdmin = await verifyAdminServerRequest(req);
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Access restricted strictly to verified ManaCarrier administrators.',
    });
  }

  const { test_email, is_test } = req.body || {};

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
  const appBaseUrl = process.env.APP_URL || 'https://mana-naukari.netlify.app';
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  try {
    // Fetch genuine active jobs from Supabase
    let activeJobs: any[] = [];
    if (supabaseUrl && supabaseAnonKey) {
      const jobsRes = await fetch(`${supabaseUrl}/rest/v1/jobs?status=eq.active&order=created_at.desc&limit=6`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });
      if (jobsRes.ok) {
        activeJobs = await jobsRes.json();
      }
    }

    if (is_test) {
      const recipient = (test_email || '').trim();
      if (!recipient || !recipient.includes('@')) {
        return res.status(400).json({ success: false, error: 'Valid test email is required.' });
      }

      if (!resendApiKey) {
        return res.status(400).json({
          success: false,
          error: 'RESEND_API_KEY is not configured in server environment.',
        });
      }

      const todayStr = new Date().toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const todayYmd = new Date().toISOString().split('T')[0];

      const jobsListHtml = activeJobs.length > 0
        ? activeJobs.map((job) => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${job.title}</h4>
              <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 9999px;">${job.category || 'General'}</span>
            </div>
            <p style="margin: 4px 0 10px 0; font-size: 13px; color: #475569; font-weight: 600;">🏢 ${job.company || 'Company'}</p>
            <a href="${job.apply_link || `${appBaseUrl}/jobs/${job.id}`}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none;">Apply Now ↗</a>
          </div>
        `).join('')
        : '<p style="font-size: 14px; color: #64748b;">No active jobs currently in database.</p>';

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: system-ui, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <h2 style="color: #2563eb; margin: 0 0 4px 0;">Mana Career</h2>
    <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #f0fdf4; padding: 2px 8px; border-radius: 9999px;">Daily Job Digest - ${todayStr}</span>
    <p style="margin-top: 16px; font-size: 14px;">Here are today's top genuine job openings curated for you on Mana Career:</p>
    ${jobsListHtml}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #94a3b8; text-align: center;">You are receiving this test email from Mana Career Admin. <a href="${appBaseUrl}/unsubscribe?email=${encodeURIComponent(recipient)}" style="color: #2563eb;">Unsubscribe</a></p>
  </div>
</body>
</html>`;

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: recipient,
          subject: `Daily Job Reminder - Mana Career (${todayStr}) [Test]`,
          html: htmlContent,
        }),
      });

      const resData = await resendRes.json();
      if (!resendRes.ok) {
        throw new Error(resData.message || 'Resend error sending test email');
      }

      // Record test run & delivery log in Supabase
      if (supabaseUrl && supabaseAnonKey) {
        try {
          const runRes = await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_runs`, {
            method: 'POST',
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
              Prefer: 'return=representation',
            },
            body: JSON.stringify({
              run_date: todayYmd,
              status: 'completed',
              total_subscribers: 1,
              emails_sent: 1,
              emails_failed: 0,
              jobs_included_count: activeJobs.length,
              is_test: true,
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            }),
          });

          let runId = null;
          if (runRes.ok) {
            const runArr = await runRes.json();
            if (runArr && runArr[0]) runId = runArr[0].id;
          }

          await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_logs`, {
            method: 'POST',
            headers: {
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              run_id: runId,
              run_date: todayYmd,
              recipient_email: recipient,
              status: 'sent',
              resend_id: resData.id,
              created_at: new Date().toISOString(),
            }),
          });
        } catch (dbLogErr) {
          console.warn('[DailyReminderDispatch] Notice: DB logging exception:', dbLogErr);
        }
      }

      return res.json({
        success: true,
        message: 'Test daily job reminder email sent!',
        jobs_count: activeJobs.length,
        resend_id: resData.id,
      });
    }

    // Manual batch dispatch
    let subscribers: any[] = [];
    if (supabaseUrl && supabaseAnonKey) {
      const subRes = await fetch(`${supabaseUrl}/rest/v1/job_alert_subscribers?is_active=neq.false`, {
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
      });
      if (subRes.ok) {
        subscribers = await subRes.json();
      }
    }

    const todayStr = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const todayYmd = new Date().toISOString().split('T')[0];

    let sentCount = 0;
    let failedCount = 0;

    if (resendApiKey && subscribers.length > 0) {
      for (const sub of subscribers) {
        const recipient = (sub.email || '').trim().toLowerCase();
        if (!recipient) continue;

        const userCategories = Array.isArray(sub.categories) ? sub.categories : [];
        const matchedJobs = activeJobs.filter((j) =>
          userCategories.length === 0 ||
          userCategories.includes('All') ||
          userCategories.some((c: string) => c.toLowerCase() === (j.category || '').toLowerCase())
        );

        const jobsListHtml = (matchedJobs.length > 0 ? matchedJobs : activeJobs).map((job) => `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: start; gap: 8px;">
              <h4 style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${job.title}</h4>
              <span style="font-size: 11px; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 9999px;">${job.category || 'General'}</span>
            </div>
            <p style="margin: 4px 0 10px 0; font-size: 13px; color: #475569; font-weight: 600;">🏢 ${job.company || 'Company'}</p>
            <a href="${job.apply_link || `${appBaseUrl}/jobs/${job.id}`}" target="_blank" style="display: inline-block; background: #2563eb; color: #ffffff; font-size: 12px; font-weight: 700; padding: 8px 16px; border-radius: 8px; text-decoration: none;">Apply Now ↗</a>
          </div>
        `).join('');

        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<body style="font-family: system-ui, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e2e8f0;">
    <h2 style="color: #2563eb; margin: 0 0 4px 0;">Mana Career</h2>
    <span style="font-size: 11px; font-weight: 700; color: #15803d; background: #f0fdf4; padding: 2px 8px; border-radius: 9999px;">Daily Job Digest - ${todayStr}</span>
    <p style="margin-top: 16px; font-size: 14px;">Here are today's top genuine job openings curated for you on Mana Career:</p>
    ${jobsListHtml}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
    <p style="font-size: 11px; color: #94a3b8; text-align: center;">You are receiving this daily job digest from Mana Career. <a href="${appBaseUrl}/unsubscribe?email=${encodeURIComponent(recipient)}" style="color: #2563eb;">Unsubscribe</a></p>
  </div>
</body>
</html>`;

        try {
          const dispatchRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey.trim()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: recipient,
              subject: `Daily Job Digest - Mana Career (${todayStr})`,
              html: htmlContent,
            }),
          });

          const dispatchData = await dispatchRes.json();
          if (dispatchRes.ok) {
            sentCount++;
            if (supabaseUrl && supabaseAnonKey) {
              await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_logs`, {
                method: 'POST',
                headers: {
                  apikey: supabaseAnonKey,
                  Authorization: `Bearer ${supabaseAnonKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  run_date: todayYmd,
                  recipient_email: recipient,
                  status: 'sent',
                  resend_id: dispatchData.id,
                  created_at: new Date().toISOString(),
                }),
              });
            }
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }
    }

    if (supabaseUrl && supabaseAnonKey) {
      await fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_runs`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          run_date: todayYmd,
          status: 'completed',
          total_subscribers: subscribers.length,
          emails_sent: sentCount,
          emails_failed: failedCount,
          jobs_included_count: activeJobs.length,
          is_test: false,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }),
      });
    }

    return res.json({
      success: true,
      message: `Batch dispatch finished: ${sentCount} sent, ${failedCount} failed.`,
      total_subscribers: subscribers.length,
      emails_sent: sentCount,
      emails_failed: failedCount,
      jobs_count: activeJobs.length,
      skipped: false,
    });
  } catch (err: any) {
    console.error('[DailyReminderDispatch Error]:', err);
    return res.status(500).json({ success: false, error: err.message || 'Failed to dispatch daily reminder.' });
  }
});

// Endpoint to retrieve Alert Delivery Statistics & Logs for Admin Dashboard (Protected Admin Access)
app.get('/api/alerts/delivery-stats', async (req, res) => {
  const isAdmin = await verifyAdminServerRequest(req);
  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Access restricted strictly to verified ManaCarrier administrators.',
    });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    let totalSubscribers = 0;
    let activeSubscribers = 0;
    let logs: any[] = [];

    if (supabaseUrl && supabaseAnonKey) {
      const [subRes, logRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/job_alert_subscribers?select=id,is_active`, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }),
        fetch(`${supabaseUrl}/rest/v1/daily_job_reminder_logs?select=*&order=created_at.desc&limit=50`, {
          headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
        }),
      ]);

      if (subRes.ok) {
        const subs = await subRes.json();
        totalSubscribers = subs.length;
        activeSubscribers = subs.filter((s: any) => s.is_active !== false).length;
      }

      if (logRes.ok) {
        logs = await logRes.json();
      }
    }

    const successfulDeliveries = logs.filter((l) => l.status === 'sent' || l.status === 'delivered').length;
    const actualDeliveredCount = logs.filter((l) => l.status === 'delivered').length;
    const bouncedCount = logs.filter((l) => l.status === 'bounced').length;
    const failedDeliveries = logs.filter((l) => l.status === 'failed' || l.status === 'bounced').length;
    const totalAlertsSent = logs.length;

    return res.json({
      success: true,
      data: {
        totalAlertsSent,
        totalSubscribers,
        activeSubscribers,
        successfulDeliveries,
        actualDeliveredCount,
        bouncedCount,
        failedDeliveries,
        recentDeliveries: logs,
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
    if (ext !== '.pdf' && ext !== '.docx' && ext !== '.txt' && ext !== '.md') {
      return res.status(400).json({
        success: false,
        error: 'Supported file formats: PDF (.pdf), Word (.docx), Plain Text (.txt), and Markdown (.md).',
      });
    }

    const fileType = ext === '.pdf' ? 'pdf' : ext === '.docx' ? 'docx' : ext === '.md' ? 'md' : 'txt';
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

// --- Job Availability Health Checker API & Scheduler ---

// 1. Endpoint to trigger manual/instant health check
app.post('/api/admin/check-availability', async (req, res) => {
  try {
    console.log('[API Admin] Manually triggering active jobs availability check...');
    const result = await jobAvailabilityService.checkAllActiveJobs();
    return res.json(result);
  } catch (err: any) {
    console.error('[API Admin Error] Availability check failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Job availability check failed.'
    });
  }
});

// 1b. Endpoint to trigger single job verification
app.post('/api/admin/check-single-availability', async (req, res) => {
  try {
    const { jobId } = req.body || {};
    if (!jobId) {
      return res.status(400).json({ success: false, error: 'jobId is required' });
    }
    console.log(`[API Admin] Single job availability check requested for ID ${jobId}`);
    const result = await jobAvailabilityService.checkAndUpdateJobById(jobId);
    return res.json(result);
  } catch (err: any) {
    console.error('[API Admin Error] Single job availability check failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Single job availability check failed.'
    });
  }
});

// 2. Set up daily job health check cron in the background (every 24 hours)
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
setInterval(async () => {
  console.log('[Scheduler] Running automatic daily job availability health check...');
  try {
    await jobAvailabilityService.checkAllActiveJobs();
  } catch (err) {
    console.error('[Scheduler Error] Automatic job availability check failed:', err);
  }
}, TWENTY_FOUR_HOURS);

// Run a check on startup after a 10 second delay to avoid impacting startup speed
setTimeout(async () => {
  console.log('[Scheduler] Running startup job availability health check...');
  try {
    await jobAvailabilityService.checkAllActiveJobs();
  } catch (err) {
    console.error('[Scheduler Error] Startup job availability check failed:', err);
  }
}, 10000);

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
