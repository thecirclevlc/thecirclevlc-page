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
 * supported.
 *
 * ── Why it does NOT watch its own size ────────────────────────────
 * It used to re-fit from a ResizeObserver on this very <text>. That looks like
 * the obvious way to catch a late repaint, and it is a trap, for two reasons
 * that compound:
 *
 *   The ring is inside a `scale` spring driven by scroll. An ancestor transform
 *   changes the box Chrome reports for an SVG child, so every frame of that
 *   spring woke the observer.
 *
 *   The callback then wrote `fontSize`, which changes the box again.
 *   Read-then-write, inside a callback that runs after layout: the browser has
 *   to lay the document out a second time before it can paint.
 *
 * MEASURED on the home page: five seconds of scrolling went from 60 full-page
 * layouts to 129, and this was 50 of the extra ones. Every single one computed
 * the identical answer — the measured length came back 767.33 user units every
 * time — because `getComputedTextLength()` reports user units, which do not
 * change when the element is scaled on screen. It was re-deciding a settled
 * question, mid-scroll, forever.
 *
 * So watch the thing that can actually change the answer: the typeface. That is
 * a font finishing loading, or the admin picking another one, and nothing else.
 * Neither happens while somebody is scrolling.
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

    // The face the current fit was measured against. Re-fitting against the
    // same one is the wasted work described above.
    let fittedTo = '';

    const fit = () => {
      fittedTo = getComputedStyle(el).fontFamily;
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
    // fallback face. `loadingdone` rather than `fonts.ready`: ready settles
    // once, and the admin can pick a typeface that has not been downloaded yet,
    // which starts a second round this still hears.
    const onFontsLoaded = () => fit();
    document.fonts?.addEventListener('loadingdone', onFontsLoaded);

    // And the case fonts alone miss: she switches to a face already in memory,
    // so nothing loads. applyTheme() writes --font-display onto <html>; that is
    // the one mutation worth listening for. Twice a page load, not once a frame.
    const onThemeWrite = () => {
      if (getComputedStyle(el).fontFamily !== fittedTo) fit();
    };
    const mo = new MutationObserver(onThemeWrite);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });

    return () => {
      document.fonts?.removeEventListener('loadingdone', onFontsLoaded);
      mo.disconnect();
    };
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
