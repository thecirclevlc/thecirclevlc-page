import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from './components/Footer';

export default function Privacy() {
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
          Privacy Policy
        </h1>
        <p className="text-sm font-mono text-[#f5f5f0]/40 tracking-wider uppercase mb-12">
          Last updated: March 2026 &middot; GDPR Compliant
        </p>

        <div className="space-y-10 text-sm leading-relaxed text-[#f5f5f0]/70">
          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">1. Data Controller</h2>
            <p>
              The data controller is The Circle, an event series based in Valencia, Spain.
              For any privacy-related enquiries, contact us at{' '}
              <a href="mailto:contact@thecirclevlc.com" className="text-[#C42121] hover:underline">
                contact@thecirclevlc.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">2. Data We Collect</h2>
            <p className="mb-3">
              When you submit the application form, we collect the following personal data:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[#f5f5f0]/60">
              <li>Full name</li>
              <li>Age</li>
              <li>Location (city/country)</li>
              <li>Instagram handle</li>
              <li>Email address</li>
              <li>Portfolio link (optional, for artists)</li>
              <li>Free-text responses about yourself and your expectations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">3. Purpose of Processing</h2>
            <p>Your data is processed for the following purposes:</p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-[#f5f5f0]/60">
              <li>Evaluating your application for event attendance</li>
              <li>Communicating event details (location, tickets) to selected participants</li>
              <li>Building and maintaining our creative community</li>
            </ul>
            <p className="mt-3">
              The legal basis for processing is your explicit consent, provided by accepting these terms
              when submitting the application form (Art. 6(1)(a) GDPR).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">4. Data Storage &amp; Retention</h2>
            <p>
              Your data is stored securely using industry-standard cloud services. We retain your personal
              data for a maximum of 24 months from the date of submission, after which it is permanently
              deleted. If you are selected for an event, data may be retained for the duration of your
              active participation in The Circle community.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">5. Data Sharing</h2>
            <p>
              We do not sell, rent, or trade your personal data to third parties. Data may be shared with:
            </p>
            <ul className="list-disc list-inside space-y-1 mt-2 text-[#f5f5f0]/60">
              <li>Cloud infrastructure providers (for secure storage)</li>
              <li>Google reCAPTCHA (for spam prevention during form submission)</li>
            </ul>
            <p className="mt-3">
              All third-party processors are GDPR-compliant and process data only on our behalf.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">6. Your Rights</h2>
            <p className="mb-3">Under the GDPR, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-[#f5f5f0]/60">
              <li><strong className="text-[#f5f5f0]/80">Access</strong> — request a copy of all personal data we hold about you</li>
              <li><strong className="text-[#f5f5f0]/80">Rectification</strong> — request correction of inaccurate data</li>
              <li><strong className="text-[#f5f5f0]/80">Erasure</strong> — request deletion of your data ("right to be forgotten")</li>
              <li><strong className="text-[#f5f5f0]/80">Portability</strong> — receive your data in a structured, machine-readable format</li>
              <li><strong className="text-[#f5f5f0]/80">Withdraw consent</strong> — at any time, without affecting the lawfulness of prior processing</li>
              <li><strong className="text-[#f5f5f0]/80">Lodge a complaint</strong> — with the Spanish Data Protection Agency (AEPD)</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, email us at{' '}
              <a href="mailto:contact@thecirclevlc.com" className="text-[#C42121] hover:underline">
                contact@thecirclevlc.com
              </a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">7. Cookies &amp; Analytics</h2>
            <p>
              This website does not use tracking cookies or third-party analytics. Google reCAPTCHA may
              set functional cookies required for spam prevention. No personal browsing data is collected
              or stored beyond the application form submission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-[#C42121] uppercase tracking-wider mb-3">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this page
              with an updated revision date. We encourage you to review this page periodically.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
