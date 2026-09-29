/**
 * Utility functions for generating and matching SEO-friendly category slugs
 */

export function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[&/\\#,+()$~%.'":*?<>{}]/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

export function fromSlug(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
