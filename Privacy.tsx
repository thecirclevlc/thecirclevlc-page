import { usePageTitle } from './hooks/usePageTitle';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './components/Footer';
import LegalBody from './components/LegalBody';
import { useSiteBlock } from './hooks/useSiteContent';
import {
  LEGAL_PRIVACY_KEY, FOOTER_CONFIG_KEY, DEFAULT_FOOTER,
  type LegalPage, type FooterConfig,
} from './lib/database.types';
import { PRIVACY_DEFAULT } from './lib/legal-defaults';
import { StandardHeader } from './StandardHeader';

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Privacy() {
  usePageTitle('Privacy Policy');
  const navigate = useNavigate();
  const { data: page } = useSiteBlock<LegalPage>(LEGAL_PRIVACY_KEY, PRIVACY_DEFAULT);

  // One contact address for the whole site. It used to live in three rows —
  // footer, terms and privacy — each with its own input, so changing it in the
  // Footer screen left the legal pages quoting the old one. The footer is now
  // the source; the stored legal value only covers rows written before this.
  const { data: footer } = useSiteBlock<FooterConfig>(FOOTER_CONFIG_KEY, DEFAULT_FOOTER);
  const contactEmail = footer.contact_email || page.contact_email;

  return (
    <div className="min-h-screen bg-bg text-fg selection:bg-primary selection:text-black">
      <StandardHeader />

      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-4xl md:text-5xl font-black text-primary tracking-tighter uppercase mb-4">
          Privacy Policy
        </h1>
        <p className="text-sm font-mono text-fg/40 tracking-wider uppercase mb-12">
          Last updated: {formatMonthYear(page.last_updated)} &middot; GDPR Compliant
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-fg/70">
          {page.intro && (
            <section>
              <p>{page.intro}</p>
            </section>
          )}
          {page.sections.map(s => (
            <section key={s.id}>
              <h2 className="text-lg font-bold text-primary uppercase tracking-wider mb-3">
                {s.heading}
              </h2>
              <LegalBody body={s.body} />
            </section>
          ))}
          {contactEmail && (
            <section>
              <p className="text-fg/60">
                Contact:{' '}
                <a href={`mailto:${contactEmail}`} className="text-primary hover:underline">
                  {contactEmail}
                </a>
              </p>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
