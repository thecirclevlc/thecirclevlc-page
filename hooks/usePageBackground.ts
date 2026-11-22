import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { PageBackground, PageKey } from '../lib/database.types';

interface UsePageBackgroundResult {
  bgUrl:    string | null;
  bgType:   'none' | 'image' | 'video';
  bgPoster: string | null;
  loading:  boolean;
}

/**
 * Fetches the hero background configuration for a public page
 * from the `site_settings` table.
 *
 * @param page - One of 'page_events' | 'page_djs' | 'page_artists'
 */
export function usePageBackground(page: PageKey): UsePageBackgroundResult {
  const [result, setResult] = useState<UsePageBackgroundResult>({
    bgUrl:   null,
    bgType:  'none',
    bgPoster: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('site_settings')
      .select('value')
      .eq('id', page)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const bg = data?.value as PageBackground | undefined;
        setResult({
          bgUrl:   bg?.bg_url  ?? null,
          bgType:  bg?.bg_type ?? 'none',
          bgPoster: bg?.bg_poster ?? null,
          loading: false,
        });
      }, () => {
        if (!cancelled) setResult(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, [page]);

  return result;
}
