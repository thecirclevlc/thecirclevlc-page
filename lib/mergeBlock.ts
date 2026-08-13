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

  // Drop null/undefined stored fields so they can't blank out a default.
  const defined = Object.fromEntries(
    Object.entries(stored).filter(([, v]) => v !== null && v !== undefined),
  );
  return { ...fallback, ...defined } as T;
}
