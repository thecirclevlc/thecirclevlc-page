import type { VercelRequest, VercelResponse } from '@vercel/node';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
// @ts-ignore — .mjs import is fine at runtime; tsc may not resolve types
import { injectMeta } from './_lib/injectMeta.mjs';

const SUPABASE_URL =
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  '';
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_ANON_KEY ??
  '';

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const HTML_PATH = path.join(process.cwd(), 'dist', 'index.html');

let cachedHtml: string | null = null;

async function readBaseHtml(): Promise<string> {
  if (cachedHtml) return cachedHtml;
  cachedHtml = await readFile(HTML_PATH, 'utf8');
  return cachedHtml;
}

async function fetchMetaValues(): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'meta_seo')
      .single();
    if (error || !data?.value) return {};
    return data.value as Record<string, string>;
  } catch {
    return {};
  }
}

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const [html, values] = await Promise.all([
      readBaseHtml(),
      fetchMetaValues(),
    ]);
    const finalHtml = injectMeta(html, values);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=60, stale-while-revalidate=300',
    );
    res.status(200).send(finalHtml);
  } catch (err) {
    console.error('api/index fallback:', err);
    try {
      const html = await readBaseHtml();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch {
      res.status(500).send('Internal error');
    }
  }
}
