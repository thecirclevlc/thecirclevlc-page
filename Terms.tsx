import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './components/Footer';

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050000] text-[#f5f5f0] selection:bg-[#C42121] selection:text-black">
      {/* Header */}
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
          Last updated: March 2026
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-[#f5f5f0]/70">
          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">1. About The Circle</h2>
            <p>
              The Circle is a nomadic creative event series based in Valencia, Spain, curated by Alia Studio.
              These Terms &amp; Conditions govern your use of our website (thecirclevlc.com) and participation
              in our events and application process.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">2. Application Process</h2>
            <p>
              By submitting the application form, you confirm that all information provided is accurate and truthful.
              Submission does not guarantee admission to any event. The Circle reserves the right to accept or
              decline any application at its sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">3. Event Participation</h2>
            <p>
              Events take place at undisclosed locations communicated only to selected participants. By attending,
              you agree to respect the privacy of the venue and other attendees. Photography and recording policies
              are communicated per event. The Circle reserves the right to deny entry or remove any attendee whose
              behaviour disrupts the event experience.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">4. Intellectual Property</h2>
            <p>
              All content on this website — including text, images, design, logos, and code — is the property of
              The Circle / Alia Studio and is protected by applicable copyright and intellectual property laws.
              You may not reproduce, distribute, or create derivative works without prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">5. Limitation of Liability</h2>
            <p>
              The Circle and Alia Studio shall not be held liable for any direct, indirect, or consequential damages
              arising from your use of this website or attendance at our events, except where required by applicable
              law. Events are attended at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">6. Modifications</h2>
            <p>
              We reserve the right to update these Terms at any time. Changes will be posted on this page with the
              updated date. Continued use of the website or participation in events constitutes acceptance of the
              revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">7. Governing Law</h2>
            <p>
              These Terms are governed by and construed in accordance with the laws of Spain. Any disputes shall
              be subject to the exclusive jurisdiction of the courts of Valencia, Spain.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">8. Contact</h2>
            <p>
              For questions about these Terms, contact us at{' '}
              <a href="mailto:contact@thecirclevlc.com" className="text-[#C42121] hover:underline">
                contact@thecirclevlc.com
              </a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
