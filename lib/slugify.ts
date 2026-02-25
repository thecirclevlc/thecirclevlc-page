/**
 * Converts a string to a URL-safe slug.
 * e.g. "VOL. III — The Night" → "vol-iii-the-night"
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')      // Remove special chars
    .trim()
    .replace(/\s+/g, '-')              // Spaces → hyphens
    .replace(/-+/g, '-')               // Collapse multiple hyphens
    .replace(/^-+|-+$/g, '');          // Trim leading/trailing hyphens
}
