import type { gsap as Gsap } from 'gsap';

/**
 * GSAP, fetched after the page has painted.
 *
 * MEASURED, not guessed. On the live site throttled to a mid-range phone on
 * slow 4G, first paint and largest paint were the same 2968ms — nothing
 * appeared until everything had arrived. The single largest thing to arrive was
 * GSAP: 93kB gzipped and 245kB parsed across two chunks, more than the app
 * itself, on the critical path of every page.
 *
 * And none of it draws anything. Every use on this site is a scroll-triggered
 * reveal inside a `useEffect`, which by definition runs after the first paint.
 * So it has no business blocking that paint.
 *
 * One shared promise, so twenty blocks revealing on one page fetch it once.
 */

export interface GsapBundle {
  gsap: typeof Gsap;
  /** Already registered — callers never need registerPlugin. */
  ScrollTrigger: unknown;
}

let pending: Promise<GsapBundle> | null = null;

export function loadGsap(): Promise<GsapBundle> {
  pending ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
    .then(([core, plugin]) => {
      core.gsap.registerPlugin(plugin.ScrollTrigger);
      return { gsap: core.gsap, ScrollTrigger: plugin.ScrollTrigger };
    });
  return pending;
}

/**
 * Whether motion should happen at all.
 *
 * Checked before the import, so a reduced-motion visitor does not fetch GSAP
 * for any of the scroll reveals. They can still end up with it: the hamburger
 * menu needs it to open at all, so it warms it on mount whatever the motion
 * preference. Verified in the browser rather than assumed — the honest claim is
 * "the decoration does not download it", not "they never download it".
 */
export const wantsMotion = () =>
  typeof window !== 'undefined'
  && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Whether an element was already on screen when GSAP finally arrived.
 *
 * Entrance animations start from `opacity: 0`. Applied late, to something the
 * visitor is already looking at, that is not an entrance — it is a flash of the
 * content disappearing and coming back. Anything already in view keeps the
 * paint it already has, which is also what stops the hero being hidden from
 * the largest-paint measurement.
 */
export function alreadySeen(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.top < (window.innerHeight || 0) && r.bottom > 0;
}
