-- ================================================================
-- THE CIRCLE — SUPABASE SCHEMA
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ================================================================

-- ----------------------------------------------------------------
-- EVENTS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  title          TEXT        NOT NULL,
  slug           TEXT        UNIQUE NOT NULL,
  event_number   TEXT,                                         -- e.g. "VOL. I"
  date           DATE,
  time           TEXT,                                         -- e.g. "23:00"
  venue          TEXT,
  description    TEXT,
  cover_image_url TEXT,
  gallery_images  TEXT[]     DEFAULT '{}',
  ticket_url     TEXT,
  lineup         TEXT[]      DEFAULT '{}',                     -- Performer names as strings
  tags           TEXT[]      DEFAULT '{}',
  attendees      INTEGER,
  status         TEXT        DEFAULT 'draft'
                             CHECK (status IN ('draft', 'published')),
  featured       BOOLEAN     DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- DJS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS djs (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE NOT NULL,
  bio          TEXT,
  photo_url    TEXT,
  genres       TEXT[]      DEFAULT '{}',
  social_links JSONB       DEFAULT '{}',   -- { instagram, soundcloud, spotify, website }
  featured     BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- ARTISTS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS artists (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE NOT NULL,
  bio          TEXT,
  photo_url    TEXT,
  genres       TEXT[]      DEFAULT '{}',
  social_links JSONB       DEFAULT '{}',
  featured     BOOLEAN     DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- AUTO-UPDATE updated_at TRIGGER
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_djs_updated_at
  BEFORE UPDATE ON djs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artists_updated_at
  BEFORE UPDATE ON artists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------
ALTER TABLE events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE djs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE artists ENABLE ROW LEVEL SECURITY;

-- EVENTS POLICIES
-- Public (anon) can only read published events
CREATE POLICY "Public read published events"
  ON events FOR SELECT
  USING (status = 'published');

-- Authenticated admins have full access
CREATE POLICY "Authenticated full access events"
  ON events FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- DJS POLICIES
-- Public can read all DJs
CREATE POLICY "Public read djs"
  ON djs FOR SELECT
  USING (true);

-- Authenticated admins have full access
CREATE POLICY "Authenticated full access djs"
  ON djs FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ARTISTS POLICIES
-- Public can read all artists
CREATE POLICY "Public read artists"
  ON artists FOR SELECT
  USING (true);

-- Authenticated admins have full access
CREATE POLICY "Authenticated full access artists"
  ON artists FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ----------------------------------------------------------------
-- STORAGE BUCKET FOR IMAGES
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access
CREATE POLICY "Public read images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Authenticated upload
CREATE POLICY "Authenticated upload images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Authenticated update
CREATE POLICY "Authenticated update images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- Authenticated delete
CREATE POLICY "Authenticated delete images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'images' AND auth.role() = 'authenticated');

-- ----------------------------------------------------------------
-- MIGRATION: DJ improvements (March 2026)
-- ----------------------------------------------------------------
ALTER TABLE djs ADD COLUMN IF NOT EXISTS based_in        TEXT;
ALTER TABLE djs ADD COLUMN IF NOT EXISTS press_kit_url   TEXT;
ALTER TABLE djs ADD COLUMN IF NOT EXISTS gallery_images  TEXT[]  DEFAULT '{}';
ALTER TABLE djs ADD COLUMN IF NOT EXISTS photo_position  TEXT    DEFAULT 'center';

-- ----------------------------------------------------------------
-- MIGRATION: Event partnerships (March 2026)
-- ----------------------------------------------------------------
ALTER TABLE events ADD COLUMN IF NOT EXISTS partnerships JSONB DEFAULT '[]';

-- ----------------------------------------------------------------
-- SEED DATA (optional — matches existing hardcoded events)
-- ----------------------------------------------------------------
-- INSERT INTO events (title, slug, event_number, date, venue, description, status, attendees, lineup, tags)
-- VALUES
--   ('VOL. II', 'vol-ii', 'VOL. II', '2024-12-28', 'Secret Location, Valencia',
--    'The second chapter of The Circle. An immersive night where electronic beats met visual art.',
--    'published', 150,
--    ARRAY['DJ Nexus', 'Analog Dreams', 'The Resonance Collective'],
--    ARRAY['Electronic', 'Immersive', 'Visual Art', 'Limited Capacity']),
--   ('VOL. I', 'vol-i', 'VOL. I', '2024-10-15', 'Hidden Venue, Valencia',
--    'Where it all began. The first Circle gathered under one principle: create without boundaries.',
--    'published', 80,
--    ARRAY['Luna Eclipse', 'The Grid', 'Frequency Shift'],
--    ARRAY['Experimental', 'Underground', 'Electronic', 'Genesis']);

-- ── SEO / Link Preview ────────────────────────────────────────────
-- Editable root-page metadata. Stored as a single row in site_settings:
--
--   id = 'meta_seo'
--   value = {
--     "title":               "THE CIRCLE",
--     "description":         "An exclusive event. Request your access.",
--     "og_title":            "THE CIRCLE",
--     "og_description":      "An exclusive event. Request your access.",
--     "twitter_title":       "THE CIRCLE",
--     "twitter_description": "An exclusive event. Request your access."
--   }
--
-- Read by api/index.ts on every hit of `/`. If the row is missing or
-- Supabase is unreachable the serverless function falls back to the
-- static defaults in index.html.
--
-- No new table or migration needed — reuses the existing site_settings table.

-- ================================================================
-- MIGRATION: Navigation + Social Links + Legal + Form Submissions
-- (May 2026 — admin-configurable site infrastructure)
-- ================================================================

-- ── Social Links ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS social_links (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  platform    TEXT        NOT NULL
              CHECK (platform IN ('instagram','tiktok','spotify','soundcloud',
                                  'youtube','x','facebook','linkedin','email','website')),
  url         TEXT        NOT NULL,
  sort_order  INT         DEFAULT 0,
  visible     BOOLEAN     DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS social_links_sort_idx ON social_links(sort_order);

ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read visible social links"
  ON social_links FOR SELECT
  USING (visible = TRUE);

CREATE POLICY "Authenticated full access social_links"
  ON social_links FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── Form Submissions ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_submissions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  form_key    TEXT        NOT NULL DEFAULT 'form_schema_join',
  data        JSONB       NOT NULL,                       -- { field_name: value }
  status      TEXT        NOT NULL DEFAULT 'new'
              CHECK (status IN ('new','reviewed','accepted','rejected')),
  notes       TEXT,
  ip_hash     TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS form_submissions_created_at_idx ON form_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS form_submissions_status_idx     ON form_submissions(status);

ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public insert submissions"
  ON form_submissions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Authenticated read submissions"
  ON form_submissions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update submissions"
  ON form_submissions FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete submissions"
  ON form_submissions FOR DELETE
  USING (auth.role() = 'authenticated');

-- ── Site Settings rows added by this migration (no DDL — reuses table) ──
--
--   id = 'nav_hamburger'
--   value = { "items": [{ "id":"home","label":"HOME","mode":"route","route":"/" }, ...] }
--
--   id = 'footer_config'
--   value = { "brand_name":"...","tagline":"...","contact_email":"...",
--             "copyright_year":"2026","links":[{...NavItem...}] }
--
--   id = 'legal_privacy'  /  id = 'legal_terms'
--   value = { "last_updated":"YYYY-MM-DD", "intro":"...", "contact_email":"...",
--             "sections":[{ "id":"...","heading":"...","body":"..." }] }
--
--   id = 'form_schema_join'
--   value = { "title":"...","subtitle":"...","event_info":"...",
--             "success_title":"...","success_subtitle":"...",
--             "submit_label_idle":"DONE","submit_label_sending":"SENT :)",
--             "submit_label_error":"ERROR","return_label":"RETURN",
--             "terms_text_html":"...","captcha_required":true,
--             "fields":[{ "id":"...","name":"...","label":"...","type":"text",
--                         "required":true,"sort_order":0 }] }

-- ================================================================
-- MIGRATION: Row-level audit log + restore-from-history
-- (May 2026 — protect against accidental admin overwrites)
--
-- Captures the OLD row on every UPDATE and DELETE on the listed
-- tables. Restoration is done from the application layer by reading
-- audit_log.old_data and writing it back via the normal admin UI.
-- Runs idempotently — safe to re-execute.
-- ================================================================

-- ── audit_log table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL   PRIMARY KEY,
  table_name  TEXT        NOT NULL,
  row_id      TEXT        NOT NULL,
  operation   TEXT        NOT NULL CHECK (operation IN ('UPDATE','DELETE')),
  old_data    JSONB       NOT NULL,
  new_data    JSONB,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by  UUID
);

CREATE INDEX IF NOT EXISTS audit_log_lookup_idx
  ON audit_log (table_name, row_id, changed_at DESC);

-- ── Trigger function ─────────────────────────────────────────────
-- Snapshots OLD on UPDATE/DELETE. Skips no-op updates (where the
-- only change is `updated_at`) to keep history clean given the
-- 3-second autosave on event/dj/artist forms.
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_row_id TEXT;
  v_user   UUID;
  v_old    JSONB;
  v_new    JSONB;
BEGIN
  -- Best-effort current user (null if no JWT context, e.g. cron jobs)
  BEGIN
    v_user := auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_user := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD) - 'updated_at';
    v_new := to_jsonb(NEW) - 'updated_at';
    -- Skip no-op autosaves
    IF v_old = v_new THEN
      RETURN NEW;
    END IF;

    v_row_id := COALESCE((to_jsonb(NEW)->>'id'), (to_jsonb(OLD)->>'id'));
    INSERT INTO audit_log(table_name, row_id, operation, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, v_row_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), v_user);
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    v_row_id := (to_jsonb(OLD)->>'id');
    -- Join tables (event_djs, event_artists) have no `id` column;
    -- fall back to a composite key so we can still recover them.
    IF v_row_id IS NULL THEN
      v_row_id := COALESCE(
        (to_jsonb(OLD)->>'event_id') || ':' || COALESCE(
          (to_jsonb(OLD)->>'dj_id'),
          (to_jsonb(OLD)->>'artist_id'),
          ''
        ),
        TG_TABLE_NAME
      );
    END IF;
    INSERT INTO audit_log(table_name, row_id, operation, old_data, new_data, changed_by)
    VALUES (TG_TABLE_NAME, v_row_id, 'DELETE', to_jsonb(OLD), NULL, v_user);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Attach triggers to every editable table ──────────────────────
-- DROP first so re-running the migration replaces cleanly.
DROP TRIGGER IF EXISTS audit_events           ON events;
DROP TRIGGER IF EXISTS audit_djs              ON djs;
DROP TRIGGER IF EXISTS audit_artists          ON artists;
DROP TRIGGER IF EXISTS audit_site_settings    ON site_settings;
DROP TRIGGER IF EXISTS audit_social_links     ON social_links;
DROP TRIGGER IF EXISTS audit_event_djs        ON event_djs;
DROP TRIGGER IF EXISTS audit_event_artists    ON event_artists;
DROP TRIGGER IF EXISTS audit_artist_categories ON artist_categories;

CREATE TRIGGER audit_events
  AFTER UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_djs
  AFTER UPDATE OR DELETE ON djs
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_artists
  AFTER UPDATE OR DELETE ON artists
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_site_settings
  AFTER UPDATE OR DELETE ON site_settings
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_social_links
  AFTER UPDATE OR DELETE ON social_links
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_event_djs
  AFTER UPDATE OR DELETE ON event_djs
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_event_artists
  AFTER UPDATE OR DELETE ON event_artists
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_artist_categories
  AFTER UPDATE OR DELETE ON artist_categories
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ── RLS: authenticated read-only ─────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read audit_log" ON audit_log;
CREATE POLICY "Authenticated read audit_log"
  ON audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policies → rows can only be written by
-- the SECURITY DEFINER trigger function above, never by client code.
