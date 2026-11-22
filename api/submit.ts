import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * The one way a form submission reaches `form_submissions`.
 *
 * The captcha token is verified and the row is written in the same call,
 * with the server key; the table takes no inserts from the browser
 * (supabase/migrations/20261012120100).
 *
 * The form's own definition (`site_settings.form_schema_*`) is read here, not
 * taken from the page: it decides which answers are kept and whether a
 * captcha is required.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
// Falls back to the anon key so a deploy that lands before the env var still
// takes applications while the old insert policy exists. Once migration
// 20261012120100 is applied, only the service key can write.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ANON_KEY
  || process.env.VITE_SUPABASE_ANON_KEY
  || '';

const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null;

/** Where the widget is served. A token solved on any other host is refused. */
const CAPTCHA_HOST = 'www.thecirclevlc.com';

/** The home-page newsletter box has no captcha widget; see the handler. */
const NEWSLETTER_KEY = 'form_schema_newsletter';

/**
 * The questions of DEFAULT_FORM_SCHEMA (lib/formSchema.ts), which /form shows
 * whenever `form_schema_join` is missing or has no `fields`. That file pulls in
 * the browser client, so it cannot be imported here; submit.check.ts keeps the
 * two lists equal.
 */
export const DEFAULT_FIELDS = [
  'fullName', 'age', 'whereFrom', 'instagram', 'email', 'artist', 'unexpected', 'expectations',
];

export const FORM_KEY = /^form_schema_[a-z0-9-]{1,60}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const MAX_BYTES = 20_000;
const MAX_VALUE = 5_000;
const CONSENT_KEYS = ['_terms_accepted', '_terms_text', '_terms_at'];

/**
 * Keeps only the answers the form actually asks for, plus the consent
 * record, each as a bounded string. Anything else a script adds is dropped.
 */
export function cleanData(raw: unknown, fieldNames: string[]): Record<string, string> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const allowed = new Set([...fieldNames, ...CONSENT_KEYS]);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!allowed.has(k) || v == null || typeof v === 'object') continue;
    out[k] = String(v).slice(0, MAX_VALUE);
  }
  return out;
}

/**
 * The form as the page renders it: Form.tsx merges the stored row over
 * DEFAULT_FORM_SCHEMA, so a row without `fields` shows the default questions
 * and one without `captcha_required` shows the captcha. Without a row only
 * /form (the join form) and the home box exist; any other slug is a 404 page.
 */
export function resolveSchema(formKey: string, stored: unknown): { fields: string[]; captcha: boolean } | null {
  if (!stored || typeof stored !== 'object') {
    if (formKey === 'form_schema_join') return { fields: DEFAULT_FIELDS, captcha: true };
    if (formKey === NEWSLETTER_KEY)     return { fields: ['email'], captcha: true };
    return null;
  }
  const v = stored as { fields?: unknown; captcha_required?: boolean | null };
  return {
    fields:  Array.isArray(v.fields) ? v.fields.map(f => (f as { name: string }).name) : DEFAULT_FIELDS,
    captcha: v.captcha_required ?? true,
  };
}

async function captchaPasses(token: string, secret: string): Promise<boolean> {
  const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    body:   new URLSearchParams({ secret, response: token }),
    signal: AbortSignal.timeout(8000),
  });
  const v = (await r.json()) as { success?: boolean; hostname?: string; 'error-codes'?: string[] };
  if (v.success && v.hostname === CAPTCHA_HOST) return true;
  console.error('[submit] captcha rejected:', v['error-codes'] ?? v.hostname);
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!supabase) {
    console.error('[submit] Supabase is not configured');
    return res.status(500).json({ ok: false, error: 'Server configuration error' });
  }

  const { formKey, data, captchaToken } = (req.body ?? {}) as {
    formKey?: unknown; data?: unknown; captchaToken?: unknown;
  };

  if (typeof formKey !== 'string' || !FORM_KEY.test(formKey)) {
    return res.status(400).json({ ok: false, error: 'Unknown form' });
  }
  if (JSON.stringify(data ?? null).length > MAX_BYTES) {
    return res.status(413).json({ ok: false, error: 'Submission too large' });
  }

  try {
    const { data: row, error: readError } = await supabase
      .from('site_settings').select('value').eq('id', formKey).maybeSingle();
    // A failed read is not a missing row: it must not fall back to defaults.
    if (readError) throw readError;
    const schema = resolveSchema(formKey, row?.value);
    if (!schema) return res.status(404).json({ ok: false, error: 'Unknown form' });

    // ponytail: the home newsletter box shows no captcha, so it may skip it —
    // but then it can only leave an email. Its abuse ceiling is a rate limit
    // on /api/* in Vercel Firewall; a widget in the box would remove it.
    const homeNewsletter = formKey === NEWSLETTER_KEY && !captchaToken;

    const clean = cleanData(data, homeNewsletter ? ['email'] : schema.fields);
    if (!clean || Object.keys(clean).length === 0) {
      return res.status(400).json({ ok: false, error: 'Empty submission' });
    }
    if (homeNewsletter && !EMAIL.test(clean.email ?? '')) {
      return res.status(400).json({ ok: false, error: 'Invalid email' });
    }

    if (schema.captcha && !homeNewsletter) {
      const secret = process.env.RECAPTCHA_SECRET_KEY;
      if (!secret) {
        console.error('[submit] RECAPTCHA_SECRET_KEY is not configured');
        return res.status(500).json({ ok: false, error: 'Server configuration error' });
      }
      if (typeof captchaToken !== 'string' || !(await captchaPasses(captchaToken, secret))) {
        return res.status(400).json({ ok: false, error: 'captcha' });
      }
    }

    const { error } = await supabase.from('form_submissions').insert({
      form_key:   formKey,
      data:       clean,
      user_agent: String(req.headers['user-agent'] ?? '').slice(0, 300),
    });
    if (error) {
      console.error('[submit] insert failed:', error.message);
      return res.status(500).json({ ok: false, error: 'Not saved' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[submit] failed:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}
