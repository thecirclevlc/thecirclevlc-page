import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full-screen image viewer.
 *
 * ── Why this renders through a portal ──────────────────────────────
 * `position: fixed` resolves against the nearest ancestor that has a
 * `transform` or `filter` — not the viewport. Every caller mounts this inside
 * a <GSAPReveal>, which leaves `transform` and `filter: blur(0px)` on its
 * wrapper once the reveal finishes. The lightbox was therefore pinned to the
 * gallery section instead of the screen: it opened as a floating slab with the
 * page still visible around it.
 *
 * Portalling to <body> steps outside those ancestors entirely and fixes it for
 * all four call sites at once. Do not replace this with a plain <div>.
 */
export default function ImageLightbox({ images, initialIndex, isOpen, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fading, setFading] = useState(false);
  const closeRef   = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<Element | null>(null);
  const touchX     = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  // Lock scroll, and give the keyboard somewhere to land.
  useEffect(() => {
    if (!isOpen) return;
    restoreRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      (restoreRef.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen]);

  const goTo = useCallback((index: number) => {
    setCurrentIndex(prev => {
      if (index === prev) return prev;
      setFading(true);
      setTimeout(() => setFading(false), 180);
      return index;
    });
  }, []);

  const prev = useCallback(
    () => goTo((currentIndex - 1 + images.length) % images.length),
    [currentIndex, images.length, goTo]);
  const next = useCallback(
    () => goTo((currentIndex + 1) % images.length),
    [currentIndex, images.length, goTo]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
      // Keep focus inside: the only stop is the close button.
      if (e.key === 'Tab')        { e.preventDefault(); closeRef.current?.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, prev, next, onClose]);

  if (!isOpen || images.length === 0) return null;

  const pad = (n: number) => String(n).padStart(2, '0');
  const many = images.length > 1;

  // Swipe: the primary way anyone moves through photos on a phone.
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) < 50 || !many) return;
    dx > 0 ? prev() : next();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      className="fixed inset-0 z-[200] bg-black/97 backdrop-blur-sm select-none"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar — counter left, the ONE close button right.
          There used to be a second floating X over the image; two close
          buttons a few pixels apart read as a rendering fault. */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between gap-4 px-5 md:px-8 z-20
                   pt-[max(1rem,env(safe-area-inset-top))] pb-4"
        onClick={e => e.stopPropagation()}
      >
        <span className="text-[11px] font-mono text-primary tracking-[0.3em] tabular-nums">
          {pad(currentIndex + 1)}<span className="text-primary/30 mx-1.5">/</span>{pad(images.length)}
        </span>

        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Close"
          className="w-11 h-11 -mr-2 flex items-center justify-center text-white/70 hover:text-white
                     focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60 transition-colors cursor-pointer"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Image. Padding leaves room for the bars so nothing ever overlaps it. */}
      <div className="absolute inset-0 flex items-center justify-center px-4 md:px-24 pt-16 pb-24 md:pb-28">
        <img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1} of ${images.length}`}
          className="max-h-full max-w-full object-contain"
          style={{ opacity: fading ? 0 : 1, transition: 'opacity 180ms ease' }}
          onClick={e => e.stopPropagation()}
          draggable={false}
        />
      </div>

      {/* Arrows — desktop only. On a phone the gesture is swipe, and arrows
          this size just sit on top of the photo. */}
      {many && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            aria-label="Previous image"
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-12 h-20 items-center justify-center
                       text-primary/40 hover:text-primary transition-colors z-20 cursor-pointer"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" /><polyline points="11 18 5 12 11 6" />
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            aria-label="Next image"
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-12 h-20 items-center justify-center
                       text-primary/40 hover:text-primary transition-colors z-20 cursor-pointer"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="13 6 19 12 13 18" />
            </svg>
          </button>
        </>
      )}

      {/* Filmstrip. Scrolls horizontally rather than squeezing, so twenty
          photos stay usable on a phone. */}
      {many && (
        <div
          className="absolute bottom-0 inset-x-0 z-20 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex gap-2 overflow-x-auto px-5 md:px-8 justify-start md:justify-center
                          [scrollbar-width:none] [-ms-overflow-style:none]">
            {images.map((img, i) => (
              <button
                key={`${img}-${i}`}
                onClick={() => goTo(i)}
                aria-label={`Show image ${i + 1}`}
                aria-current={i === currentIndex}
                className="relative flex-shrink-0 cursor-pointer focus:outline-none"
              >
                <img
                  src={img}
                  alt=""
                  loading="lazy"
                  className="w-14 h-10 md:w-16 md:h-11 object-cover transition-all duration-200"
                  style={{
                    opacity: i === currentIndex ? 1 : 0.35,
                    filter: i === currentIndex ? 'none' : 'grayscale(1)',
                  }}
                />
                <span
                  className="absolute inset-0 border transition-colors"
                  style={{ borderColor: i === currentIndex ? 'var(--color-primary)' : 'transparent' }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
