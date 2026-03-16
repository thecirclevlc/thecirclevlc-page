import React, { useState, useEffect, useCallback } from 'react';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex, isOpen, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [fading, setFading] = useState(false);

  // Sync index when lightbox opens
  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const goTo = useCallback((index: number) => {
    if (index === currentIndex) return;
    setFading(true);
    setTimeout(() => {
      setCurrentIndex(index);
      setFading(false);
    }, 200);
  }, [currentIndex]);

  const prev = useCallback(() => {
    goTo((currentIndex - 1 + images.length) % images.length);
  }, [currentIndex, images.length, goTo]);

  const next = useCallback(() => {
    goTo((currentIndex + 1) % images.length);
  }, [currentIndex, images.length, goTo]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     onClose();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, prev, next, onClose]);

  if (!isOpen || images.length === 0) return null;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 md:px-6 md:py-5 z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Counter */}
        <span className="text-xs font-mono text-[#C42121]/60 tracking-[0.2em]">
          {pad(currentIndex + 1)} / {pad(images.length)}
        </span>

        {/* Close — min 44px touch target */}
        <button
          className="w-10 h-10 flex items-center justify-center bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-all rounded-full cursor-pointer"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Image + floating close */}
      <div
        className="relative flex items-center justify-center w-full h-full px-4 md:px-16 py-12 md:py-20"
        onClick={e => e.stopPropagation()}
      >
        <img
          key={currentIndex}
          src={images[currentIndex]}
          alt={`Gallery image ${currentIndex + 1}`}
          className="max-h-[85vh] max-w-[85vw] object-contain select-none"
          style={{
            opacity: fading ? 0 : 1,
            transition: 'opacity 200ms ease',
          }}
          draggable={false}
        />
        {/* Floating X on the image — always visible */}
        <button
          className="absolute top-14 md:top-16 right-6 md:right-20 w-11 h-11 flex items-center justify-center bg-black/70 backdrop-blur-md border border-white/25 text-white hover:bg-black/90 hover:border-white/50 transition-all rounded-full cursor-pointer z-20"
          onClick={onClose}
          aria-label="Close"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Prev arrow */}
      {images.length > 1 && (
        <button
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 text-[#C42121]/40 hover:text-[#C42121] transition-colors duration-200 text-4xl md:text-5xl leading-none cursor-pointer z-10 px-4 py-6"
          onClick={e => { e.stopPropagation(); prev(); }}
          aria-label="Previous image"
        >
          ←
        </button>
      )}

      {/* Next arrow */}
      {images.length > 1 && (
        <button
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 text-[#C42121]/40 hover:text-[#C42121] transition-colors duration-200 text-4xl md:text-5xl leading-none cursor-pointer z-10 px-4 py-6"
          onClick={e => { e.stopPropagation(); next(); }}
          aria-label="Next image"
        >
          →
        </button>
      )}

      {/* Thumbnail strip (only if >1 image) */}
      {images.length > 1 && (
        <div
          className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 md:gap-3 px-4 py-4 md:px-6 md:py-5 z-10"
          onClick={e => e.stopPropagation()}
        >
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="relative overflow-hidden cursor-pointer p-1"
              aria-label={`Go to image ${i + 1}`}
            >
              <img
                src={img}
                alt=""
                className="w-12 h-8 md:w-14 md:h-9 object-cover"
                style={{
                  opacity: i === currentIndex ? 1 : 0.3,
                  transition: 'opacity 200ms ease',
                  outline: i === currentIndex ? '1px solid #C42121' : 'none',
                  outlineOffset: '1px',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
