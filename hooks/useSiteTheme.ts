import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_PRIMARY = '#C42121';
const DEFAULT_BG      = '#050000';

interface SiteTheme {
  primary_color: string;
  bg_color:      string;
}

interface UseSiteThemeResult {
  primaryColor: string;
  bgColor:      string;
  loading:      boolean;
}

/**
 * Fetches the site color theme from `site_settings` (key: 'site_theme')
 * and applies CSS custom properties to the root <html> element so any
 * component can reference var(--color-primary) and var(--color-bg).
 *
 * Falls back to the brand defaults if the key doesn't exist yet.
 */
export function useSiteTheme(): UseSiteThemeResult {
  const [result, setResult] = useState<UseSiteThemeResult>({
    primaryColor: DEFAULT_PRIMARY,
    bgColor:      DEFAULT_BG,
    loading:      true,
  });

  useEffect(() => {
    let cancelled = false;

    // Apply defaults immediately so there's no flash
    document.documentElement.style.setProperty('--color-primary', DEFAULT_PRIMARY);
    document.documentElement.style.setProperty('--color-bg', DEFAULT_BG);

    supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'site_theme')
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        const theme = data?.value as SiteTheme | undefined;
        const primary = theme?.primary_color ?? DEFAULT_PRIMARY;
        const bg      = theme?.bg_color      ?? DEFAULT_BG;

        document.documentElement.style.setProperty('--color-primary', primary);
        document.documentElement.style.setProperty('--color-bg', bg);

        setResult({ primaryColor: primary, bgColor: bg, loading: false });
      })
      .catch(() => {
        if (!cancelled) setResult(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, []);

  return result;
}
