// Pure HTML meta-tag injector.
// Replaces <!--META:key-->...<!--/META:key--> blocks with HTML-escaped values.
// Unknown keys are ignored. Missing keys in `values` leave the default untouched.

export type MetaValues = Partial<Record<
  | 'title'
  | 'description'
  | 'og_title'
  | 'og_description'
  | 'twitter_title'
  | 'twitter_description',
  string
>>;

const ESCAPE_MAP: Record<string, string> = {
  '&':  '&amp;',
  '<':  '&lt;',
  '>':  '&gt;',
  '"':  '&quot;',
  "'":  '&#39;',
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);
}

export function injectMeta(html: string, values: MetaValues): string {
  return Object.entries(values).reduce((acc, [key, rawValue]) => {
    if (rawValue == null) return acc;
    const safe = escapeHtml(String(rawValue));
    const pattern = new RegExp(
      `<!--META:${key}-->[\\s\\S]*?<!--/META:${key}-->`,
      'g',
    );
    return acc.replace(pattern, `<!--META:${key}-->${safe}<!--/META:${key}-->`);
  }, html);
}
