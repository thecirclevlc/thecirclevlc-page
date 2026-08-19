import React, { useEffect, useRef } from 'react';
import { loadGsap, wantsMotion, alreadySeen } from '../lib/gsapReady';
import { sizedImage, sizedSrcSet } from '../lib/imageUrl';
import type { Event as DBEvent } from '../lib/database.types';

/**
 * The event card, shared by /past-events and the home page.
 *
 * Extracted rather than rewritten: the card is already approved visually, and
 * a second implementation on the home page would drift from this one the first
 * time either is touched.
 */

export interface CardEvent {
  id: string;        // slug — used for navigation
  number: string;
  title: string;
  subtitle?: string;
  date: string;
  location: string;
  description: string;
  coverImage: string | null;
  attendees?: number;
  tags: string[];
  year: string;
}

export function dbToCard(e: DBEvent): CardEvent {
  const dateObj = e.date ? new Date(e.date + 'T00:00:00') : null;
  return {
    id:          e.slug,
    number:      e.event_number ?? '',
    title:       e.title,
    date:        dateObj
      ? dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : '',
    location:    e.venue ?? '',
    description: e.short_description ?? e.description ?? '',
    // null, not a stock photo. There used to be an Unsplash URL here, so an
    // event without a cover silently showed a stranger's concert on the
    // client's site. A branded placeholder is drawn below instead.
    coverImage:  e.cover_image_url,
    attendees:   e.attendees ?? undefined,
    tags:        e.tags ?? [],
    year:        dateObj ? String(dateObj.getFullYear()) : '',
  };
}

const EventCard: React.FC<{
  event: CardEvent;
  index: number;
  onClick: () => void;
}> = ({ event, index, onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card || !wantsMotion()) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    void loadGsap().then(({ gsap }) => {
      if (cancelled || alreadySeen(card)) return;
      ctx = gsap.context(() => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 80, scale: 0.95 },
          {
            opacity: 1, y: 0, scale: 1, duration: 1.2, delay: index * 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
          },
        );
      }, card);
    });
    return () => { cancelled = true; ctx?.revert(); };
  }, [index]);

  return (
    <div ref={cardRef} className="group relative h-full">
      <button
        onClick={onClick}
        className="w-full h-full flex flex-col text-left cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label={`${event.title}${event.date ? ` — ${event.date}` : ''}`}
      >
        <div className="absolute -top-4 -left-2 md:-left-4 z-10 text-primary font-black text-5xl md:text-8xl opacity-20 leading-none pointer-events-none">
          {event.number}
        </div>

        <div className="relative aspect-[3/4] flex-shrink-0 overflow-hidden bg-black border border-primary/20 group-hover:border-primary/50 transition-colors">
          {event.coverImage ? (
            <img
              // The card is 320-420 CSS px wide, so it never needs the 1920px
              // original: that was 664kB a piece and eleven seconds on a phone.
              src={sizedImage(event.coverImage, 640)}
              srcSet={sizedSrcSet(event.coverImage, [320, 640, 800])}
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 30vw"
              alt=""
              loading={index < 3 ? 'eager' : 'lazy'}
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
              style={{ filter: 'brightness(0.5)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-bg">
              <span className="text-primary/10 font-black text-[6rem] md:text-[9rem] leading-none tracking-tighter select-none">
                {(event.number || event.title.slice(0, 2)).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />
        </div>

        {/* ── Why every block below reserves its height ──────────────
            The three cards sit side by side, and until now each one flowed
            freely: a title that wrapped onto a second line pushed that card's
            date, venue and tags ~70px below its neighbours'. Nothing was
            broken, but the row read as three different designs.

            Each block is given the height of its longest allowed form, so the
            next one always starts on the same line across all three. `lh` is
            the line-height unit, so this stays correct when the admin changes
            the typeface or the text scale — a hard px value would not. */}
        <div className="mt-6 flex flex-col flex-1">
          <h3 className="text-2xl md:text-4xl font-black text-primary tracking-tight leading-none
                         line-clamp-2 min-h-[2lh]">
            {event.title}
          </h3>

          {event.subtitle && (
            <p className="mt-2 text-base font-light text-primary tracking-wide line-clamp-1">
              {event.subtitle}
            </p>
          )}

          <p className="mt-4 text-sm md:text-base text-primary leading-relaxed
                        line-clamp-3 min-h-[3lh]">
            {event.description}
          </p>

          <div className="mt-6 space-y-1 text-sm font-mono text-primary/80">
            {event.date && <p>{event.date}</p>}
            {event.location && <p>{event.location}</p>}
            {event.attendees && <p>{event.attendees} Attendees</p>}
          </div>

          {/* Pinned to the bottom, so the tag row is level even when a card
              carries fewer lines of address above it. */}
          <div className="mt-auto pt-5 flex flex-wrap gap-2 min-h-[1.75rem]">
            {event.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] font-mono px-3 py-1 border border-primary/30 text-primary/70 uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </button>
    </div>
  );
};

export default EventCard;
