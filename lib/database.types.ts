// ================================================================
// THE CIRCLE — Database Types
// Manually typed to match supabase-schema.sql
// ================================================================

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
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  facebook?: string;
  website?: string;
}

// ── DJ ─────────────────────────────────────────────────────────────

export interface DJ {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  genres: string[];
  social_links: SocialLinks;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export type DJInsert = Omit<DJ, 'id' | 'created_at' | 'updated_at'>;
export type DJUpdate = Partial<DJInsert>;

// ── Artist ─────────────────────────────────────────────────────────

export interface Artist {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  genres: string[];
  social_links: SocialLinks;
  featured: boolean;
  category_id: string | null;    // FK → artist_categories.id
  created_at: string;
  updated_at: string;
}

export type ArtistInsert = Omit<Artist, 'id' | 'created_at' | 'updated_at'>;
export type ArtistUpdate = Partial<ArtistInsert>;

/** Artist with joined category */
export interface ArtistWithCategory extends Artist {
  artist_categories: ArtistCategory | null;
}

// ── Form Submissions ───────────────────────────────────────────────

export type SubmissionStatus = 'new' | 'reviewed' | 'accepted' | 'rejected';

export interface FormSubmission {
  id: string;
  full_name: string | null;
  age: string | null;
  where_from: string | null;
  instagram: string | null;
  email: string | null;
  unexpected: string | null;
  expectations: string | null;
  artist_link: string | null;
  status: SubmissionStatus;
  notes: string | null;
  created_at: string;
}

export type FormSubmissionInsert = Omit<FormSubmission, 'id' | 'created_at' | 'status' | 'notes'>;

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
