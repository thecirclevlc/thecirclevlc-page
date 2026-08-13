/**
 * Merges a stored `site_settings` value over its defaults.
 *
 * Why this exists: `EditableText` upserts only the field the admin just
 * edited, so a row can legitimately hold a subset of the block's fields
 * (e.g. `content_cta_events` held `title` but not `subtitle`). Returning
 * the row as-is left the sibling fields `undefined` and they rendered
 * blank on the live site. Defaults fill the gaps.
 *
 * Arrays and primitives replace wholesale — only plain objects merge, and
 * only at the top level, which is the shape every block key uses.
 *
 * Dependency-free on purpose: `hooks/useSiteContent.check.ts` runs it with
 * plain `node`, no install needed.
 */
export function mergeBlock<T>(fallback: T, stored: unknown): T {
  const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

  if (stored === null || stored === undefined) return fallback;
  if (!isPlainObject(stored) || !isPlainObject(fallback)) return stored as T;

  const out: Record<string, unknown> = { ...fallback };

  for (const [key, value] of Object.entries(stored)) {
    // A stored null must not blank out a default.
    if (value === null || value === undefined) continue;

    const base = (fallback as Record<string, unknown>)[key];

    // Recurse into nested settings groups.
    //
    // This is not theoretical tidiness. `site_theme.background` is a nested
    // object, and a row holding only `{ background: { style: 'none' } }` used
    // to arrive with density, weight, speed and intensity all undefined —
    // which reached the shader as gl.uniform4f(NaN) and painted nothing.
    // A shallow merge silently drops every sibling of whichever nested field
    // was written last.
    out[key] = isPlainObject(value) && isPlainObject(base)
      ? mergeBlock(base, value)
      : value;
  }

  return out as T;
}
