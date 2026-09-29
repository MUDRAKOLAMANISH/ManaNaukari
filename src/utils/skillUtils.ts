/**
 * Safely parses skills_required which can be:
 * - string[] (PostgreSQL text[] returned as JS array)
 * - string (e.g. comma-separated string "Python, React" or PostgreSQL array string '{"Python", "React"}')
 * - null or undefined
 */
export function normalizeSkills(skills: unknown): string[] {
  if (!skills) return [];

  if (Array.isArray(skills)) {
    return skills.map((s) => String(s).trim()).filter(Boolean);
  }

  if (typeof skills === 'string') {
    const trimmed = skills.trim();
    if (!trimmed) return [];

    // Check if it's a PostgreSQL array literal string like '{"React","Node.js"}'
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed
        .slice(1, -1)
        .split(',')
        .map((s) => s.replace(/^["']|["']$/g, '').trim())
        .filter(Boolean);
    }

    // Check if it's a JSON array string like '["React", "Node.js"]'
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch {
        // Fall back to comma-separated split
      }
    }

    // Default comma-separated string
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}
