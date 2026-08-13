// ================================================================
// THE CIRCLE — Database Types
// Manually typed to match supabase-schema.sql
// ================================================================

export interface EventPartnership {
  name: string;
  logo_url?: string;
  url?: string;
}

export interface Event {
  id: string;
  title: string;
  slug: string;
  event_number: string | null;
  date: string | null;           // ISO date string "YYYY-MM-DD"
  time: string | null;
  venue: string | null;
  description: string | null;
  short_description: string | null; // Short teaser — shown in event list cards
  cover_image_url: string | null;
  hero_video_url: string | null; // Optional background video for the event hero
  gallery_images: string[];
  gallery_style: 'default' | 'horizontal'; // Gallery display mode (Fase 3)
  ticket_url: string | null;
  lineup: string[];              // Legacy: free-text lineup (kept for backwards compat)
  tags: string[];
  attendees: number | null;
  partnerships: EventPartnership[];
  status: 'draft' | 'published';
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export type EventInsert = Omit<Event, 'id' | 'created_at' | 'updated_at'>;
export type EventUpdate = Partial<EventInsert>;

// ── Join tables ────────────────────────────────────────────────────

/** Row in event_djs join table */
export interface EventDJ {
  event_id: string;
  dj_id: string;
  sort_order: number;
}

/** Row in event_artists join table */
export interface EventArtist {
  event_id: string;
  artist_id: string;
  sort_order: number;
}

/** DJ record joined from event_djs queries */
export interface EventDJWithProfile {
  dj_id: string;
  sort_order: number;
  djs: DJ;
}

/** Artist record joined from event_artists queries */
export interface EventArtistWithProfile {
  artist_id: string;
  sort_order: number;
  artists: Artist & { artist_categories: ArtistCategory | null };
}

// ── Minimal entity shape used by EntitySelector ────────────────────

export interface EntityOption {
  id: string;
  name: string;
  photo_url: string | null;
}

// ── Artist Categories ──────────────────────────────────────────────

export interface ArtistCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: string;
}

export type ArtistCategoryInsert = Omit<ArtistCategory, 'id' | 'created_at'>;
export type ArtistCategoryUpdate = Partial<ArtistCategoryInsert>;

// ── Social Links ───────────────────────────────────────────────────

export interface SocialLinks {
  instagram?:  string;
  soundcloud?: string;
  spotify?:    string;
  facebook?:   string;
  website?:    string;
  // The footer already renders ten platforms from `social_links`; profiles
  // only ever offered five. Same icon set, no schema change — this is JSONB.
  tiktok?:     string;
  youtube?:    string;
  x?:          string;
  linkedin?:   string;
  email?:      string;
}

/** Platforms offered in the profile editor, in display order. */
export const PROFILE_SOCIAL_KEYS: { key: keyof SocialLinks; label: string }[] = [
  { key: 'instagram',  label: 'Instagram' },
  { key: 'soundcloud', label: 'SoundCloud' },
  { key: 'spotify',    label: 'Spotify' },
  { key: 'youtube',    label: 'YouTube' },
  { key: 'tiktok',     label: 'TikTok' },
  { key: 'facebook',   label: 'Facebook' },
  { key: 'x',          label: 'X' },
  { key: 'linkedin',   label: 'LinkedIn' },
  { key: 'website',    label: 'Website' },
  { key: 'email',      label: 'Email' },
];

// ── Profile extras (DJs + Artists share these) ────────────────────
// Stored as JSONB on the profile row rather than in side tables: they are
// short lists always read together with the profile, never queried on their
// own, and this way they inherit the row's audit history for free.

/** "añadir videos" — a link, never an uploaded file. */
export interface ProfileVideo {
  id:     string;
  url:    string;
  title?: string;
}

/** "anadir botones" — book me, portfolio, donate… */
export interface ProfileLink {
  id:       string;
  label:    string;
  url:      string;
  primary?: boolean;
}

/** "crear nuevas informaciones" — she writes both the label and the value. */
export interface ProfileFact {
  id:    string;
  label: string;
  value: string;
}

// ── DJ ─────────────────────────────────────────────────────────────

/** Fields every profile has, whatever its type. */
export interface ProfileBase {
  id: string;
  /** Manual position in the public grid. */
  sort_order: number;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  based_in: string | null;
  press_kit_url: string | null;
  gallery_images: string[];
  photo_position: string;
  genres: string[];
  social_links: SocialLinks;
  videos: ProfileVideo[];
  links: ProfileLink[];
  facts: ProfileFact[];
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface DJ extends ProfileBase {}

export type DJInsert = Omit<DJ, 'id' | 'created_at' | 'updated_at'>;
export type DJUpdate = Partial<DJInsert>;

// ── Artist ─────────────────────────────────────────────────────────

export interface Artist extends ProfileBase {
  category_id: string | null;    // FK → artist_categories.id
}

export type ArtistInsert = Omit<Artist, 'id' | 'created_at' | 'updated_at'>;
export type ArtistUpdate = Partial<ArtistInsert>;

/** Artist with joined category */
export interface ArtistWithCategory extends Artist {
  artist_categories: ArtistCategory | null;
}

// ── Form Submissions ───────────────────────────────────────────────

export type SubmissionStatus = 'new' | 'reviewed' | 'accepted' | 'rejected';

// The flat-column shape was replaced in May 2026 by `form_submissions`
// (JSONB `data` + `form_key`). See FormSubmissionRow at the bottom of
// this file — that is the live shape.

// ── Site Settings ──────────────────────────────────────────────────

export interface PageBackground {
  bg_url:  string | null;
  bg_type: 'none' | 'image' | 'video';
}

export interface SiteSettings {
  id:         string;
  value:      PageBackground;
  updated_at: string;
}

export type PageKey = 'page_events' | 'page_djs' | 'page_artists';

// ── SEO / Link Preview ────────────────────────────────────────────

export interface MetaSeo {
  title:               string;
  description:         string;
  og_title:            string;
  og_description:      string;
  twitter_title:       string;
  twitter_description: string;
}

export const META_SEO_DEFAULTS: MetaSeo = {
  title:               'THE CIRCLE',
  description:         'An exclusive event. Request your access.',
  og_title:            'THE CIRCLE',
  og_description:      'An exclusive event. Request your access.',
  twitter_title:       'THE CIRCLE',
  twitter_description: 'An exclusive event. Request your access.',
};

export const META_SEO_KEY = 'meta_seo' as const;

// ── Navigation: Hamburger Menu + Footer ───────────────────────────

export type NavItemMode = 'route' | 'external';

export interface NavItem {
  id:            string;
  label:         string;
  mode:          NavItemMode;
  route?:        string;        // when mode='route' — must match AVAILABLE_ROUTES
  external_url?: string;        // when mode='external' — must start with http(s)://
}

export interface HamburgerNavConfig {
  items: NavItem[];
  /**
   * Optional call-to-action button pinned to the right of the header.
   * Empty label = no button, which is the state the site shipped with.
   */
  cta?: { label: string; route: string };
}

export interface FooterConfig {
  brand_name:     string;
  tagline:        string;       // e.g. "Valencia, Spain"
  contact_email:  string;
  copyright_year: string;
  links:          NavItem[];
}

export const NAV_HAMBURGER_KEY = 'nav_hamburger' as const;
export const FOOTER_CONFIG_KEY = 'footer_config' as const;

/** Home JOIN block — the big APPLY button. */
export interface HomeJoinBlock {
  title: string;
  desc1: string;
  desc2: string;
  /** Button wording. Empty keeps the built-in "APPLY". */
  cta_label: string;
  /** Where it goes. Empty keeps the default form. */
  cta_route: string;
}

export const DEFAULT_HAMBURGER: HamburgerNavConfig = {
  items: [
    { id: 'home',    label: 'HOME',        mode: 'route', route: '/' },
    { id: 'events',  label: 'PAST EVENTS', mode: 'route', route: '/past-events' },
    { id: 'djs',     label: 'DJS',         mode: 'route', route: '/djs' },
    { id: 'artists', label: 'ARTISTS',     mode: 'route', route: '/artists' },
    { id: 'join',    label: 'JOIN US',     mode: 'route', route: '/form' },
  ],
};

export const DEFAULT_FOOTER: FooterConfig = {
  brand_name:     'THE CIRCLE',
  tagline:        'Valencia, Spain',
  contact_email:  'contact@thecirclevlc.com',
  copyright_year: '2026',
  links: [
    { id: 'l-events',  label: 'Events',  mode: 'route', route: '/past-events' },
    { id: 'l-djs',     label: 'DJs',     mode: 'route', route: '/djs' },
    { id: 'l-artists', label: 'Artists', mode: 'route', route: '/artists' },
  ],
};

// ── Social Links (separate table) ─────────────────────────────────

export type SocialPlatform =
  | 'instagram' | 'tiktok' | 'spotify' | 'soundcloud'
  | 'youtube' | 'x' | 'facebook' | 'linkedin'
  | 'email' | 'website';

export interface SocialLink {
  id:         string;
  platform:   SocialPlatform;
  url:        string;
  sort_order: number;
  visible:    boolean;
  created_at: string;
}

export type SocialLinkInsert = Omit<SocialLink, 'id' | 'created_at'>;
export type SocialLinkUpdate = Partial<SocialLinkInsert>;

// ── Legal Pages (Privacy / Terms) ─────────────────────────────────

export interface LegalSection {
  id:      string;
  heading: string;
  body:    string;     // plain text; \n\n = paragraph break; - = bullet; **x** = bold
}

export interface LegalPage {
  last_updated:  string;       // ISO "YYYY-MM-DD"
  intro?:        string;
  contact_email: string;
  sections:      LegalSection[];
}

export const LEGAL_PRIVACY_KEY = 'legal_privacy' as const;
export const LEGAL_TERMS_KEY   = 'legal_terms'   as const;

// ── Dynamic Form Builder ──────────────────────────────────────────

export type FormFieldType =
  | 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'select'
  | 'checkbox'    // single yes/no — "I agree to receive emails"
  | 'radio'       // pick one from options
  | 'date';

/** Field types whose answer is a yes/no rather than free text. */
export const BOOLEAN_FIELD_TYPES: readonly FormFieldType[] = ['checkbox'] as const;

export interface FormFieldSchema {
  id:           string;
  name:         string;          // snake_case key for submission data
  label:        string;
  placeholder?: string;
  help_text?:   string;          // small print under the field
  type:         FormFieldType;
  required:     boolean;
  options?:     string[];        // for select + radio
  rows?:        number;          // for textarea
  sort_order:   number;
}

export interface FormSchema {
  /** Human name, shown only in the admin form picker. */
  name:                   string;
  title:                  string;
  subtitle:               string;
  event_info:             string;
  success_title:          string;
  success_subtitle:       string;
  submit_label_idle:      string;
  submit_label_sending:   string;
  submit_label_error:     string;
  return_label:           string;
  terms_text_html:        string;
  /** When false the terms checkbox is not shown at all. */
  terms_required:         boolean;
  captcha_required:       boolean;
  /**
   * Public form endpoint of the client's CRM — e.g. the Mailchimp embedded
   * form action URL (`https://….list-manage.com/subscribe/post?u=…&id=…`).
   * NOT a secret: it is designed to sit in public HTML, which is exactly why
   * the client can paste it herself and swap CRM without touching env vars.
   * Empty string = submissions are stored in Supabase only.
   */
  crm_post_url:           string;
  /** Field `name` whose value carries the subscriber email to the CRM. */
  crm_email_field:        string;
  fields:                 FormFieldSchema[];
}

// ── Multi-form storage ────────────────────────────────────────────
// Every form is one `site_settings` row keyed `form_schema_<slug>`.
// Listing them is a `like('id', 'form_schema_%')` — no registry row to
// keep in sync, so it cannot drift.

export const FORM_SCHEMA_PREFIX = 'form_schema_' as const;

/** The original form. `/form` still resolves here, so old links keep working. */
export const FORM_SCHEMA_JOIN_KEY = 'form_schema_join' as const;
export const DEFAULT_FORM_SLUG = 'join' as const;

export const formKeyForSlug  = (slug: string) => `${FORM_SCHEMA_PREFIX}${slug}`;
export const slugFromFormKey = (key: string)  => key.slice(FORM_SCHEMA_PREFIX.length);

/** `/form` for the default form, `/form/<slug>` for the rest. */
export const formPath = (slug: string) =>
  slug === DEFAULT_FORM_SLUG ? '/form' : `/form/${slug}`;

/**
 * Whether a required field has been left unanswered.
 *
 * Checkboxes are the reason this is not a plain `!value.trim()`: an unticked
 * box stores the literal string 'no', which is truthy, so a required opt-in
 * would sail through validation.
 */
export function isFieldBlank(field: Pick<FormFieldSchema, 'type'>, value: string): boolean {
  const v = (value ?? '').trim();
  return field.type === 'checkbox' ? v !== 'yes' : !v;
}

/**
 * A slug that is unique among `taken` and safe as a URL segment. Suffixes
 * -2, -3, … on collision instead of reusing the key, which would overwrite
 * an existing form and destroy it silently.
 */
export function uniqueFormSlug(name: string, taken: string[], slugify: (s: string) => string): string {
  const base = slugify(name).slice(0, 40) || 'form';
  if (!taken.includes(base)) return base;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.includes(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

// ── Call-to-action blocks ─────────────────────────────────────────
// One per page (content_cta_events / _djs / _artists) plus the home
// JOIN block. `form_slug` is what lets the client point the Artists CTA
// at an artists-only form and the DJs CTA at a DJs-only one — the thing
// she asked for after finding all four hardcoded to `/form`.

export interface CtaBlock {
  title:      string;
  subtitle:   string;
  /** Form the button opens. Empty = the default form, i.e. today's behaviour. */
  form_slug:  string;
  /** Button text. Empty = keep the page's built-in wording. */
  cta_label:  string;
}

export type CtaKey =
  | 'content_cta_events'
  | 'content_cta_djs'
  | 'content_cta_artists';

export const CTA_BLOCKS: { key: CtaKey; label: string }[] = [
  { key: 'content_cta_events',  label: 'Past Events — bottom CTA' },
  { key: 'content_cta_djs',     label: 'DJs — bottom CTA' },
  { key: 'content_cta_artists', label: 'Artists — bottom CTA' },
];

// Submission table (form_submissions) — replaces the old flat shape
export interface FormSubmissionRow {
  id:         string;
  form_key:   string;
  data:       Record<string, string>;
  status:     SubmissionStatus;
  notes:      string | null;
  ip_hash:    string | null;
  user_agent: string | null;
  created_at: string;
}

export type FormSubmissionRowInsert = Pick<FormSubmissionRow, 'form_key' | 'data'> & {
  user_agent?: string | null;
  ip_hash?:    string | null;
};

// ── Pages (admin-created) ─────────────────────────────────────────
// One row per page the client builds from the panel. `blocks` is an
// ordered list; rendering is a switch, so an unknown type from a future
// version renders as nothing instead of crashing the page.

/**
 * How an uploaded image is fitted into its frame.
 *
 * `cover` fills the frame and crops — good for a face or a wide shot.
 * `contain` shows the whole image and pads — good for a poster or a logo,
 * which `cover` would slice.
 * `focus` moves the crop, so a subject near the top does not lose their head.
 */
export interface ImageDisplay {
  fit?:    'cover' | 'contain';
  focus?:  'center' | 'top' | 'bottom' | 'left' | 'right';
  /** Frame shape. `auto` keeps the image's own proportions. */
  ratio?:  'auto' | 'square' | 'wide' | 'portrait';
}

export const IMAGE_FIT_OPTIONS = [
  { value: 'cover',   label: 'Fill the frame', hint: 'Crops the edges' },
  { value: 'contain', label: 'Show it whole',  hint: 'Adds space around it' },
] as const;

export const IMAGE_FOCUS_OPTIONS = [
  { value: 'center', label: 'Centre' }, { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' }, { value: 'left', label: 'Left' },
  { value: 'right',  label: 'Right' },
] as const;

export const IMAGE_RATIO_OPTIONS = [
  { value: 'auto',     label: 'Original shape' },
  { value: 'wide',     label: 'Wide (16:10)' },
  { value: 'square',   label: 'Square' },
  { value: 'portrait', label: 'Tall (3:4)' },
] as const;

/** Tailwind classes for a chosen frame shape. */
export const ratioClass = (r?: string) =>
  r === 'square' ? 'aspect-square'
  : r === 'wide' ? 'aspect-[16/10]'
  : r === 'portrait' ? 'aspect-[3/4]'
  : '';

/**
 * Layout for one block. See lib/blockStyle.ts — a small set of named steps
 * rather than free numbers, so any combination still looks like this site.
 */
export type PageBlockStyle = import('./blockStyle').BlockStyle;

export type PageBlock =
  | { id: string; type: 'text';    hidden?: boolean; style?: PageBlockStyle; heading?: string; body: string }
  | { id: string; type: 'image';   hidden?: boolean; style?: PageBlockStyle; url: string; alt?: string; caption?: string; display?: ImageDisplay }
  | { id: string; type: 'gallery'; hidden?: boolean; style?: PageBlockStyle; heading?: string; images: string[]; display?: ImageDisplay }
  | { id: string; type: 'video';   hidden?: boolean; style?: PageBlockStyle; heading?: string; url: string; caption?: string }
  | { id: string; type: 'buttons'; hidden?: boolean; style?: PageBlockStyle; heading?: string; items: PageButton[] }
  | { id: string; type: 'form';    hidden?: boolean; style?: PageBlockStyle; heading?: string; form_slug: string };

export type PageBlockType = PageBlock['type'];

export interface PageButton {
  id:    string;
  label: string;
  url:   string;
  /** Renders as the loud primary button rather than an outline. */
  primary?: boolean;
}

export interface Page {
  id:              string;
  slug:            string;
  title:           string;
  status:          'draft' | 'published';
  blocks:          PageBlock[];
  seo_title:       string | null;
  seo_description: string | null;
  sort_order:      number;
  show_in_nav:     boolean;
  created_at:      string;
  updated_at:      string;
}

export type PageInsert = Omit<Page, 'id' | 'created_at' | 'updated_at'>;
export type PageUpdate = Partial<PageInsert>;

/**
 * Slugs the router already owns. A page using one of these would be
 * unreachable — the static route always wins — and the client would have no
 * way to understand why. Mirrored by a CHECK constraint on the table so it
 * holds even if something writes around this file.
 */
export const RESERVED_PAGE_SLUGS: readonly string[] = [
  'admin', 'api', 'form', 'djs', 'artists', 'past-events', 'terms', 'privacy',
  'assets', 'static', 'robots', 'sitemap', 'index', 'app', '_app',
] as const;

/** Returns the reason a slug is unusable, or null when it is fine. */
export function validatePageSlug(slug: string, takenSlugs: string[] = []): string | null {
  if (!slug) return 'Give the page a web address.';
  if (slug.length < 2 || slug.length > 60) return 'The address must be between 2 and 60 characters.';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return 'Use lowercase letters, numbers and hyphens only.';
  if (RESERVED_PAGE_SLUGS.includes(slug)) return `"${slug}" is already used by the site. Pick another address.`;
  if (takenSlugs.includes(slug)) return 'Another page already uses this address.';
  return null;
}

// ── Audit Log (row history) ───────────────────────────────────────
// Populated by the log_audit_changes() trigger on every UPDATE/DELETE
// of the editable tables. Restoration is handled in the admin UI.

export type AuditOperation = 'UPDATE' | 'DELETE';

export interface AuditLogRow {
  id:         number;
  table_name: string;
  row_id:     string;
  operation:  AuditOperation;
  old_data:   Record<string, unknown>;
  new_data:   Record<string, unknown> | null;
  changed_at: string;
  changed_by: string | null;
}
