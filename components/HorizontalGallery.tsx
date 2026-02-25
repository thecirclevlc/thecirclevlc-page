import React, { useRef } from 'react';

interface Props {
  images: string[];
  onImageClick: (index: number) => void;
}

/**
 * Horizontal scroll gallery with CSS scroll-snap.
 * Selected when event.gallery_style === 'horizontal'.
 * Drag-scrollable on desktop, swipeable on mobile.
 */
export default function HorizontalGallery({ images, onImageClick }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Mouse-drag scrolling on desktop
  const isDragging = useRef(false);
  const startX    = useRef(0);
  const scrollLeft = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - trackRef.current.offsetLeft;
    scrollLeft.current = trackRef.current.scrollLeft;
    trackRef.current.style.cursor = 'grabbing';
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !trackRef.current) return;
    e.preventDefault();
    const x    = e.pageX - trackRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.2;
    trackRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const stopDrag = () => {
    isDragging.current = false;
    if (trackRef.current) trackRef.current.style.cursor = 'grab';
  };

  return (
    <div
      ref={trackRef}
      className="w-full overflow-x-auto select-none"
      style={{
        scrollSnapType: 'x mandatory',
        scrollbarWidth: 'none',
        cursor: 'grab',
        WebkitOverflowScrolling: 'touch',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >
      {/* Hide scrollbar in Webkit */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="flex gap-3 md:gap-5 w-max pb-2">
        {images.map((img, i) => (
          <div
            key={i}
            className="flex-shrink-0 relative overflow-hidden border border-[#C42121]/20
                       group cursor-pointer"
            style={{
              width: 'min(85vw, 680px)',
              height: 'clamp(320px, 65vh, 620px)',
              scrollSnapAlign: 'start',
            }}
            onClick={() => {
              // Only trigger click if not dragging
              if (!isDragging.current) onImageClick(i);
            }}
          >
            <img
              src={img}
              alt={`Gallery image ${i + 1}`}
              className="w-full h-full object-cover transition-all duration-700 group-hover:scale-[1.03]"
              style={{ filter: 'brightness(0.65)', pointerEvents: 'none' }}
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

            {/* Index counter */}
            <div className="absolute top-4 right-4 text-[10px] font-mono text-[#C42121]/60 tracking-widest">
              {String(i + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
            </div>

            {/* Expand hint */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <span className="text-[10px] font-mono tracking-widest text-white border border-white/40 px-3 py-1.5 uppercase">
                Expand
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Scroll hint — only shown when more than 1 image */}
      {images.length > 1 && (
        <p className="text-[10px] font-mono text-[#C42121]/30 tracking-[0.2em] uppercase mt-4">
          ← Drag to explore →
        </p>
      )}
    </div>
  );
}
