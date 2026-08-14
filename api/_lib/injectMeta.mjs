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
  // Per-page canonical and share URL. Without these every page declared the
  // home page as its canonical, which tells Google they are all duplicates.
  'canonical',
  'og_url',
  'twitter_url',
  'og_image',
  'twitter_image',
  // The browser-tab icon, uploadable from the panel.
  'favicon',
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
/**
 * Keys injected as raw HTML rather than escaped text.
 *
 * `head_extra` carries a <script type="application/ld+json"> block and an
 * optional robots meta. Running it through escapeHtml would turn the whole
 * thing into visible text; the caller is responsible for building it safely
 * with jsonLdScript() below.
 */
const RAW_KEYS = new Set(['head_extra']);

/**
 * Serialises a value into a <script type="application/ld+json"> block.
 *
 * The only escaping that matters inside a script element is preventing the
 * literal sequence `</script` and `<!--` from ending it early. JSON.stringify
 * cannot emit those unless they came from the data, so `<` is escaped to its
 * \u003c form — valid JSON, inert HTML. NEVER use escapeHtml here: it would
 * turn quotes into entities and produce invalid JSON.
 *
 * @param {unknown} data
 * @returns {string}
 */
export function jsonLdScript(data) {
  if (!data) return '';
  const json = JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
  return `<script type="application/ld+json">${json}</script>`;
}

export function injectMeta(html, values) {
  const injected = Object.entries(values).reduce((acc, [key, rawValue]) => {
    if (rawValue == null) return acc;
    if (!ALLOWED_KEYS.has(key) && !RAW_KEYS.has(key)) return acc;
    const safe = RAW_KEYS.has(key) ? String(rawValue) : escapeHtml(String(rawValue));
    const pattern = new RegExp(
      `<!--META:${key}-->[\\s\\S]*?<!--/META:${key}-->`,
      'g',
    );
    return acc.replace(pattern, safe);
  }, html);
  return injected.replace(/<!--\/?META:\w+-->/g, '');
}
