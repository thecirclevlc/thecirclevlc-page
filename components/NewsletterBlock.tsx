import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import EditableText from './EditableText';
import { supabase } from '../lib/supabase';
import { useSiteBlock } from '../hooks/useSiteContent';

/**
 * Email capture on the home page — "crear newsletter (espacio para dejar el
 * correo en la homepage)".
 *
 * Stored in `form_submissions` under its own form key, so it lands in the same
 * inbox as everything else and exports to CSV with no special case. The push to
 * her mailing list reuses /api/subscribe, which takes the public form URL she
 * pastes into the admin — no API key, and she can change provider herself.
 */

export const NEWSLETTER_FORM_KEY = 'form_schema_newsletter';
const COPY_KEY = 'content_home_newsletter';

const DEFAULTS = {
  title:    'STAY IN THE LOOP',
  subtitle: 'Secret locations, lineups and access — before anyone else.',
  consent:  'I agree to receive emails from The Circle. You can unsubscribe at any time.',
  button:   'JOIN',
  success:  "You're on the list.",
};

export default function NewsletterBlock() {
  const { data: copy, setData: setCopy } = useSiteBlock(COPY_KEY, DEFAULTS);
  const [email, setEmail]       = useState('');
  const [consent, setConsent]   = useState(false);
  const [state, setState]       = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage]   = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim();

    // Deliberately loose: the only thing worth rejecting here is an obvious
    // typo. Anything stricter turns away real addresses.
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setState('error'); setMessage('That email address does not look right.');
      return;
    }
    if (!consent) {
      setState('error'); setMessage('Please tick the box to continue.');
      return;
    }

    setState('sending'); setMessage('');

    // Consent proof travels with the record: the flag, the exact wording shown,
    // and when. Required the moment this feeds a mailing list.
    const { error } = await supabase.from('form_submissions').insert({
      form_key: NEWSLETTER_FORM_KEY,
      data: {
        email: value,
        _terms_accepted: 'yes',
        _terms_text: copy.consent,
        _terms_at: new Date().toISOString(),
      },
      user_agent: navigator.userAgent,
    });

    if (error) {
      setState('error');
      setMessage('Something went wrong. Please try again.');
      return;
    }

    // Forward to her CRM if one is configured — never blocking, the address is
    // already stored.
    void supabase
      .from('site_settings').select('value').eq('id', NEWSLETTER_FORM_KEY).maybeSingle()
      .then(({ data }) => {
        const url = (data?.value as { crm_post_url?: string } | null)?.crm_post_url;
        if (!url) return;
        return fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crmPostUrl: url, email: value, fields: { email: value } }),
        }).catch(() => {});
      });

    setState('done');
    setEmail(''); setConsent(false);
  };

  return (
    <section className="relative px-5 md:px-20 py-20 md:py-28 border-t border-primary/10">
      <div className="max-w-3xl mx-auto text-center">
        <EditableText
          as="h2"
          contentKey={COPY_KEY}
          field="title"
          value={copy.title}
          onSave={v => setCopy(prev => ({ ...prev, title: v }))}
          className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary leading-none"
        />
        <EditableText
          as="p"
          contentKey={COPY_KEY}
          field="subtitle"
          value={copy.subtitle}
          onSave={v => setCopy(prev => ({ ...prev, subtitle: v }))}
          className="mt-4 text-sm md:text-base text-primary/60 leading-relaxed"
          multiline
        />

        {state === 'done' ? (
          <p
            role="status"
            className="mt-10 text-base md:text-lg font-mono text-primary tracking-wider uppercase"
          >
            {copy.success}
          </p>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-5" noValidate>
            <div className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
              <label htmlFor="newsletter-email" className="sr-only">Email address</label>
              <input
                id="newsletter-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={e => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
                placeholder="your@email.com"
                className="flex-1 bg-transparent border border-primary/30 px-5 py-4 text-fg text-base
                           placeholder:text-primary/30 font-mono tracking-wide
                           focus:outline-none focus:border-primary transition-colors"
              />
              <button
                type="submit"
                disabled={state === 'sending'}
                className="bg-primary text-black font-black text-base py-4 px-10 uppercase tracking-widest
                           hover:opacity-80 disabled:opacity-50 transition-opacity cursor-pointer flex-shrink-0"
              >
                {state === 'sending' ? '…' : copy.button}
              </button>
            </div>

            <label className="flex items-start gap-3 max-w-xl mx-auto cursor-pointer text-left">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => { setConsent(e.target.checked); if (state === 'error') setState('idle'); }}
                className="mt-0.5 w-4 h-4 accent-primary cursor-pointer flex-shrink-0"
              />
              <span className="text-xs font-mono text-primary/50 leading-relaxed">
                {copy.consent}{' '}
                <Link to="/privacy" className="underline underline-offset-2 hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </span>
            </label>

            {state === 'error' && (
              <p role="alert" className="text-xs font-mono text-red-400 tracking-wider">{message}</p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
