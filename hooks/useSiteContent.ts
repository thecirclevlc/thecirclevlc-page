import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { mergeBlock } from '../lib/mergeBlock';

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
  setContent: (field: 'title' | 'subtitle', value: string) => void;
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
    setContent: () => {},
  });

  const setContent = useCallback((field: 'title' | 'subtitle', value: string) => {
    setResult(prev => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('site_settings')
      .select('value')
      .eq('id', key)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const content = data?.value as PageContent | undefined;
        setResult(prev => ({
          ...prev,
          title:    content?.title    ?? DEFAULTS[key].title,
          subtitle: content?.subtitle ?? DEFAULTS[key].subtitle,
          loading:  false,
        }));
      })
      .catch(() => {
        if (!cancelled) setResult(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [key]);

  return { ...result, setContent };
}

// ── Generic content block hook ──────────────────────────────────

interface SiteBlockResult<T> {
  data:    T;
  loading: boolean;
  /**
   * Whether the row actually exists in the database, as opposed to `data`
   * being the fallback. Callers that address a row by a user-supplied key
   * (e.g. `/form/:slug`) need this to tell "empty form" from "no such form"
   * and 404 properly. Most callers can ignore it.
   */
  exists:  boolean;
  setData: React.Dispatch<React.SetStateAction<T>>;
}

/**
 * Fetches any JSON content block from `site_settings` by key.
 * Falls back to the provided default if the key doesn't exist yet.
 */
export function useSiteBlock<T>(key: string, fallback: T): SiteBlockResult<T> {
  const [state, setState] = useState<{ data: T; loading: boolean; exists: boolean }>({
    data: fallback,
    loading: true,
    exists: false,
  });

  const setData = useCallback((action: React.SetStateAction<T>) => {
    setState(prev => ({
      ...prev,
      data: typeof action === 'function' ? (action as (prev: T) => T)(prev.data) : action,
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setState(prev => ({ ...prev, loading: true }));

    supabase
      .from('site_settings')
      .select('value')
      .eq('id', key)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setState({
          data: mergeBlock(fallback, data?.value),
          loading: false,
          exists: data != null,
        });
      })
      .catch(() => {
        if (!cancelled) setState(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [key]);

  return { ...state, setData };
}
