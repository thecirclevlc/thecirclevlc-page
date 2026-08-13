import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DEFAULT_BLOCK_STYLE, type BlockReveal as RevealKind } from '../lib/blockStyle';

gsap.registerPlugin(ScrollTrigger);

/**
 * How a block arrives when you scroll to it.
 *
 * One component instead of a reveal per block type, so every section on the
 * site animates on the same curve and the page reads as composed rather than
 * assembled.
 *
 * ⚠️  `transform` and `filter` on this wrapper make it the containing block for
 * any descendant using `position: fixed`. That is what broke the lightbox
 * before. Anything full-screen inside a block must portal to <body>.
 */

interface Props {
  kind?: RevealKind;
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

const EASE = 'power3.out';

export default function BlockReveal({ kind = DEFAULT_BLOCK_STYLE.reveal, delay = 0, className, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || kind === 'none') return;

    // Respect the system setting rather than overriding it — someone who asked
    // for less motion means it.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = gsap.context(() => {
      const trigger = { trigger: el, start: 'top 85%', toggleActions: 'play none none none' as const };

      if (kind === 'words') {
        // Split on words, not characters: characters look like a gimmick and
        // wreck screen-reader output. The original text stays in the DOM for
        // assistive tech; only the visual copy is split.
        const targets = el.querySelectorAll<HTMLElement>('[data-reveal-word]');
        if (targets.length) {
          gsap.fromTo(targets,
            { opacity: 0, y: '0.4em' },
            { opacity: 1, y: 0, duration: 0.7, stagger: 0.045, delay, ease: EASE, scrollTrigger: trigger });
          return;
        }
        // Nothing to split — fall through to a plain rise.
      }

      const from =
        kind === 'fade' ? { opacity: 0 }
        : kind === 'blur' ? { opacity: 0, filter: 'blur(14px)' }
        : kind === 'wipe' ? { opacity: 1, clipPath: 'inset(0 100% 0 0)' }
        : { opacity: 0, y: 60 };

      const to =
        kind === 'fade' ? { opacity: 1, duration: 1 }
        : kind === 'blur' ? { opacity: 1, filter: 'blur(0px)', duration: 1.2 }
        : kind === 'wipe' ? { clipPath: 'inset(0 0% 0 0)', duration: 1.1 }
        : { opacity: 1, y: 0, duration: 1.1 };

      gsap.fromTo(el, from, { ...to, delay, ease: EASE, scrollTrigger: trigger });
    }, el);

    return () => ctx.revert();
  }, [kind, delay]);

  return <div ref={ref} className={className}>{children}</div>;
}

/**
 * Wraps each word so the "word by word" reveal has something to animate.
 *
 * Spaces are kept as real characters so copy-pasting the text still produces
 * sensible output, and the whole string stays readable to screen readers
 * because the spans carry no semantics of their own.
 */
export function SplitWords({ text, className }: { text: string; className?: string }) {
  const words = String(text ?? '').split(/(\s+)/);
  return (
    <span className={className}>
      {words.map((w, i) =>
        /^\s+$/.test(w)
          ? <React.Fragment key={i}>{w}</React.Fragment>
          : (
            <span key={i} data-reveal-word className="inline-block will-change-transform">
              {w}
            </span>
          ),
      )}
    </span>
  );
}
