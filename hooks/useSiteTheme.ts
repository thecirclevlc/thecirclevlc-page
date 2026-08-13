import { useState, useEffect } from 'react';
import { mergeBlock } from '../lib/mergeBlock';

/** The fonts on offer. Self-hosted — see the @font-face block in index.css. */
export const SITE_FONTS = [
  { id: 'league-spartan', label: 'League Spartan', stack: "'League Spartan', sans-serif",
    note: 'Geometric, tight. Real 900 weight, which this site uses heavily.' },
  { id: 'syne',           label: 'Syne',           stack: "'Syne', sans-serif",
    note: 'Odd and characterful. Tops out at 800 — the biggest headings look lighter.' },
  { id: 'poppins',        label: 'Poppins',        stack: "'Poppins', sans-serif",
    note: 'What the site uses today.' },
] as const;

export type SiteFontId = typeof SITE_FONTS[number]['id'];

export const fontStack = (id: string): string =>
  SITE_FONTS.find(f => f.id === id)?.stack ?? SITE_FONTS[0].stack;

// Must match the @theme block in index.css.
const DEFAULTS: SiteTheme = {
  primary_color: '#C42121',
  bg_color:      '#050000',
  font:          'poppins',
};

export interface SiteTheme {
  primary_color: string;
  bg_color:      string;
  /** One of SITE_FONTS[].id */
  font:          string;
}

export const SITE_THEME_KEY = 'site_theme' as const;

interface UseSiteThemeResult extends SiteTheme {
  loading: boolean;
}

/** Writes the theme onto <html> so every `*-primary` / `*-bg` utility follows it. */
export function applyTheme(theme: SiteTheme): void {
  const root = document.documentElement.style;
  root.setProperty('--color-primary', theme.primary_color);
  root.setProperty('--color-bg', theme.bg_color);
  root.setProperty('--font-display', fontStack(theme.font));
  // The browser chrome on mobile picks this up.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg_color);
}

/**
 * Loads the site colour theme from `site_settings` (key `site_theme`) and
 * applies it as CSS custom properties on <html>.
 *
 * The properties are declared in index.css via `@theme`, so every Tailwind
 * utility built on them (`text-primary`, `border-primary/30`, `bg-bg`, …)
 * picks the change up — including opacity modifiers, which compile to
 * color-mix() over the same variable.
 *
 * Mounted ONCE in AppRouter so it covers every route. It used to be called
 * only from App.tsx, which meant the admin's colour applied on the home
 * page and nowhere else.
 */
export function useSiteTheme(): UseSiteThemeResult {
  const [result, setResult] = useState<UseSiteThemeResult>({ ...DEFAULTS, loading: true });

  useEffect(() => {
    let cancelled = false;

    // Paint defaults immediately so there is no flash before the row lands.
    applyTheme(DEFAULTS);

    // Plain fetch instead of the Supabase client on purpose. This hook is
    // mounted in AppRouter, so importing the SDK here dragged all 174 kB of
    // it into the critical chunk (+46 kB gzipped on every page load) just to
    // read one row. The theme is also the thing that most needs to arrive
    // early — a slow theme is a visible flash of the wrong colour.
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setResult(prev => ({ ...prev, loading: false }));
      return;
    }

    fetch(`${url}/rest/v1/site_settings?select=value&id=eq.${SITE_THEME_KEY}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((rows: { value: unknown }[]) => {
        if (cancelled) return;
        // mergeBlock, not `?? DEFAULTS`: a row holding only `primary_color`
        // must not blank out `bg_color`.
        const theme = mergeBlock(DEFAULTS, rows?.[0]?.value);
        applyTheme(theme);
        setResult({ ...theme, loading: false });
      })
      .catch(() => {
        if (!cancelled) setResult(prev => ({ ...prev, loading: false }));
      });

    return () => { cancelled = true; };
  }, []);

  return result;
}
