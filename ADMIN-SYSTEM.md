# The Circle — Admin System & Portability Reference

> **Purpose.** Snapshot of what the admin can edit today, the architecture
> behind it, and a concrete checklist for porting the reusable parts to
> another project (specifically a wellness/retreats site that already has a
> simpler admin). Load this file at the start of any session that needs
> context on the CMS layer.

---

## 1. Session Summary — what was built

Commit `d7e9e21` on `main` (May 2026) added end-to-end admin-editable
infrastructure on top of the existing CRUD admin (Events/DJs/Artists).
19 files, +2836 / -1459 lines.

### Goals achieved
1. Public 404 page with ASCII glitter animation.
2. Hamburger menu, footer and social links fully admin-editable.
   - Route picker only allows pages that exist in `AppRouter.tsx` → no broken links.
   - "By Alia Studio" credit kept **hardcoded** in code (contractual fix).
3. Privacy and Terms pages editable section-by-section from admin.
4. Dynamic form builder: schema-driven `/form` with add/remove/reorder fields,
   editable labels/placeholders/types, captcha toggle.
5. Submissions inbox replacing SheetDB storage (Supabase `form_submissions`
   with RLS), with status workflow, notes, search, CSV export.

### Files added (9)
| Path | Purpose |
|---|---|
| `NotFound.tsx` | 404 page — ASCII "404" with random glyph flicker + GSAP reveal |
| `lib/routes.ts` | `AVAILABLE_ROUTES` constant — single source of truth for nav pickers |
| `lib/formSchema.ts` | Default schema for the join form (8 current fields) |
| `lib/legal-defaults.ts` | Default content for Privacy + Terms (preserves current text verbatim) |
| `components/LegalBody.tsx` | Minimal inline renderer: paragraphs, `- ` bullets, `**bold**` |
| `admin/AdminNavigation.tsx` | 3-tab admin page (Menu, Footer, Social Links) |
| `admin/AdminLegal.tsx` | 2-tab editor (Privacy, Terms) — sections CRUD + reorder |
| `admin/AdminFormBuilder.tsx` | Form schema editor — page text + field CRUD |
| `admin/AdminSubmissions.tsx` | Inbox UI — list, filter, detail panel, CSV export |

### Files modified (10)
| Path | Change |
|---|---|
| `AppRouter.tsx` | 5 new admin routes + 404 catch-all (`*`) |
| `admin/AdminLayout.tsx` | 5 new NAV entries (Submissions, Form Builder, Navigation, Legal Pages) |
| `admin/AdminDashboard.tsx` | New "New Submissions" stat card |
| `Form.tsx` | Reads from `form_schema_join`, renders fields dynamically, stores in Supabase |
| `HamburgerMenu.tsx` | Reads from `nav_hamburger` + queries `social_links` |
| `components/Footer.tsx` | Reads from `footer_config` + `social_links`; Alia Studio stays hardcoded |
| `Privacy.tsx`, `Terms.tsx` | Read from `legal_privacy` / `legal_terms` via `useSiteBlock` |
| `lib/database.types.ts` | New types: NavItem, HamburgerNavConfig, FooterConfig, SocialLink, LegalPage/Section, FormFieldSchema, FormSchema, FormSubmissionRow |
| `supabase-schema.sql` | New tables: `social_links`, `form_submissions` + RLS |

---

## 2. Current Admin Map — what is editable today

URL prefix: `/admin/*` (auth-gated via `ProtectedRoute` → Supabase Auth).

### Dashboard `/admin`
- Stats: total events, published events, DJs, artists, **new submissions** (count of `status='new'`).
- Quick actions to create new entities.

### Domain CRUDs (pre-existing, not touched this session)
- `/admin/events`, `/admin/events/new`, `/admin/events/:id` — events with lineup, gallery, partnerships, hero video, gallery style (default | horizontal).
- `/admin/djs`, `/admin/djs/new`, `/admin/djs/:id` — DJ profile, bio, photo position, genres, social links, gallery, press kit.
- `/admin/artists` (+ subroutes) — artist profile with `category_id` FK.

### Site-wide editing (this session + prior)
- `/admin/visual-editor` — Colors (primary, bg), page hero texts (4 pages), content blocks (manifesto, marquee, headings, join section, form intro/event, 3 CTAs).
- `/admin/settings` — Page backgrounds (image/video per hero), Artist Categories CRUD, SEO/link preview meta (title, og, twitter).
- **`/admin/navigation`** (new) — Hamburger menu, footer config, social_links CRUD.
- **`/admin/legal`** (new) — Privacy + Terms editor.
- **`/admin/form-builder`** (new) — Schema editor for the join form.
- **`/admin/submissions`** (new) — Inbox for form applications.

---

## 3. Core Architecture Patterns

These are the abstractions that make everything composable. They're the
**most portable** pieces — copy them verbatim into any new project.

### 3.1 `site_settings` table
Generic key/value store (id TEXT PK, value JSONB, updated_at). One row per
configurable concept. Used for: page backgrounds, hero texts, content blocks,
SEO meta, navigation config, legal pages, form schema. **The single most
important pattern in the system.** Adding a new editable concept = adding
one row + one admin tab + one read in the public component.

### 3.2 `useSiteBlock<T>(key, fallback)` hook
File: `hooks/useSiteContent.ts`. Generic Supabase fetch for a single
`site_settings` row. Falls back to the provided default if the row doesn't
exist. Returns `{ data, loading, setData }`. **All admin-editable content
on the public site flows through this hook.**

```ts
const { data: footer } = useSiteBlock<FooterConfig>('footer_config', DEFAULT_FOOTER);
```

### 3.3 `EditableText` component
File: `components/EditableText.tsx`. Renders text as a normal element for
visitors; when an admin is logged in (detected via `useAuth`), it becomes
inline-editable with a save button. Pairs with `useSiteBlock` to push
updates back to `site_settings`. This is the "Webflow-lite" piece — admin
can edit text directly on the page they're viewing.

### 3.4 Route picker constraint
File: `lib/routes.ts` exports `AVAILABLE_ROUTES` (array of `{ path, label }`).
Every admin picker for nav links uses this list as the only valid options
(or "External URL" mode). **Eliminates broken links by construction** —
admin can't pick a page that doesn't exist.

### 3.5 Defaults pattern
Every editable concept ships a `DEFAULT_*` constant in `lib/*` matching the
current hardcoded content. The public components fall back to these
defaults when the DB row is absent. **Result: changing the codebase to be
admin-editable produces zero visual change until an admin actually edits.**

### 3.6 Admin UI conventions
- Layout: `admin/AdminLayout.tsx` with sidebar + main panel.
- Cards: `bg-[#111] border border-[#1a1a1a] rounded-xl p-5`.
- Inputs: `bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg` with `#059669` focus border.
- Primary save button: `bg-[#059669] hover:bg-[#047857]`.
- Toast pattern: bottom-right, auto-dismiss after 3.5s.
- Tabs: small pill group at top with `bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1`.

---

## 4. Portability Matrix — for the wellness/retreats project

The other project already has a basic admin. The goal isn't to replace it
wholesale, but to import the **infrastructure pieces** that turn a basic
admin into a complete CMS.

### Tier 1 — Copy verbatim, no changes needed
| Source | Drop-in target |
|---|---|
| `lib/supabase.ts` | If using Supabase — env vars only |
| `lib/imageUpload.ts` | Image/video upload to Supabase Storage |
| `lib/slugify.ts` | Slug helper |
| `hooks/useSiteContent.ts` | The `useSiteBlock` motor |
| `components/EditableText.tsx` | Inline editing |
| `components/LegalBody.tsx` | Minimal markdown renderer |
| `lib/formSchema.ts` (rename defaults) | Default schema shape |

### Tier 2 — Copy + light brand/route swap
| Source | What to change |
|---|---|
| `lib/routes.ts` | Replace `AVAILABLE_ROUTES` with retreats routes |
| `lib/legal-defaults.ts` | Replace with retreats-appropriate Privacy/Terms text |
| `admin/AdminLayout.tsx` | Change brand monogram ("TC" → retreats brand) |
| `admin/AdminLogin.tsx` | Brand only |
| `components/ProtectedRoute.tsx` | None |
| `components/AdminToolbar.tsx` | None |
| `admin/AdminNavigation.tsx` | None (it's generic) |
| `admin/AdminLegal.tsx` | None |
| `admin/AdminFormBuilder.tsx` | None — it's already entity-agnostic |
| `admin/AdminSubmissions.tsx` | None |
| `admin/AdminVisualEditor.tsx` | Update default colors + content keys for retreats hero/manifesto |
| `NotFound.tsx` | Swap accent color, keep ASCII glitter mechanic |

### Tier 3 — Adapt to retreats domain
| Source | New equivalent |
|---|---|
| `admin/AdminEvents*.tsx` | `AdminRetreats*.tsx` — retreat sessions with dates, capacity, pricing |
| `admin/AdminDJs*.tsx` | `AdminInstructors*.tsx` or `AdminFacilitators*.tsx` |
| `admin/AdminArtists*.tsx` | `AdminTestimonials*.tsx` or `AdminGuests*.tsx` |
| `admin/AdminSiteSettings.tsx` | Keep tabs Backgrounds + SEO; drop "Artist Categories"; possibly add retreat-specific category system |
| `App.tsx`, `Form.tsx`, `PastEvents.tsx` etc. | Full rewrite for wellness aesthetic |

### Tier 4 — Skip entirely (Circle-specific)
- WebGL shader background (`Form.tsx` lines 75-258) — replace with calmer wellness aesthetic.
- `ASCIICircle.tsx`, `ASCIIParticles.tsx`, `CustomCursor.tsx`, `CircularLightbox.tsx` — Circle's underground visual identity.
- Anything in `events-data.ts` — legacy hardcoded events.

### Database schema portable as-is
| Table | Purpose | Portable? |
|---|---|---|
| `site_settings` | Generic key/value JSONB | ✅ verbatim |
| `social_links` | Platform + URL + sort + visible | ✅ verbatim |
| `form_submissions` | JSONB data + status + notes | ✅ verbatim |
| `events`, `djs`, `artists`, `artist_categories` | Circle entities | ❌ replace with retreats entities |
| Triggers (`update_updated_at_column`) | Generic | ✅ verbatim |
| RLS pattern (public read published / authenticated full access) | Generic | ✅ verbatim |

---

## 5. site_settings keys reference

| Key | Editor | Shape (TS) |
|---|---|---|
| `page_events`, `page_djs`, `page_artists` | `/admin/settings` Backgrounds | `PageBackground` |
| `content_home_hero`, `content_events_hero`, `content_djs_hero`, `content_artists_hero` | `/admin/visual-editor` Texts | `{ title, subtitle }` |
| `content_home_manifesto` | `/admin/visual-editor` Content | `{ p1, p2, p3 }` |
| `content_home_marquee` | same | `{ text }` |
| `content_home_join` | same | `{ title, desc1, desc2 }` |
| `content_home_headings` | same | `{ h1, h2, h3 }` |
| `content_form_intro`, `content_form_event` | (now part of form_schema_join) | — |
| `content_cta_events`, `content_cta_djs`, `content_cta_artists` | same | `{ title, subtitle }` |
| `site_theme` | `/admin/visual-editor` Colors | `{ primary_color, bg_color }` |
| `meta_seo` | `/admin/settings` SEO | `MetaSeo` |
| `nav_hamburger` | `/admin/navigation` Menu | `HamburgerNavConfig` |
| `footer_config` | `/admin/navigation` Footer | `FooterConfig` |
| `legal_privacy`, `legal_terms` | `/admin/legal` | `LegalPage` |
| `form_schema_join` | `/admin/form-builder` | `FormSchema` |

All types defined in `lib/database.types.ts`.

---

## 6. What's still hardcoded — future work

These are the next obvious admin-editability wins, in rough priority order.

1. **Logo / favicon upload** — currently rotating "THECIRCLE" SVG text is
   inline in `App.tsx`/`Form.tsx`/etc. No way to upload a brand logo image.
2. **Maintenance mode / global banner** — no toggle to take site offline
   or show a notice (e.g. "next event sold out").
3. **Section visibility toggles for home** — admin can edit content but
   can't hide/show manifesto, marquee, CTAs, or reorder home sections.
4. **Typography** — `Poppins` hardcoded everywhere; no font picker.
5. **Animation/effect toggles** — chaos WebGL, custom cursor, marquee speed
   are all baked in.
6. **Email notifications on new submission** — `form_submissions` insert
   doesn't notify anyone; admin has to poll `/admin/submissions`.
7. **Email destination for "Contact"** in footer is in `footer_config`
   but there's no inbox view for it (footer "Contact" is just a `mailto:`).
8. **SheetDB backup** for form submissions — was removed; primary storage
   is Supabase now. If desired, can be re-added as non-blocking fallback.
9. **Multi-language** — single-language site.

---

## 7. Concrete port checklist for the retreats project

Assumes the retreats project already exists with a basic admin. Goal: add
the missing CMS layer without disturbing its existing admin.

### Phase 0 — prereq
- Confirm retreats project uses Supabase. If not, this whole port assumes
  Supabase; adapt persistence layer otherwise (Postgres direct or another BaaS).
- Confirm auth pattern. The Circle uses Supabase Auth with email/password
  for a single admin user. Retreats may already have its own auth — keep
  that, just wire `ProtectedRoute` against it.

### Phase 1 — infrastructure (1-2 days)
1. Run the schema additions from `supabase-schema.sql` lines 204-266
   (the migration block: `social_links` + `form_submissions` tables).
2. If retreats doesn't already have a `site_settings` table, add it
   (see lines 1-50 of the original schema — generic key/value JSONB).
3. Copy `lib/supabase.ts`, `lib/imageUpload.ts`, `lib/slugify.ts`,
   `hooks/useSiteContent.ts` → identical files in retreats.
4. Copy `lib/database.types.ts` but **prune Circle-specific types**
   (Event*, DJ*, Artist*, ArtistCategory*). Keep: PageBackground, SocialLink,
   FormSubmissionRow, FormFieldSchema/FormSchema, LegalPage/LegalSection,
   NavItem, HamburgerNavConfig, FooterConfig, MetaSeo, SubmissionStatus.

### Phase 2 — generic admin pages (1 day)
5. Copy `admin/AdminNavigation.tsx`, `AdminLegal.tsx`, `AdminFormBuilder.tsx`,
   `AdminSubmissions.tsx`, `components/LegalBody.tsx`. Register in the
   retreats admin's existing router and add nav entries.
6. Create `lib/routes.ts` in retreats with the retreats public routes.
7. Create `lib/legal-defaults.ts` with retreats-flavoured Privacy/Terms.
8. Create `lib/formSchema.ts` with the default booking/contact form for
   retreats (or whatever submission flow makes sense).

### Phase 3 — public wiring (1 day)
9. Update retreats' Footer and main menu/header to read from `useSiteBlock`
   with `footer_config` / `nav_hamburger` keys + render social_links.
   Use the existing components as templates.
10. Update retreats' Privacy/Terms pages to read from `legal_privacy` /
    `legal_terms`. Use existing as templates.
11. Update retreats' contact/booking form to read from `form_schema_join`
    (or a different key like `form_schema_booking`) and insert into
    `form_submissions`.

### Phase 4 — domain CRUDs (3-5 days)
12. Build retreats-specific CRUDs (Retreats, Instructors, Testimonials, etc.)
    using `AdminEventForm.tsx` and `AdminEvents.tsx` as templates for the
    visual pattern.

### Phase 5 — polish (1 day)
13. Copy `NotFound.tsx` and swap the accent color if needed.
14. Wire the `/admin/submissions` count into the retreats dashboard.

**Total estimate: 7-10 working days for a clean port.**

---

## 8. Known constraints / gotchas

- TypeScript: the project has pre-existing `tsc --noEmit` errors around
  Supabase's `PromiseLike` (`.catch()` on `.then()` chains). These exist
  in `useSiteContent.ts`, `usePageBackground.ts`, `useSiteTheme.ts`,
  `AdminSiteSettings.tsx`, `AdminVisualEditor.tsx` (all pre-existing) and
  the new admin files follow the same pattern. Vite build is unaffected.
  Worth fixing in a separate pass if porting to a stricter project.
- Form.tsx currently bypasses SheetDB entirely. If you re-port to a
  project that still uses SheetDB or another webhook, restore the call
  as a non-blocking side-effect after the Supabase insert.
- The route picker in `AdminNavigation` only accepts paths that exist in
  `lib/routes.ts`. Keep that file in sync with `AppRouter.tsx` manually.
  (Future improvement: derive `AVAILABLE_ROUTES` from the router at build time.)
- The Alia Studio credit in `Footer.tsx` is **intentionally hardcoded**
  with a comment marker `{/* DO NOT MAKE EDITABLE — Alia Studio credit
  is fixed by contract */}`. Do not surface this to the admin UI.

---

## 9. Files index — quick lookup

```
NotFound.tsx                          # 404 page with ASCII glitter
AppRouter.tsx                         # All routes inc. 5 new admin + catch-all
Form.tsx                              # Dynamic schema-driven join form
HamburgerMenu.tsx                     # Reads nav_hamburger + social_links
Privacy.tsx                           # Reads legal_privacy
Terms.tsx                             # Reads legal_terms

components/
  Footer.tsx                          # Reads footer_config + social_links
  LegalBody.tsx                       # Minimal markdown renderer
  EditableText.tsx                    # Inline editor for admins
  AdminToolbar.tsx                    # Floating "edit" toolbar
  ProtectedRoute.tsx                  # Auth gate

hooks/
  useSiteContent.ts                   # useSiteBlock<T> motor — THE key abstraction
  usePageBackground.ts                # Page hero bg helper
  useSiteTheme.ts                     # Colors helper
  useAuth.ts                          # Supabase auth wrapper

lib/
  supabase.ts                         # Supabase client
  imageUpload.ts                      # Image/video upload to Storage
  slugify.ts                          # Slug helper
  database.types.ts                   # ALL TS types
  routes.ts                           # AVAILABLE_ROUTES — single source of truth
  formSchema.ts                       # DEFAULT_FORM_SCHEMA (join form)
  legal-defaults.ts                   # PRIVACY_DEFAULT, TERMS_DEFAULT

admin/
  AdminLayout.tsx                     # Sidebar shell + NAV array
  AdminLogin.tsx                      # Login screen
  AdminDashboard.tsx                  # Stats + quick actions
  AdminEvents.tsx / AdminEventForm.tsx
  AdminDJs.tsx / AdminDJForm.tsx
  AdminArtists.tsx / AdminArtistForm.tsx
  AdminSubmissions.tsx                # NEW — form submissions inbox
  AdminFormBuilder.tsx                # NEW — form schema editor
  AdminVisualEditor.tsx               # Colors + hero texts + content blocks
  AdminNavigation.tsx                 # NEW — menu/footer/social
  AdminLegal.tsx                      # NEW — Privacy/Terms editor
  AdminSiteSettings.tsx               # Backgrounds + categories + SEO
```
