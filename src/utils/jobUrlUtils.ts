import { WEBSITE_URL } from '../constants/links';

/**
 * Slug and URL helpers for Mana Naukari
 * Supports SEO-friendly dynamic URLs:
 * e.g. /jobs/software-engineer-microsoft-123 or /jobs/123
 */

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Generates an SEO friendly job URL path:
 * e.g. /jobs/software-engineer-tcs-a1b2c3d4
 */
export function generateJobUrlPath(job: { id: string; title?: string; company?: string }): string {
  if (!job.id) return '/jobs';
  
  const titleSlug = job.title ? slugify(job.title).slice(0, 40) : '';
  const companySlug = job.company ? slugify(job.company).slice(0, 30) : '';

  const parts = [titleSlug, companySlug].filter(Boolean);
  if (parts.length > 0) {
    return `/jobs/${parts.join('-')}-${job.id}`;
  }
  return `/jobs/${job.id}`;
}

/**
 * Extracts the real job ID from a URL parameter:
 * Can handle:
 * - Direct ID: "0a56f9a0-76c2-4eb2-a63e-67098e6ad65c"
 * - Numeric ID: "123"
 * - Slug + ID: "software-engineer-microsoft-123"
 * - UUID at end: "software-engineer-microsoft-0a56f9a0-76c2-4eb2-a63e-67098e6ad65c"
 */
export function extractJobIdFromSlug(slugOrId: string): string {
  if (!slugOrId) return '';
  const decoded = decodeURIComponent(slugOrId).trim();

  // 1. Check if the string itself matches a standard UUID (36 chars with dashes)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(decoded)) {
    return decoded;
  }

  // 2. Check if a UUID is embedded at the end of the slug: `...-<UUID>`
  const embeddedUuidMatch = decoded.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  if (embeddedUuidMatch) {
    return embeddedUuidMatch[1];
  }

  // 3. Check for standard alphanumeric ID (like "rjob_..." or integer "123" or short hash)
  // Extract segment after the last hyphen if there are hyphens
  const lastHyphenIndex = decoded.lastIndexOf('-');
  if (lastHyphenIndex !== -1 && lastHyphenIndex < decoded.length - 1) {
    const candidateId = decoded.slice(lastHyphenIndex + 1);
    // If candidate has digits or looks like an id, return candidate
    if (/^[a-zA-Z0-9_]+$/.test(candidateId)) {
      return candidateId;
    }
  }

  return decoded;
}

/**
 * Returns full absolute URL for sharing or copying
 * Requirements:
 * - Never use AI Studio preview URLs or run.app domains
 * - Use WEBSITE_URL constant: https://mana-naukari.netlify.app
 * - Formats as https://mana-naukari.netlify.app/jobs/{job_id}
 */
export function getAbsoluteJobUrl(jobUrlPath: string): string {
  if (!jobUrlPath) return WEBSITE_URL;

  // Normalize path segment
  const parts = jobUrlPath.split('/');
  const slugOrId = parts[parts.length - 1] || '';
  
  // Extract real job ID
  const id = extractJobIdFromSlug(slugOrId);

  if (id) {
    return `${WEBSITE_URL}/jobs/${id}`;
  }

  const cleanPath = jobUrlPath.startsWith('/') ? jobUrlPath : `/${jobUrlPath}`;
  return `${WEBSITE_URL}${cleanPath}`;
}
