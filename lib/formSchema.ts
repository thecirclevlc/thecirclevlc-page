// ================================================================
// Default schema for the public "Join The Circle" form.
// Stored in site_settings row id = 'form_schema_join'.
// ================================================================

import type { FormSchema } from './database.types';

export const DEFAULT_FORM_SCHEMA: FormSchema = {
  title:                'JOIN THE CIRCLE',
  subtitle:             'VOL. III',
  event_info:           '28.02.2026 - SECRET LOCATION, VALENCIA',
  success_title:        'WE HAVE RECEIVED YOUR INFORMATION.',
  success_subtitle:     'If your vibe matches the spirit of the event, we will reach out with more details!',
  submit_label_idle:    'DONE',
  submit_label_sending: 'SENT :)',
  submit_label_error:   'ERROR',
  return_label:         'RETURN',
  terms_text_html:
    'I accept the {terms_link:Terms and Conditions} and {privacy_link:Privacy Policy}',
  captcha_required:     true,
  fields: [
    { id: 'f-name',         name: 'fullName',    label: 'Full Name',                                                        placeholder: 'Your complete name',         type: 'text',     required: true,  sort_order: 0 },
    { id: 'f-age',          name: 'age',         label: 'Age',                                                              placeholder: 'Your age',                   type: 'text',     required: true,  sort_order: 1 },
    { id: 'f-from',         name: 'whereFrom',   label: 'Where are you from',                                               placeholder: 'e.g., Valencia',             type: 'text',     required: true,  sort_order: 2 },
    { id: 'f-ig',           name: 'instagram',   label: 'IG account',                                                       placeholder: '@username',                  type: 'text',     required: true,  sort_order: 3 },
    { id: 'f-email',        name: 'email',       label: 'E-mail address',                                                   placeholder: 'your@email.com',             type: 'email',    required: true,  sort_order: 4 },
    { id: 'f-artist',       name: 'artist',      label: 'Are you an artist? If so, please include the link to your portfolio (optional)', placeholder: 'Portfolio link (optional)',  type: 'text',     required: false, sort_order: 5 },
    { id: 'f-unexpected',   name: 'unexpected',  label: "What's something people would never expect about you?",            placeholder: 'Your answer',                type: 'textarea', required: true,  rows: 3, sort_order: 6 },
    { id: 'f-expectations', name: 'expectations', label: 'What do you expect from The Circle?',                              placeholder: 'Your answer',                type: 'textarea', required: true,  rows: 3, sort_order: 7 },
  ],
};
