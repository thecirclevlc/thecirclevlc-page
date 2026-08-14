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

/**
 * The animated grid behind the home page and the form.
 *
 * Four numbers that were previously only tunable by editing a shader. They are
 * exposed because the client asked — and because with a live preview they stop
 * being "four numbers you can only get right by trial" and become a dial she
 * can turn while watching.
 */
export interface SiteBackground {
  /** `none` turns the animation off entirely — cheaper, calmer, and a valid look. */
  style:     'grid' | 'none';
  /** Grid density. Low = big cells, high = fine mesh. */
  density:   number;
  /** Line weight. */
  weight:    number;
  /** How fast the ripple travels. 0 freezes it. */
  speed:     number;
  /** How strongly the lines read against the background. */
  intensity: number;
}

export const DEFAULT_BACKGROUND: SiteBackground = {
  style: 'grid', density: 40, weight: 0.02, speed: 5, intensity: 0.2,
};

// Must match the @theme block in index.css.
const DEFAULTS: SiteTheme = {
  primary_color: '#C42121',
  bg_color:      '#050000',
  font:          'poppins',
  type_scale:    1,
  background:    DEFAULT_BACKGROUND,
};

export interface SiteTheme {
  primary_color: string;
  bg_color:      string;
  /** One of SITE_FONTS[].id */
  font:          string;
  /**
   * Multiplies every text size on the site at once.
   *
   * Exists because typefaces do not agree on how big "16px" looks — League
   * Spartan runs noticeably smaller than Poppins at the same size, so changing
   * the font left everything looking wrong with no way to correct it.
   *
   * Applied to the root font size, so every rem-based size follows in
   * proportion and the layout keeps its rhythm. Range is deliberately narrow:
   * beyond it, headings start colliding with their containers.
   */
  type_scale:    number;
  background:    SiteBackground;
}

export const TYPE_SCALE_MIN = 0.9;
export const TYPE_SCALE_MAX = 1.15;

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
  const scale = Math.min(TYPE_SCALE_MAX, Math.max(TYPE_SCALE_MIN, theme.type_scale ?? 1));
  root.setProperty('--type-scale', String(scale));
  // The browser chrome on mobile picks this up.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.bg_color);

  // The built-in tab icon is a circle painted with a colour that was baked
  // into index.html, so changing the brand colour left a red dot in the tab
  // forever. Repaint it — but only when it IS the built-in one: an icon the
  // admin uploaded is a real file and must be left alone.
  const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (icon?.getAttribute('href')?.startsWith('data:image/svg+xml')) {
    const fill = encodeURIComponent(theme.primary_color);
    icon.setAttribute(
      'href',
      `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='${fill}'/></svg>`,
    );
  }
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
