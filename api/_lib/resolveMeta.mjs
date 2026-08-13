// Works out the title, description and canonical URL for any public route.
//
// Until now only "/" went through the serverless function; everything else was
// served the static shell, so /djs, /artists, /past-events, /form, /terms and
// /privacy all shipped the literal string `<!--META:title-->THE CIRCLE` as
// their <title>, and every one of them declared the home page as its canonical
// URL — which tells Google they are all duplicates of the home page.
//
// Pure except for the `db` reader passed in, so it can be checked without a
// network or a database.

export const SITE_URL = 'https://www.thecirclevlc.com';

/** Routes whose copy lives in code rather than in a table. */
const STATIC_ROUTES = {
  '/': null,   // falls through to the site defaults in meta_seo
  '/past-events': {
    title: 'Past Events',
    description: 'Every chapter of The Circle so far — secret locations, lineups and nights that happened once.',
  },
  '/djs': {
    title: 'DJs',
    description: 'The selectors who define The Circle. Each set a journey, each night a collective experience.',
  },
  '/artists': {
    title: 'Artists',
    description: 'The performers who bring The Circle to life. Each artist a world, each night a shared journey.',
  },
  '/form': {
    title: 'Request Access',
    description: 'Apply to join The Circle. Attendance is limited and every submission is read.',
  },
  '/terms': {
    title: 'Terms & Conditions',
    description: 'Terms and conditions for The Circle.',
    noindex: true,
  },
  '/privacy': {
    title: 'Privacy Policy',
    description: 'How The Circle handles your personal data.',
    noindex: true,
  },
};

/** Strips query, hash and any trailing slash. `/djs/` and `/djs` are one page. */
export function normalisePath(url) {
  const path = String(url ?? '/').split('?')[0].split('#')[0];
  if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
  return path || '/';
}

const clean = (s, max = 300) =>
  String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/**
 * @param {string} rawUrl
 * @param {object} db  reader with .event(slug) .profile(kind, slug) .page(slug)
 * @param {object} defaults  the meta_seo row
 */
export async function resolveMeta(rawUrl, db, defaults = {}) {
  const path = normalisePath(rawUrl);
  const canonical = SITE_URL + (path === '/' ? '/' : path);

  const base = {
    title:       defaults.title       ?? 'THE CIRCLE',
    description: defaults.description ?? 'An exclusive event. Request your access.',
    canonical,
    noindex:     false,
    jsonld:      null,
  };

  const withSuffix = (t) => `${t} · THE CIRCLE`;

  // ── Admin and API are never indexed ─────────────────────────────
  if (path.startsWith('/admin') || path.startsWith('/api')) {
    return { ...base, title: 'THE CIRCLE', noindex: true };
  }

  // ── Static routes ───────────────────────────────────────────────
  if (path in STATIC_ROUTES) {
    const r = STATIC_ROUTES[path];
    if (!r) return base;   // home keeps the client's own meta_seo copy
    return { ...base, title: withSuffix(r.title), description: r.description, noindex: !!r.noindex };
  }

  const seg = path.split('/').filter(Boolean);

  // ── /past-events/:slug ──────────────────────────────────────────
  if (seg[0] === 'past-events' && seg[1]) {
    const ev = await db.event(seg[1]);
    if (!ev) return { ...base, noindex: true };
    const date = ev.date ? new Date(ev.date + 'T00:00:00') : null;
    return {
      ...base,
      title: withSuffix(ev.event_number ? `${ev.title} — ${ev.event_number}` : ev.title),
      description: clean(ev.short_description || ev.description || base.description),
      image: ev.cover_image_url || undefined,
      jsonld: {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: ev.title,
        ...(date ? { startDate: ev.date } : {}),
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        ...(ev.venue ? { location: { '@type': 'Place', name: ev.venue,
          address: { '@type': 'PostalAddress', addressLocality: 'Valencia', addressCountry: 'ES' } } } : {}),
        ...(ev.cover_image_url ? { image: [ev.cover_image_url] } : {}),
        description: clean(ev.short_description || ev.description || '', 500),
        organizer: { '@type': 'Organization', name: 'THE CIRCLE', url: SITE_URL },
        url: canonical,
      },
    };
  }

  // ── /djs/:slug and /artists/:slug ───────────────────────────────
  if ((seg[0] === 'djs' || seg[0] === 'artists') && seg[1]) {
    const kind = seg[0] === 'djs' ? 'dj' : 'artist';
    const p = await db.profile(kind, seg[1]);
    if (!p) return { ...base, noindex: true };
    const role = kind === 'dj' ? 'DJ' : 'Artist';
    return {
      ...base,
      title: withSuffix(p.name),
      description: clean(p.bio || `${p.name} — ${role} at The Circle${p.based_in ? `, ${p.based_in}` : ''}.`),
      image: p.photo_url || undefined,
      jsonld: {
        '@context': 'https://schema.org',
        '@type': kind === 'dj' ? 'MusicGroup' : 'Person',
        name: p.name,
        ...(p.photo_url ? { image: p.photo_url } : {}),
        ...(p.bio ? { description: clean(p.bio, 500) } : {}),
        ...(p.genres?.length ? { genre: p.genres } : {}),
        url: canonical,
      },
    };
  }

  // ── /:slug — a page the client built ────────────────────────────
  if (seg.length === 1) {
    const pg = await db.page(seg[0]);
    if (!pg) return { ...base, noindex: true };
    return {
      ...base,
      title: withSuffix(pg.seo_title || pg.title),
      description: clean(pg.seo_description || base.description),
    };
  }

  // Anything else is a 404 as far as crawlers are concerned.
  return { ...base, noindex: true };
}
