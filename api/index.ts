import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
// @ts-ignore — .mjs imports are fine at runtime; tsc may not resolve types
import { injectMeta, jsonLdScript } from './_lib/injectMeta.mjs';
// @ts-ignore
import { resolveMeta, SITE_URL } from './_lib/resolveMeta.mjs';

/**
 * Serves the app shell for EVERY public route, with per-page metadata.
 *
 * It used to answer only "/", so every other page shipped the raw
 * `<!--META:title-->` marker as its title and claimed the home page as its
 * canonical URL. Both are fixed by routing everything here.
 *
 * The trade that buys: this function is now on the critical path for the whole
 * site, not just the home page. Every failure mode below therefore falls back
 * to serving the unmodified shell, which still renders the full app client-side
 * — a page with generic metadata beats no page at all.
 */

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? '';

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

const HTML_PATH = path.join(process.cwd(), 'dist', '_app.html');

let cachedHtml: string | null = null;

async function readBaseHtml(): Promise<string> {
  if (cachedHtml) return cachedHtml;
  cachedHtml = await readFile(HTML_PATH, 'utf8');
  return cachedHtml;
}

/**
 * Every lookup is individually guarded. A page whose row cannot be read still
 * renders — it just gets the site defaults instead of its own title.
 */
const db = {
  async event(slug: string) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('events')
      .select('title, event_number, date, venue, description, short_description, cover_image_url')
      .eq('slug', slug).eq('status', 'published').maybeSingle();
    return data;
  },
  async profile(kind: 'dj' | 'artist', slug: string) {
    if (!supabase) return null;
    const { data } = await supabase
      .from(kind === 'dj' ? 'djs' : 'artists')
      .select('name, bio, photo_url, genres, based_in')
      .eq('slug', slug).maybeSingle();
    return data;
  },
  async page(slug: string) {
    if (!supabase) return null;
    const { data } = await supabase
      .from('pages')
      .select('title, seo_title, seo_description')
      .eq('slug', slug).eq('status', 'published').maybeSingle();
    return data;
  },
};

async function fetchDefaults(): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const { data } = await supabase
      .from('site_settings').select('value').eq('id', 'meta_seo').maybeSingle();
    return (data?.value as Record<string, string>) ?? {};
  } catch {
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let html: string;
  try {
    html = await readBaseHtml();
  } catch (err) {
    console.error('[ssr] cannot read shell:', err);
    return res.status(500).send('Internal error');
  }

  try {
    const defaults = await fetchDefaults();
    const meta = await resolveMeta(req.url ?? '/', db, defaults);

    const head =
      (meta.noindex ? '<meta name="robots" content="noindex,follow" />' : '') +
      jsonLdScript(meta.jsonld);

    // The site-wide share copy is the HOME page's copy, not every page's.
    // It used to win everywhere: `defaults.og_title` is always set (the panel
    // saves it), so /djs, /artists, every event and every profile shared as
    // plain "THE CIRCLE" — the per-page <title> was right and the WhatsApp
    // preview was wrong. Now it only fills in where the route has no title of
    // its own, which is the home page.
    const isHome = meta.canonical === SITE_URL + '/';
    const shareTitle = isHome ? (defaults.og_title || meta.title) : meta.title;
    const shareDesc  = isHome ? (defaults.og_description || meta.description) : meta.description;

    // A page's own picture (an event cover, a profile photo) beats the
    // site-wide one she uploads, which beats the file shipped with the build.
    const shareImage = meta.image || defaults.og_image || null;

    const finalHtml = injectMeta(html, {
      title:               meta.title,
      description:         meta.description,
      og_title:            shareTitle,
      og_description:      shareDesc,
      twitter_title:       isHome ? (defaults.twitter_title || meta.title) : meta.title,
      twitter_description: isHome ? (defaults.twitter_description || meta.description) : meta.description,
      canonical:           meta.canonical,
      og_url:              meta.canonical,
      twitter_url:         meta.canonical,
      ...(shareImage ? { og_image: shareImage, twitter_image: shareImage } : {}),
      ...(defaults.favicon_url ? { favicon: defaults.favicon_url } : {}),
      head_extra:          head,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).send(finalHtml);
  } catch (err) {
    // Metadata is a nice-to-have; the page is not. Serve the shell.
    console.error('[ssr] meta resolution failed, serving shell:', err);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=30');
    return res.status(200).send(injectMeta(html, {}));
  }
}

export { SITE_URL };
