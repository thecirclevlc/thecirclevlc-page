import React, { useState } from 'react';
import ImageLightbox from './ImageLightbox';

/**
 * Editorial photo gallery — a contact sheet, not a grid of squares.
 *
 * The brand is analogue and underground, so the frames borrow from a darkroom
 * contact sheet: hairline rules, mono frame numbers, images held desaturated
 * until you look at one. The layout is deliberately asymmetric so a set of
 * photos reads as curated rather than dumped.
 *
 * The shape adapts to how many photos there actually are — a mosaic built for
 * twelve looks broken with three.
 */

interface Props {
  images: string[];
  /** Small mono label above the grid. */
  label?: string;
}

export default function ProfileGallery({ images, label = 'Gallery' }: Props) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  const photos = (images ?? []).filter(Boolean);
  if (photos.length === 0) return null;

  const count = photos.length;

  // One photo is a statement; two or three sit side by side; four or more earn
  // the mosaic, where the opener runs double-width.
  const layout =
    count === 1 ? 'single'
    : count <= 3 ? 'row'
    : 'mosaic';

  // Written out in full, never interpolated: Tailwind scans source as text and
  // cannot see a class built from a variable, so `grid-cols-${count}` would
  // silently produce no CSS at all.
  const gridClass =
    layout === 'single' ? 'grid grid-cols-1'
    : layout === 'row'
      ? (count === 2
          ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3'
          : 'grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3')
    : 'grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3';

  const cellClass = (i: number) => {
    if (layout === 'single') return 'aspect-[16/10]';
    if (layout === 'row')    return 'aspect-[4/5]';
    // Mosaic: the first frame is the opener — full width on phones, a 2×2
    // block from tablet up. Everything else is a square.
    return i === 0 ? 'col-span-2 row-span-2 aspect-square' : 'aspect-square';
  };

  return (
    <div>
      {/* Section rule + count, set like a caption */}
      <div className="flex items-baseline gap-4 mb-5 md:mb-7">
        <h2 className="text-[10px] md:text-xs font-mono text-primary/50 tracking-[0.3em] uppercase whitespace-nowrap">
          {label}
        </h2>
        <span className="h-px flex-1 bg-primary/15" />
        <span className="text-[10px] font-mono text-primary/30 tracking-[0.2em] tabular-nums">
          {String(count).padStart(2, '0')}
        </span>
      </div>

      <div className={gridClass}>
        {photos.map((url, i) => (
          <button
            key={`${url}-${i}`}
            onClick={() => setOpenAt(i)}
            aria-label={`Open image ${i + 1} of ${count}`}
            className={`group relative overflow-hidden bg-black cursor-pointer
                        focus:outline-none focus-visible:ring-1 focus-visible:ring-primary
                        ${cellClass(i)}`}
          >
            <img
              src={url}
              alt=""
              loading={i < 4 ? 'eager' : 'lazy'}
              decoding="async"
              className="w-full h-full object-cover transition-all duration-500 ease-out
                         grayscale-[0.55] brightness-[0.8]
                         group-hover:grayscale-0 group-hover:brightness-100 group-hover:scale-[1.03]
                         group-focus-visible:grayscale-0 group-focus-visible:brightness-100"
            />

            {/* Hairline frame, brightening on approach */}
            <span className="absolute inset-0 border border-primary/15 group-hover:border-primary/50
                             transition-colors duration-300 pointer-events-none" />

            {/* Frame number, contact-sheet style */}
            <span className="absolute top-2 left-2.5 text-[9px] md:text-[10px] font-mono tabular-nums
                             text-primary/0 group-hover:text-primary/90 group-focus-visible:text-primary/90
                             transition-colors duration-300 pointer-events-none tracking-widest">
              {String(i + 1).padStart(2, '0')}
            </span>

            {/* Corner tick — the only decorative flourish, bottom-right */}
            <span className="absolute bottom-2 right-2 w-3 h-3 pointer-events-none
                             border-b border-r border-primary/0 group-hover:border-primary/70
                             transition-colors duration-300" />
          </button>
        ))}
      </div>

      <ImageLightbox
        images={photos}
        initialIndex={openAt ?? 0}
        isOpen={openAt !== null}
        onClose={() => setOpenAt(null)}
      />
    </div>
  );
}
