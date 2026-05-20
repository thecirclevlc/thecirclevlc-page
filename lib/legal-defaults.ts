// ================================================================
// Default content for Privacy / Terms pages.
// These are the fallbacks used by Privacy.tsx and Terms.tsx when
// the `legal_privacy` / `legal_terms` site_settings rows don't exist
// (or admin hasn't customized them yet).
// ================================================================

import type { LegalPage } from './database.types';

export const PRIVACY_DEFAULT: LegalPage = {
  last_updated:  '2026-03-01',
  contact_email: 'contact@thecirclevlc.com',
  sections: [
    {
      id: 'p-1',
      heading: '1. Data Controller',
      body:
`The data controller is The Circle, an event series based in Valencia, Spain. For any privacy-related enquiries, contact us at the email below.`,
    },
    {
      id: 'p-2',
      heading: '2. Data We Collect',
      body:
`When you submit the application form, we collect the following personal data:

- Full name
- Age
- Location (city/country)
- Instagram handle
- Email address
- Portfolio link (optional, for artists)
- Free-text responses about yourself and your expectations`,
    },
    {
      id: 'p-3',
      heading: '3. Purpose of Processing',
      body:
`Your data is processed for the following purposes:

- Evaluating your application for event attendance
- Communicating event details (location, tickets) to selected participants
- Building and maintaining our creative community

The legal basis for processing is your explicit consent, provided by accepting these terms when submitting the application form (Art. 6(1)(a) GDPR).`,
    },
    {
      id: 'p-4',
      heading: '4. Data Storage & Retention',
      body:
`Your data is stored securely using industry-standard cloud services. We retain your personal data for a maximum of 24 months from the date of submission, after which it is permanently deleted. If you are selected for an event, data may be retained for the duration of your active participation in The Circle community.`,
    },
    {
      id: 'p-5',
      heading: '5. Data Sharing',
      body:
`We do not sell, rent, or trade your personal data to third parties. Data may be shared with:

- Cloud infrastructure providers (for secure storage)
- Google reCAPTCHA (for spam prevention during form submission)

All third-party processors are GDPR-compliant and process data only on our behalf.`,
    },
    {
      id: 'p-6',
      heading: '6. Your Rights',
      body:
`Under the GDPR, you have the right to:

- **Access** — request a copy of all personal data we hold about you
- **Rectification** — request correction of inaccurate data
- **Erasure** — request deletion of your data ("right to be forgotten")
- **Portability** — receive your data in a structured, machine-readable format
- **Withdraw consent** — at any time, without affecting the lawfulness of prior processing
- **Lodge a complaint** — with the Spanish Data Protection Agency (AEPD)

To exercise any of these rights, email us. We will respond within 30 days.`,
    },
    {
      id: 'p-7',
      heading: '7. Cookies & Analytics',
      body:
`This website does not use tracking cookies or third-party analytics. Google reCAPTCHA may set functional cookies required for spam prevention. No personal browsing data is collected or stored beyond the application form submission.`,
    },
    {
      id: 'p-8',
      heading: '8. Changes to This Policy',
      body:
`We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated revision date. We encourage you to review this page periodically.`,
    },
  ],
};

export const TERMS_DEFAULT: LegalPage = {
  last_updated:  '2026-03-01',
  contact_email: 'contact@thecirclevlc.com',
  sections: [
    {
      id: 't-1',
      heading: '1. About The Circle',
      body:
`The Circle is a nomadic creative event series based in Valencia, Spain, curated by Alia Studio. These Terms & Conditions govern your use of our website (thecirclevlc.com) and participation in our events and application process.`,
    },
    {
      id: 't-2',
      heading: '2. Application Process',
      body:
`By submitting the application form, you confirm that all information provided is accurate and truthful. Submission does not guarantee admission to any event. The Circle reserves the right to accept or decline any application at its sole discretion.`,
    },
    {
      id: 't-3',
      heading: '3. Event Participation',
      body:
`Events take place at undisclosed locations communicated only to selected participants. By attending, you agree to respect the privacy of the venue and other attendees. Photography and recording policies are communicated per event. The Circle reserves the right to deny entry or remove any attendee whose behaviour disrupts the event experience.`,
    },
    {
      id: 't-4',
      heading: '4. Intellectual Property',
      body:
`All content on this website — including text, images, design, logos, and code — is the property of The Circle / Alia Studio and is protected by applicable copyright and intellectual property laws. You may not reproduce, distribute, or create derivative works without prior written consent.`,
    },
    {
      id: 't-5',
      heading: '5. Limitation of Liability',
      body:
`The Circle and Alia Studio shall not be held liable for any direct, indirect, or consequential damages arising from your use of this website or attendance at our events, except where required by applicable law. Events are attended at your own risk.`,
    },
    {
      id: 't-6',
      heading: '6. Modifications',
      body:
`We reserve the right to update these Terms at any time. Changes will be posted on this page with the updated date. Continued use of the website or participation in events constitutes acceptance of the revised Terms.`,
    },
    {
      id: 't-7',
      heading: '7. Governing Law',
      body:
`These Terms are governed by and construed in accordance with the laws of Spain. Any disputes shall be subject to the exclusive jurisdiction of the courts of Valencia, Spain.`,
    },
    {
      id: 't-8',
      heading: '8. Contact',
      body: `For questions about these Terms, contact us at the email below.`,
    },
  ],
};
