import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Generates sitemap.xml from what is actually published.
 *
 * Replaces a static file that listed seven URLs with a lastmod frozen in July
 * and not one event, profile or page — so nothing the client creates would ever
 * have reached Google.
 */

const SITE = 'https://www.thecirclevlc.com';

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Legal pages are deliberately absent: they carry noindex.
const STATIC_PATHS = ['/', '/past-events', '/djs', '/artists', '/form'];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const day = (v?: string | null) =>
  v ? new Date(v).toISOString().slice(0, 10) : undefined;

function urlTag(loc: string, lastmod?: string, priority?: string) {
  return `  <url><loc>${esc(SITE + loc)}</loc>`
    + (lastmod ? `<lastmod>${lastmod}</lastmod>` : '')
    + (priority ? `<priority>${priority}</priority>` : '')
    + `</url>`;
}

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const today = new Date().toISOString().slice(0, 10);
  const urls: string[] = STATIC_PATHS.map(p => urlTag(p, today, p === '/' ? '1.0' : '0.8'));

  if (supabase) {
    try {
      const [events, djs, artists, pages] = await Promise.all([
        supabase.from('events').select('slug, updated_at').eq('status', 'published'),
        supabase.from('djs').select('slug, updated_at'),
        supabase.from('artists').select('slug, updated_at'),
        supabase.from('pages').select('slug, updated_at').eq('status', 'published'),
      ]);

      for (const e of events.data ?? []) urls.push(urlTag(`/past-events/${e.slug}`, day(e.updated_at), '0.7'));
      for (const d of djs.data ?? [])    urls.push(urlTag(`/djs/${d.slug}`,        day(d.updated_at), '0.6'));
      for (const a of artists.data ?? []) urls.push(urlTag(`/artists/${a.slug}`,   day(a.updated_at), '0.6'));
      for (const p of pages.data ?? [])  urls.push(urlTag(`/${p.slug}`,            day(p.updated_at), '0.7'));
    } catch (err) {
      // A partial sitemap beats a 500: Google keeps what it already knows.
      console.error('[sitemap] database read failed, serving static paths only:', err);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
    + urls.join('\n')
    + `\n</urlset>\n`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).send(xml);
}
