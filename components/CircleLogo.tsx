import React, { useId, useLayoutEffect, useRef } from 'react';

/**
 * The rotating "THECIRCLE" ring.
 *
 * ── Why it measures itself ────────────────────────────────────────
 * The ring is three repetitions of the word, set to close the circle exactly.
 * That was originally achieved by eye — fontSize 52 with letterSpacing -0.16em,
 * numbers tuned against Poppins' advance widths. Any other typeface has
 * different widths, so the ring either overshoots the seam and overlaps itself
 * or falls short of it. Syne is about 30% wider than Poppins across this
 * string, which is exactly what the broken screenshots showed.
 *
 * Two approaches were rejected before this one:
 *
 *   `textLength` + `lengthAdjust` — SVG's declarative answer, and correct on
 *   paper. Firefox has never implemented either attribute on `<textPath>`
 *   (bugzilla 890692, still open), so it silently does nothing there. A fix
 *   that works in two engines and quietly fails in the third is worse than no
 *   fix, because nobody notices.
 *
 *   A per-font calibration table — one measured size per typeface. Works, but
 *   every future font needs a number, and getting it wrong is invisible until
 *   someone looks at the ring.
 *
 * Measuring instead costs one layout pass and is correct for every font,
 * including ones nobody has chosen yet. `getComputedTextLength()` is universally
 * supported, and a ResizeObserver catches the late repaint when a webfont
 * finishes loading or the admin switches typeface live.
 */

/** Circumference of the r=98 path below: 2πr. The text is fitted to this. */
const PATH_LENGTH = 615.75;

/** Starting point for the measurement. Any value works; this one is close. */
const BASE_SIZE = 52;

/** Stop adjusting once we are within this many user units of the seam. */
const TOLERANCE = 0.5;

const PATH_D = 'M 150, 150 m -98, 0 a 98,98 0 1,1 196,0 a 98,98 0 1,1 -196,0';

/** The word on the ring. One place, not one copy per repetition. */
const WORD = 'THECIRCLE';

interface Props {
  className?: string;
  /** Repetitions around the ring. Three reads as a pattern; one reads as a word. */
  repeat?: number;
  title?: string;
  /** Override the wording. Spaces are dropped — the ring has no room for them. */
  word?: string;
}

export default function CircleLogo({ className, repeat = 3, title, word = WORD }: Props) {
  const text = word.replace(/\s+/g, '').toUpperCase() || WORD;
  // Unique per instance: the home page renders this twice (hero and header),
  // and two `<path id="circlePath">` in one document is a silent rendering bug.
  const pathId = `circle-logo-${useId().replace(/:/g, '')}`;
  const textRef = useRef<SVGTextElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const fit = () => {
      // Always measure from the same starting size, so repeated runs converge
      // instead of drifting.
      el.style.fontSize = `${BASE_SIZE}px`;
      const measured = el.getComputedTextLength();
      if (!measured || !Number.isFinite(measured)) return;
      if (Math.abs(measured - PATH_LENGTH) < TOLERANCE) return;
      el.style.fontSize = `${BASE_SIZE * (PATH_LENGTH / measured)}px`;
    };

    fit();

    // Webfonts arrive after first paint, so the first measurement is of the
    // fallback face. Re-fit once the real one lands.
    document.fonts?.ready.then(fit).catch(() => {});

    // And catch the live case: the admin changes typeface and --font-display
    // updates underneath us. The element's box changes, this fires, we re-fit.
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [repeat, text]);

  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      style={{ fontFamily: 'var(--font-display)' }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <path id={pathId} d={PATH_D} fill="none" />
      </defs>
      <text ref={textRef} fill="var(--color-primary)" className="uppercase" style={{ fontSize: BASE_SIZE }}>
        <textPath href={`#${pathId}`} startOffset="0%">
          {Array.from({ length: repeat }, (_, i) => (
            <tspan key={i} style={{ fontWeight: i === 0 ? 900 : 400 }}>
              {i === 0 ? text : ` ${text}`}
            </tspan>
          ))}
        </textPath>
      </text>
    </svg>
  );
}
