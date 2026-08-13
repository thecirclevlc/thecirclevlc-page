/**
 * Reads a CSS custom property off <html> as a concrete value.
 *
 * Needed because Framer Motion and GSAP animate between *values*: given
 * `borderColor: ['var(--color-primary)', '#ff0000']` they cannot interpolate
 * and the animation silently does nothing. Anywhere the value lands in real
 * CSS — `style={{ color: 'var(--color-primary)' }}`, a Tailwind class, an SVG
 * `fill` — use the variable directly instead; this is only for the animation
 * libraries.
 *
 * ponytail: resolved once at call time, so an animation started before the
 * admin changes the theme keeps the old colour until the component remounts.
 * If live re-tinting of running animations is ever wanted, subscribe to a
 * theme context instead.
 */
export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** The brand accent, resolved. */
export const brandColor = () => cssVar('--color-primary', '#C42121');

/** Body copy colour, resolved. */
export const fgColor = () => cssVar('--color-fg', '#f5f5f0');

/** Hex → GLSL vec3 components (0-1). Falls back to the brand red. */
export function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return [0.769, 0.129, 0.129];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
