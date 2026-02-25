import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// ── Content keys correspond to site_settings rows ────────────────
export type ContentKey =
  | 'content_home_hero'
  | 'content_events_hero'
  | 'content_djs_hero'
  | 'content_artists_hero';

interface PageContent {
  title:    string;
  subtitle: string;
}

// Fallback defaults — used before DB loads or if key doesn't exist yet
const DEFAULTS: Record<ContentKey, PageContent> = {
  content_home_hero: {
    title:    'THE CIRCLE',
    subtitle: 'SECRET LOCATION · ELECTRONIC MUSIC · BOLD ART · PERFORMANCES',
  },
  content_events_hero: {
    title:    'PAST EVENTS',
    subtitle: 'Each event is a unique moment in time. Explore the gatherings that shaped The Circle.',
  },
  content_djs_hero: {
    title:    'THE DJS',
    subtitle: 'The selectors who define The Circle. Each set a journey, each night a collective experience.',
  },
  content_artists_hero: {
    title:    'THE ARTISTS',
    subtitle: 'The performers who bring The Circle to life. Each artist a world, each night a shared journey.',
  },
};

interface UseSiteContentResult extends PageContent {
  loading: boolean;
}

/**
 * Fetches a page's hero title and subtitle from `site_settings`.
 * Falls back to the hardcoded defaults if the key doesn't exist.
 *
 * @param key - One of the ContentKey values (e.g. 'content_djs_hero')
 */
export function useSiteContent(key: ContentKey): UseSiteContentResult {
  const [result, setResult] = useState<UseSiteContentResult>({
    ...DEFAULTS[key],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('site_settings')
      .select('value')
      .eq('id', key)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        const content = data?.value as PageContent | undefined;
        setResult({
          title:    content?.title    ?? DEFAULTS[key].title,
          subtitle: content?.subtitle ?? DEFAULTS[key].subtitle,
          loading:  false,
        });
      })
      .catch(() => {
        if (!cancelled) setResult(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [key]);

  return result;
}
