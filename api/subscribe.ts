import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Forwards a submission to whatever CRM the client configured, using the
 * PUBLIC form-post URL she pastes into the admin.
 *
 * Why this shape instead of a Mailchimp API integration:
 *   - Mailchimp's embedded-form action URL is designed to live in public
 *     HTML. It is NOT a secret, so it can sit in `site_settings` (which we
 *     verified is world-readable) without leaking anything.
 *   - She copies it from her own Mailchimp and pastes it herself. No API key
 *     ever passes through us, and the day she moves to Brevo, MailerLite or
 *     ConvertKit she just pastes the new URL — no redeploy, no developer.
 *   - One provider-agnostic POST instead of an adapter per CRM.
 *
 * It runs server-side purely to dodge the browser's CORS wall — Mailchimp
 * does not send permissive CORS headers, so the same fetch from the page
 * would be blocked.
 *
 * Best-effort by design: the submission is already safely in Supabase before
 * this is ever called. A CRM outage must never cost us the applicant.
 */

// Keep this list to actual mailing-list providers. Every host added here is
// somewhere this endpoint can be made to POST by any anonymous caller, so it
// earns its place only by being a CRM the client might realistically use.
const ALLOWED_HOSTS = [
  'list-manage.com',      // Mailchimp
  'sendinblue.com',       // Brevo (legacy domain)
  'brevo.com',
  'mailerlite.com',
  'ck.page',              // ConvertKit
  'convertkit.com',
];

/** Blocks SSRF: only https, only known CRM hosts, no internal addresses. */
/**
 * Mailchimp's `post-json` twin of the embed endpoint answers with
 * `{result, msg}` instead of a 302 to a thank-you page, so "already
 * subscribed" and "invalid tag id" arrive as text we can log — the whole
 * reason a silent failure used to be undiagnosable.
 *
 * The `c=` is not optional and it is not documented anywhere obvious: without
 * a callback name the endpoint serves the HTML signup page and the JSON never
 * appears. Verified against the client's own audience before relying on it.
 * The reply is JSONP, `cb({…})`, which is why the caller unwraps it.
 *
 * Only rewritten for Mailchimp: every other provider keeps the URL she pasted.
 */
export function toReadableEndpoint(raw: string): string {
  if (!raw.includes('list-manage.com')) return raw;

  const json = raw
    .replace('/subscribe/post?', '/subscribe/post-json?')
    .replace(/\/subscribe\/post$/, '/subscribe/post-json');

  if (/[?&]c=/.test(json)) return json;
  return json + (json.includes('?') ? '&' : '?') + 'c=cb';
}

/**
 * The urlencoded body Mailchimp expects.
 *
 * `tags` is the point of this function: it is a plain form field in the embed
 * code, so a comma-separated list of tag IDs is all a segment needs. Kept pure
 * so the ordering and the skip rules stay checkable without a network call.
 */
export function buildCrmBody(
  email: string,
  fields: Record<string, string> = {},
  tags = '',
): URLSearchParams {
  const body = new URLSearchParams({ EMAIL: email, email });

  for (const [k, v] of Object.entries(fields)) {
    // `_` prefixes are our own consent bookkeeping, and `tags` is set below
    // from her configuration — never from an answer a visitor can type.
    if (k.startsWith('_') || k === 'tags' || !v) continue;
    body.append(k, String(v).slice(0, 500));
  }

  // Mailchimp rejects the whole request on a malformed tag list, so anything
  // that is not a bare ID is dropped rather than passed through.
  const ids = tags.split(',').map(t => t.trim()).filter(t => /^\d+$/.test(t));
  if (ids.length) body.set('tags', ids.join(','));

  return body;
}

export function isAllowedCrmUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { crmPostUrl, email, fields, tags } = (req.body ?? {}) as {
    crmPostUrl?: string;
    email?: string;
    fields?: Record<string, string>;
    tags?: string;
  };

  if (!crmPostUrl || !email) {
    return res.status(400).json({ ok: false, error: 'crmPostUrl and email are required' });
  }

  if (!isAllowedCrmUrl(crmPostUrl)) {
    // Deliberately explicit: this is the client's own typo to fix, and a
    // vague error would send her to Alberto instead of to her CRM settings.
    return res.status(400).json({
      ok: false,
      error: 'That CRM URL is not a recognised provider. Paste the embedded form URL from Mailchimp, Brevo, MailerLite or ConvertKit.',
    });
  }

  const body = buildCrmBody(email, fields ?? {}, tags ?? '');

  try {
    const upstream = await fetch(toReadableEndpoint(crmPostUrl), {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    body.toString(),
      // 'manual', never 'follow'. Following redirects would defeat
      // isAllowedCrmUrl entirely: one open redirect on any allow-listed host
      // and this becomes an SSRF gadget pointed at internal addresses or the
      // cloud metadata endpoint.
      //
      // Nothing is lost by not following. Mailchimp answers a successful
      // subscribe with a 302 to its own thank-you page, and all we need to
      // know is that the POST was accepted — we never read the body.
      redirect: 'manual',
      signal:  AbortSignal.timeout(8000),
    });

    // 2xx = accepted outright. 3xx = accepted and bouncing to a confirmation
    // page, which is Mailchimp's success path.
    const accepted = upstream.status >= 200 && upstream.status < 400;

    // Mailchimp's own words, when it gave us any. Never let a surprise body
    // downgrade a request the status line already called accepted: the old
    // behaviour is the floor, this only ever adds detail on top.
    let detail: string | undefined;
    try {
      const text = await upstream.text();
      const json = JSON.parse(text.replace(/^[^{]*\{/, '{').replace(/\}[^}]*$/, '}'));
      if (typeof json?.msg === 'string') {
        detail = json.msg.replace(/<[^>]*>/g, '').slice(0, 300);
        // "already subscribed" is not a failure — she still has the contact,
        // and the tag is applied all the same.
        if (json.result !== 'success' && !/already/i.test(detail)) {
          console.error('[subscribe] Mailchimp refused:', detail);
          return res.status(200).json({ ok: false, status: upstream.status, detail });
        }
      }
    } catch {
      // 302 to a thank-you page, or a provider that is not Mailchimp.
    }

    if (!accepted) console.error('[subscribe] CRM returned', upstream.status, detail ?? '');
    return res.status(200).json({ ok: accepted, status: upstream.status, detail });
  } catch (err) {
    console.error('[subscribe] CRM forward failed:', err);
    // 200 on purpose: the caller must not treat this as a failed submission.
    return res.status(200).json({ ok: false, error: 'CRM unreachable' });
  }
}
