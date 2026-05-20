import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './components/Footer';
import LegalBody from './components/LegalBody';
import { useSiteBlock } from './hooks/useSiteContent';
import { LEGAL_TERMS_KEY, type LegalPage } from './lib/database.types';
import { TERMS_DEFAULT } from './lib/legal-defaults';

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function Terms() {
  const navigate = useNavigate();
  const { data: page } = useSiteBlock<LegalPage>(LEGAL_TERMS_KEY, TERMS_DEFAULT);

  return (
    <div className="min-h-screen bg-[#050000] text-[#f5f5f0] selection:bg-[#C42121] selection:text-black">
      <header className="fixed top-0 w-full bg-[#050000] border-b border-[#C42121]/30 z-50 h-16 md:h-20 flex items-center justify-between px-4 md:px-10">
        <button
          onClick={() => { window.scrollTo(0, 0); navigate('/'); }}
          className="text-[#C42121] text-lg md:text-xl font-black tracking-tighter uppercase cursor-pointer"
        >
          THE CIRCLE
        </button>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-4xl md:text-5xl font-black text-[#C42121] tracking-tighter uppercase mb-4">
          Terms &amp; Conditions
        </h1>
        <p className="text-sm font-mono text-[#f5f5f0]/40 tracking-wider uppercase mb-12">
          Last updated: {formatMonthYear(page.last_updated)}
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-[#f5f5f0]/70">
          {page.intro && (
            <section>
              <p>{page.intro}</p>
            </section>
          )}
          {page.sections.map(s => (
            <section key={s.id}>
              <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">
                {s.heading}
              </h2>
              <LegalBody body={s.body} />
            </section>
          ))}
          {page.contact_email && (
            <section>
              <p className="text-[#f5f5f0]/60">
                Contact:{' '}
                <a href={`mailto:${page.contact_email}`} className="text-[#C42121] hover:underline">
                  {page.contact_email}
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
