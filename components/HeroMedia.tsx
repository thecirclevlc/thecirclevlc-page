import React from 'react';

interface HeroMediaProps {
  /** URL of a video file (MP4/WebM). Takes priority over imageUrl. */
  videoUrl?:  string | null;
  /** URL of a fallback/background image. */
  imageUrl?:  string | null;
  /**
   * Used as the video `poster` (visible before the video loads).
   * Usually the same as imageUrl.
   */
  posterUrl?: string | null;
  /**
   * When true, the image loads eagerly (above-the-fold hero).
   * When false (default), uses lazy loading.
   */
  priority?:  boolean;
  /**
   * Tailwind class for the dark gradient overlay.
   * Defaults to a bottom-heavy gradient that keeps text readable.
   */
  overlayClass?: string;
}

/**
 * HeroMedia renders either a looping background video or a static image
 * filling its parent container (which should be `position: relative`).
 *
 * Usage:
 *   <section className="relative h-screen overflow-hidden">
 *     <HeroMedia videoUrl={event.hero_video_url} imageUrl={event.cover_image_url} priority />
 *     <div className="relative z-10">...content...</div>
 *   </section>
 */
const HeroMedia: React.FC<HeroMediaProps> = ({
  videoUrl,
  imageUrl,
  posterUrl,
  priority  = false,
  overlayClass = 'bg-gradient-to-t from-[#050000] via-[#050000]/60 to-transparent',
}) => {
  const hasVideo = !!videoUrl;
  const hasImage = !!imageUrl;

  if (!hasVideo && !hasImage) return null;

  return (
    <>
      {/* ── Media layer ───────────────────────────────── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {hasVideo ? (
          <video
            src={videoUrl!}
            poster={posterUrl ?? imageUrl ?? undefined}
            autoPlay
            loop
            muted
            playsInline
            preload={priority ? 'auto' : 'metadata'}
            className="w-full h-full object-cover"
            style={{ filter: 'brightness(0.45)' }}
          />
        ) : (
          <img
            src={imageUrl!}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-[110%] object-cover"
            style={{ filter: 'brightness(0.45)' }}
          />
        )}
      </div>

      {/* ── Gradient overlay ──────────────────────────── */}
      <div className={`absolute inset-0 z-[1] ${overlayClass}`} />
    </>
  );
};

export default HeroMedia;
