// ================================================================
// Form schemas. Each form is one `site_settings` row keyed
// `form_schema_<slug>`; listing them is a LIKE query, so there is no
// registry to keep in sync.
// ================================================================

import { supabase } from './supabase';
import { slugify } from './slugify';
import {
  FORM_SCHEMA_PREFIX, DEFAULT_FORM_SLUG,
  formKeyForSlug, slugFromFormKey,
  uniqueFormSlug as pureUniqueFormSlug,
  type FormSchema,
} from './database.types';

export const DEFAULT_FORM_SCHEMA: FormSchema = {
  name:                 'Join The Circle',
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
  terms_required:       true,
  captcha_required:     true,
  crm_post_url:         '',
  crm_email_field:      'email',
  crm_tags:             '',
  crm_consent_field:    '',
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

/** A new form starts with name + email + a marketing opt-in, which is the shape every form here needs. */
export function blankFormSchema(name: string): FormSchema {
  return {
    ...DEFAULT_FORM_SCHEMA,
    name,
    title:      name.toUpperCase(),
    subtitle:   '',
    event_info: '',
    // The opt-in below is the one that gates the mailing list. Wired up here
    // so a new form is lawful by default instead of only if she remembers.
    crm_consent_field: 'optIn',
    fields: [
      { id: 'f-name',  name: 'fullName', label: 'Full Name',      placeholder: 'Your complete name', type: 'text',  required: true,  sort_order: 0 },
      { id: 'f-email', name: 'email',    label: 'E-mail address', placeholder: 'your@email.com',     type: 'email', required: true,  sort_order: 1 },
      { id: 'f-optin', name: 'optIn',    label: 'I agree to receive emails from The Circle',         type: 'checkbox', required: false, sort_order: 2 },
    ],
  };
}

export interface FormListItem {
  slug:      string;
  key:       string;
  name:      string;
  is_default: boolean;
}

/**
 * Lists every form. Falls back to the default form when nothing is stored
 * yet, so the picker is never empty on a fresh install.
 */
export async function listForms(): Promise<FormListItem[]> {
  const { data } = await supabase
    .from('site_settings')
    .select('id, value')
    .like('id', `${FORM_SCHEMA_PREFIX}%`);

  const rows = (data ?? []).map(r => {
    const slug = slugFromFormKey(r.id as string);
    return {
      slug,
      key:  r.id as string,
      name: ((r.value as Partial<FormSchema>)?.name) || slug,
      is_default: slug === DEFAULT_FORM_SLUG,
    };
  });

  if (!rows.some(f => f.is_default)) {
    rows.unshift({
      slug: DEFAULT_FORM_SLUG,
      key:  formKeyForSlug(DEFAULT_FORM_SLUG),
      name: DEFAULT_FORM_SCHEMA.name,
      is_default: true,
    });
  }

  // Default first, then alphabetical.
  return rows.sort((a, b) =>
    Number(b.is_default) - Number(a.is_default) || a.name.localeCompare(b.name));
}

/** Wraps the pure helper with this project's slugify. */
export const uniqueFormSlug = (name: string, taken: string[]) =>
  pureUniqueFormSlug(name, taken, slugify);
