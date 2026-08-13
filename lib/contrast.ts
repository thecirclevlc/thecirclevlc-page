/**
 * WCAG contrast ratio between two hex colours.
 *
 * Exists because the client's own words were "rojo mas claro, mas leible" —
 * so the colour picker has to tell her whether a colour is actually legible,
 * not just let her pick one. The site's launch red is 3.56:1 on its
 * background, which fails AA for normal text.
 *
 * Formula: WCAG 2.1 relative luminance.
 */

function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative luminance of a hex colour. Unparseable input → 0 (black). */
export function luminance(hex: string): number {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return 0;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio, 1 (identical) to 21 (black on white). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export interface Verdict { pass: boolean; label: string }

/** Plain-language verdict. Thresholds are WCAG 2.1 for normal-size text. */
export function wcagVerdict(ratio: number): Verdict {
  if (ratio >= 7)   return { pass: true,  label: 'excellent (AAA)' };
  if (ratio >= 4.5) return { pass: true,  label: 'good (AA)' };
  if (ratio >= 3)   return { pass: false, label: 'large headings only' };
  return { pass: false, label: 'too low — hard to read' };
}
