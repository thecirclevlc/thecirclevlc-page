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

  const { crmPostUrl, email, fields } = (req.body ?? {}) as {
    crmPostUrl?: string;
    email?: string;
    fields?: Record<string, string>;
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

  // Mailchimp's embed endpoint expects urlencoded, with the email under EMAIL.
  const body = new URLSearchParams({ EMAIL: email, email });
  for (const [k, v] of Object.entries(fields ?? {})) {
    if (k.startsWith('_') || !v) continue;   // skip our consent bookkeeping
    body.append(k, String(v).slice(0, 500));
  }

  try {
    const upstream = await fetch(crmPostUrl, {
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
    return res.status(200).json({ ok: accepted, status: upstream.status });
  } catch (err) {
    console.error('[subscribe] CRM forward failed:', err);
    // 200 on purpose: the caller must not treat this as a failed submission.
    return res.status(200).json({ ok: false, error: 'CRM unreachable' });
  }
}
