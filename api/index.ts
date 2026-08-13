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

    const finalHtml = injectMeta(html, {
      title:               meta.title,
      description:         meta.description,
      og_title:            defaults.og_title      ?? meta.title,
      og_description:      defaults.og_description ?? meta.description,
      twitter_title:       defaults.twitter_title  ?? meta.title,
      twitter_description: defaults.twitter_description ?? meta.description,
      canonical:           meta.canonical,
      og_url:              meta.canonical,
      twitter_url:         meta.canonical,
      ...(meta.image ? { og_image: meta.image, twitter_image: meta.image } : {}),
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
