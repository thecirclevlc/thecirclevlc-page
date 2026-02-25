import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from './lib/supabase';
import type { Event as DBEvent } from './lib/database.types';
import { StandardHeader } from './StandardHeader';
import HeroMedia from './components/HeroMedia';
import { usePageBackground } from './hooks/usePageBackground';

// Adapts Supabase event to the shape EventCard expects
interface CardEvent {
  id: string;        // slug — used for navigation
  number: string;
  title: string;
  subtitle?: string;
  date: string;
  location: string;
  description: string;
  coverImage: string;
  attendees?: number;
  tags: string[];
  year: string;
}

function dbToCard(e: DBEvent): CardEvent {
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
    coverImage:  e.cover_image_url ?? 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=800&fit=crop',
    attendees:   e.attendees ?? undefined,
    tags:        e.tags ?? [],
    year:        dateObj ? String(dateObj.getFullYear()) : '',
  };
}

gsap.registerPlugin(ScrollTrigger);

// GSAP Scroll Reveal Component
const GSAPReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 100, filter: 'blur(10px)' },
        {
          opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, delay, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );
    }, el);
    return () => ctx.revert();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
};

// Event Card with GSAP animations
const EventCard: React.FC<{
  event: CardEvent;
  index: number;
  onClick: () => void;
}> = ({ event, index, onClick }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const numberRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const image = imageRef.current;
    const number = numberRef.current;
    const title = titleRef.current;
    if (!card || !image || !number || !title) return;

    // Wrap ScrollTrigger animation in context for proper cleanup on unmount
    const ctx = gsap.context(() => {
      gsap.fromTo(
        card,
        { opacity: 0, y: 80, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1, duration: 1.2, delay: index * 0.15, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
        }
      );
    }, card);

    // Hover animations
    const handleMouseEnter = (e: MouseEvent) => {
      gsap.to(card, {
        y: -12,
        duration: 0.6,
        ease: 'power2.out',
      });

      gsap.to(image, {
        scale: 1.1,
        filter: 'brightness(0.8)',
        duration: 0.8,
        ease: 'power2.out',
      });

      gsap.to(number, {
        opacity: 0.5,
        scale: 1.1,
        duration: 0.4,
        ease: 'power2.out',
      });

      // Split text animation on hover
      const chars = title.textContent?.split('') || [];
      title.innerHTML = chars
        .map((char, i) => `<span style="display:inline-block">${char === ' ' ? '&nbsp;' : char}</span>`)
        .join('');

      gsap.fromTo(
        title.children,
        {
          y: 0,
        },
        {
          y: -5,
          duration: 0.4,
          stagger: 0.02,
          ease: 'power2.out',
          yoyo: true,
          repeat: 1,
        }
      );
    };

    const handleMouseLeave = () => {
      gsap.to(card, {
        y: 0,
        duration: 0.6,
        ease: 'power2.inOut',
      });

      gsap.to(image, {
        scale: 1,
        filter: 'brightness(0.5)',
        duration: 0.8,
        ease: 'power2.inOut',
      });

      gsap.to(number, {
        opacity: 0.2,
        scale: 1,
        duration: 0.4,
        ease: 'power2.inOut',
      });
    };

    card.addEventListener('mouseenter', handleMouseEnter);
    card.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      ctx.revert(); // kills ScrollTrigger + tweens automatically
      card.removeEventListener('mouseenter', handleMouseEnter);
      card.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [index]);

  return (
    <div ref={cardRef} className="group relative cursor-pointer" onClick={onClick}>
      {/* Event Number */}
      <div
        ref={numberRef}
        className="absolute -top-4 -left-4 z-10 text-[#C42121] font-black text-6xl md:text-8xl opacity-20 leading-none pointer-events-none"
      >
        {event.number}
      </div>

      {/* Image Container */}
      <div className="relative aspect-[4/5] overflow-hidden bg-black border border-[#C42121]/20">
        <img
          ref={imageRef}
          src={event.coverImage}
          alt={event.title}
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.5)' }}
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      {/* Event Info */}
      <div className="mt-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h3
            ref={titleRef}
            className="text-3xl md:text-4xl font-black text-[#C42121] tracking-tight leading-none"
          >
            {event.title}
          </h3>
          <span className="text-xs font-mono text-[#C42121]/60 whitespace-nowrap pt-2">
            {event.year}
          </span>
        </div>

        {event.subtitle && (
          <p className="text-base font-light text-[#C42121] tracking-wide">{event.subtitle}</p>
        )}

        {/* Description - Main explanation text */}
        <p className="text-base text-[#C42121] leading-relaxed font-normal" style={{ opacity: 1 }}>
          {event.description}
        </p>

        {/* Date and Location */}
        <div className="pt-2 space-y-1 text-sm font-mono text-[#C42121]/80">
          <p>{event.date}</p>
          <p>{event.location}</p>
          {event.attendees && <p>{event.attendees} Attendees</p>}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 pt-3">
          {event.tags.slice(0, 3).map((tag, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-3 py-1 border border-[#C42121]/30 text-[#C42121]/70 uppercase tracking-wider hover:bg-[#C42121]/10 transition-colors duration-300"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Loading skeleton card ─────────────────────────────────────────
const SkeletonCard: React.FC = () => (
  <div className="animate-pulse">
    <div className="relative aspect-[4/5] bg-[#111] border border-[#C42121]/10" />
    <div className="mt-6 space-y-3">
      <div className="h-8 w-3/4 bg-[#111] rounded" />
      <div className="h-4 w-1/2 bg-[#0a0a0a] rounded" />
      <div className="h-4 w-full bg-[#0a0a0a] rounded" />
      <div className="h-4 w-2/3 bg-[#0a0a0a] rounded" />
    </div>
  </div>
);

// Main Past Events Page
export default function PastEvents() {
  const navigate = useNavigate();
  const [events, setEvents]       = useState<CardEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const { bgUrl, bgType }         = usePageBackground('page_events');
  const logoRef         = useRef<HTMLDivElement>(null);
  const heroNumberRef   = useRef<HTMLDivElement>(null);
  const heroTitleRef    = useRef<HTMLDivElement>(null);

  // Fetch published events from Supabase
  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .eq('status', 'published')
      .order('date', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (data) setEvents(data.map(dbToCard));
        setLoading(false);
      });
  }, []);

  // Logo rotation with GSAP
  useEffect(() => {
    const logo = logoRef.current;
    if (!logo) return;

    gsap.to(logo, {
      rotation: 360,
      duration: 40,
      repeat: -1,
      ease: 'none',
    });
  }, []);

  // Hero animations
  useEffect(() => {
    const number = heroNumberRef.current;
    const title = heroTitleRef.current;
    if (!number || !title) return;

    const tl = gsap.timeline();

    tl.fromTo(
      number,
      {
        opacity: 0,
        scale: 0.5,
        filter: 'blur(20px)',
      },
      {
        opacity: 0.3,
        scale: 1,
        filter: 'blur(0px)',
        duration: 1.5,
        ease: 'power3.out',
      }
    ).fromTo(
      title.children,
      {
        opacity: 0,
        y: 100,
        rotationX: -90,
      },
      {
        opacity: 1,
        y: 0,
        rotationX: 0,
        duration: 1.2,
        stagger: 0.1,
        ease: 'power3.out',
      },
      '-=1'
    );
  }, []);

  const handleEventClick = (eventId: string) => {
    window.scrollTo(0, 0);
    setTimeout(() => navigate(`/past-events/${eventId}`), 50);
  };

  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black">
      {/* Noise Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-[1] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%)' }}
      />

      <StandardHeader />

      {/* Main Content */}
      <div className="relative z-10 pt-16 md:pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 md:px-20 py-20 md:py-32 border-b border-[#C42121]/20 overflow-hidden">
          {bgType !== 'none' && bgUrl && (
            <HeroMedia
              videoUrl={bgType === 'video' ? bgUrl : null}
              imageUrl={bgType === 'image' ? bgUrl : null}
              overlayClass="bg-gradient-to-t from-[#050000]/90 via-[#050000]/50 to-[#050000]/70"
            />
          )}
          <div className="relative z-10 w-full max-w-7xl">
            {/* Section Number */}
            <div
              ref={heroNumberRef}
              className="text-[#C42121]/30 font-black text-[20vw] md:text-[15vw] leading-none mb-4"
            >
              02
            </div>

            {/* Main Title with ASCII Circle */}
            <div className="flex items-center gap-8 md:gap-16 mb-8">
              <div ref={heroTitleRef} className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] uppercase flex-1">
                <div>PAST</div>
                <div className="text-[#C42121]">EVENTS</div>
              </div>

              {/* ASCII Circle - Hidden on mobile */}
              {/* <div className="hidden lg:block">
                <ASCIICircle />
              </div> */}
            </div>

            {/* Subtitle */}
            <GSAPReveal delay={0.6}>
              <p className="text-lg md:text-2xl font-light text-[#C42121]/70 max-w-3xl leading-relaxed tracking-wide">
                Each event is a unique moment in time. Explore the gatherings that shaped The Circle.
              </p>
            </GSAPReveal>
          </div>
        </section>

        {/* Events Grid */}
        <section className="relative px-6 md:px-20 py-20 md:py-32">
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-[#C42121]/50 text-xl font-mono tracking-widest">ERROR LOADING EVENTS</p>
                <p className="text-[#C42121]/30 text-sm font-mono mt-3">{error}</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#C42121]/50 text-xl font-mono tracking-widest">NO EVENTS YET</p>
                <p className="text-[#C42121]/30 text-sm font-mono mt-3">Check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
                {events.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} onClick={() => handleEventClick(event.id)} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative px-6 md:px-20 py-32 md:py-40 border-t border-[#C42121]/20">
          <GSAPReveal delay={0.1}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8">
                DON'T MISS THE
                <br />
                <span className="text-[#C42121]">NEXT CHAPTER</span>
              </h2>
              <p className="text-lg md:text-xl font-light text-[#C42121]/70 mb-12 leading-relaxed">
                The next Circle is forming. Limited spaces available.
              </p>
              <button
                className="group relative bg-[#C42121] text-black font-black text-xl md:text-2xl py-6 px-16 uppercase tracking-widest hover:bg-[#ff3333] transition-all duration-300 cursor-pointer"
                onClick={() => {
                  window.scrollTo(0, 0);
                  setTimeout(() => navigate('/form'), 50);
                }}
              >
                APPLY NOW
              </button>
            </div>
          </GSAPReveal>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative w-full px-6 md:px-8 py-6 md:py-8 flex justify-between items-center border-t border-[#C42121]/10 text-[#f5f5f0]/50">
        <div className="text-sm md:text-base tracking-wider uppercase font-mono">
          © 2026 THE CIRCLE
        </div>
        <div className="text-sm md:text-base tracking-wider uppercase font-mono">
          <a
            href="https://www.aliastudio.cc/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#C42121] transition-colors"
          >
            BY ALIA
          </a>
        </div>
        <div className="text-sm md:text-base tracking-wider uppercase font-mono">
          <a href="mailto:contact@thecirclevlc.com" className="hover:text-[#C42121] transition-colors">
            CONTACT
          </a>
        </div>
      </footer>
    </div>
  );
}
