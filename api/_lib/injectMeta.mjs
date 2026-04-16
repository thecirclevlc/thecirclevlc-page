// Pure HTML meta-tag injector.
// Replaces <!--META:key-->...<!--/META:key--> blocks with HTML-escaped values.
// Unknown keys are ignored. Missing keys in `values` leave the default untouched.
//
// Example input HTML:
//   <title><!--META:title-->DEFAULT<!--/META:title--></title>
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
  return Object.entries(values).reduce((acc, [key, rawValue]) => {
    if (rawValue == null) return acc;
    if (!ALLOWED_KEYS.has(key)) return acc;
    const safe = escapeHtml(String(rawValue));
    const pattern = new RegExp(
      `<!--META:${key}-->[\\s\\S]*?<!--/META:${key}-->`,
      'g',
    );
    return acc.replace(pattern, `<!--META:${key}-->${safe}<!--/META:${key}-->`);
  }, html);
}
