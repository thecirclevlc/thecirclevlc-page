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
  ticket_url: string | null;
  lineup: string[];
  tags: string[];
  attendees: number | null;
  status: 'draft' | 'published';
  featured: boolean;
  created_at: string;
  updated_at: string;
}

export type EventInsert = Omit<Event, 'id' | 'created_at' | 'updated_at'>;
export type EventUpdate = Partial<EventInsert>;

// ----------------------------------------------------------------

export interface SocialLinks {
  instagram?: string;
  soundcloud?: string;
  spotify?: string;
  facebook?: string;
  website?: string;
}

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

// ----------------------------------------------------------------

export interface Artist {
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

export type ArtistInsert = Omit<Artist, 'id' | 'created_at' | 'updated_at'>;
export type ArtistUpdate = Partial<ArtistInsert>;

// ── Site Settings ─────────────────────────────────────────────────

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
