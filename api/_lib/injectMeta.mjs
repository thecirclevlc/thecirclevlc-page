// Pure HTML meta-tag injector.
// Replaces <!--META:key-->...<!--/META:key--> blocks with HTML-escaped values,
// then strips ALL remaining markers from the output. This is critical because
// markers inside content="..." attributes are literal text (not HTML comments),
// and would be visible to crawlers if left in.
//
// The source HTML (dist/index.html) is re-read on each request, so markers
// are always available for matching — no need to preserve them in output.
//
// This helper is safe only for HTML text-node and quoted-attribute contexts
// (which is where the META markers live in index.html). Do not reuse the
// escape for <script>, <style>, unquoted attributes, or URL contexts.

/**
 * @typedef {Partial<{
 *   title:               string,
 *   description:         string,
 *   og_title:            string,
 *   og_description:      string,
 *   twitter_title:       string,
 *   twitter_description: string,
 * }>} MetaValues
 */

/** @type {Record<string, string>} */
const ESCAPE_MAP = {
  '&':  '&amp;',
  '<':  '&lt;',
  '>':  '&gt;',
  '"':  '&quot;',
  "'":  '&#39;',
};

const ALLOWED_KEYS = new Set([
  'title',
  'description',
  'og_title',
  'og_description',
  'twitter_title',
  'twitter_description',
]);

/**
 * @param {string} input
 * @returns {string}
 */
export function escapeHtml(input) {
  return input.replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);
}

/**
 * @param {string} html
 * @param {MetaValues} values
 * @returns {string}
 */
export function injectMeta(html, values) {
  const injected = Object.entries(values).reduce((acc, [key, rawValue]) => {
    if (rawValue == null) return acc;
    if (!ALLOWED_KEYS.has(key)) return acc;
    const safe = escapeHtml(String(rawValue));
    const pattern = new RegExp(
      `<!--META:${key}-->[\\s\\S]*?<!--/META:${key}-->`,
      'g',
    );
    return acc.replace(pattern, safe);
  }, html);
  return injected.replace(/<!--\/?META:\w+-->/g, '');
}
