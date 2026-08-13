import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Event as DBEvent } from '../lib/database.types';

gsap.registerPlugin(ScrollTrigger);

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
    if (!card) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        card,
        { opacity: 0, y: 80, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1, duration: 1.2, delay: index * 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
        },
      );
    }, card);
    return () => { ctx.revert(); };
  }, [index]);

  return (
    <div ref={cardRef} className="group relative">
      <button
        onClick={onClick}
        className="w-full text-left cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        aria-label={`${event.title}${event.date ? ` — ${event.date}` : ''}`}
      >
        <div className="absolute -top-4 -left-2 md:-left-4 z-10 text-primary font-black text-5xl md:text-8xl opacity-20 leading-none pointer-events-none">
          {event.number}
        </div>

        <div className="relative aspect-[3/4] overflow-hidden bg-black border border-primary/20 group-hover:border-primary/50 transition-colors">
          {event.coverImage ? (
            <img
              src={event.coverImage}
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

        <div className="mt-6 space-y-4">
          <h3 className="text-2xl md:text-4xl font-black text-primary tracking-tight leading-none">
            {event.title}
          </h3>

          {event.subtitle && (
            <p className="text-base font-light text-primary tracking-wide">{event.subtitle}</p>
          )}

          {event.description && (
            <p className="text-sm md:text-base text-primary leading-relaxed">{event.description}</p>
          )}

          <div className="pt-2 space-y-1 text-sm font-mono text-primary/80">
            {event.date && <p>{event.date}</p>}
            {event.location && <p>{event.location}</p>}
            {event.attendees && <p>{event.attendees} Attendees</p>}
          </div>

          {event.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-3">
              {event.tags.slice(0, 3).map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] font-mono px-3 py-1 border border-primary/30 text-primary/70 uppercase tracking-wider"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </button>
    </div>
  );
};

export default EventCard;
