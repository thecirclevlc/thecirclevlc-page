import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Props {
  images: string[];
  onImageClick: (index: number) => void;
}

/**
 * Editorial dual-track gallery.
 * Two rows of images move in opposite directions while the section is pinned.
 * Top row slides LEFT, bottom row slides RIGHT — creates a cinematic crossover effect.
 * Section stays pinned until all images have passed through.
 */
export default function HorizontalGallery({ images, onImageClick }: Props) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const topTrackRef = useRef<HTMLDivElement>(null);
  const bottomTrackRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);

  // Split images into two rows: odd indices top, even indices bottom
  const topImages = images.filter((_, i) => i % 2 === 0);
  const bottomImages = images.filter((_, i) => i % 2 === 1);

  useEffect(() => {
    const section = sectionRef.current;
    const topTrack = topTrackRef.current;
    const bottomTrack = bottomTrackRef.current;
    if (!section || !topTrack || !bottomTrack) return;
    if (images.length < 2) return;

    const ctx = gsap.context(() => {
      const vw = window.innerWidth;
      const topWidth = topTrack.scrollWidth;
      const bottomWidth = bottomTrack.scrollWidth;
      // Use the larger track to determine total scroll distance
      const maxWidth = Math.max(topWidth, bottomWidth);
      const travelDistance = maxWidth + vw * 0.2;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${travelDistance}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          onUpdate: (self) => {
            if (counterRef.current) {
              const idx = Math.min(
                Math.floor(self.progress * images.length),
                images.length - 1
              );
              counterRef.current.textContent =
                `${String(idx + 1).padStart(2, '0')} / ${String(images.length).padStart(2, '0')}`;
            }
          },
        },
      });

      // Both tracks travel the SAME total distance so they finish together
      // Top row: starts right of screen, moves LEFT
      tl.fromTo(topTrack,
        { x: vw * 0.15 },
        { x: -(topWidth - vw * 0.3), ease: 'none', duration: 1 },
        0
      );

      // Bottom row: starts left of screen, moves RIGHT
      // Mirror the travel so both reach their end at the same time
      tl.fromTo(bottomTrack,
        { x: -(bottomWidth - vw * 0.3) },
        { x: vw * 0.15, ease: 'none', duration: 1 },
        0
      );
    }, section);

    return () => ctx.revert();
  }, [images, topImages.length, bottomImages.length]);

  // Fallback for very few images
  if (images.length <= 1) {
    return (
      <div className="px-6 md:px-20 py-20">
        {images.map((img, i) => (
          <div
            key={i}
            className="relative aspect-[16/10] overflow-hidden bg-black border border-[#C42121]/20 cursor-pointer group"
            onClick={() => onImageClick(i)}
          >
            <img src={img} alt={`Gallery ${i + 1}`} className="w-full h-full object-cover" style={{ filter: 'brightness(0.65)' }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="relative h-screen overflow-hidden bg-[#050000]">
      {/* Counter & label */}
      <div className="absolute top-6 left-6 md:left-20 z-10 flex items-center gap-4">
        <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase">Gallery</p>
        <span ref={counterRef} className="text-[10px] font-mono text-[#C42121]/60 tracking-widest">
          01 / {String(images.length).padStart(2, '0')}
        </span>
      </div>

      {/* Dual tracks container */}
      <div className="absolute inset-0 flex flex-col justify-center gap-3 md:gap-4">
        {/* Top row — moves LEFT */}
        <div ref={topTrackRef} className="flex gap-3 md:gap-4 will-change-transform">
          {topImages.map((img, i) => {
            const realIndex = i * 2; // map back to original index
            return (
              <div
                key={realIndex}
                className="flex-shrink-0 relative overflow-hidden border border-[#C42121]/15 cursor-pointer group"
                style={{ width: 'min(55vw, 620px)', height: '42vh' }}
                onClick={() => onImageClick(realIndex)}
              >
                <img
                  src={img}
                  alt={`Gallery ${realIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  style={{ filter: 'brightness(0.6)' }}
                  loading="lazy"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 text-[9px] font-mono text-white/40 tracking-widest">
                  {String(realIndex + 1).padStart(2, '0')}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="text-[10px] font-mono tracking-widest text-white border border-white/30 px-3 py-1.5 uppercase bg-black/30 backdrop-blur-sm">
                    Expand
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom row — moves RIGHT */}
        <div ref={bottomTrackRef} className="flex gap-3 md:gap-4 will-change-transform">
          {bottomImages.map((img, i) => {
            const realIndex = i * 2 + 1; // map back to original index
            return (
              <div
                key={realIndex}
                className="flex-shrink-0 relative overflow-hidden border border-[#C42121]/15 cursor-pointer group"
                style={{ width: 'min(55vw, 620px)', height: '42vh' }}
                onClick={() => onImageClick(realIndex)}
              >
                <img
                  src={img}
                  alt={`Gallery ${realIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  style={{ filter: 'brightness(0.6)' }}
                  loading="lazy"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 text-[9px] font-mono text-white/40 tracking-widest">
                  {String(realIndex + 1).padStart(2, '0')}
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <span className="text-[10px] font-mono tracking-widest text-white border border-white/30 px-3 py-1.5 uppercase bg-black/30 backdrop-blur-sm">
                    Expand
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
