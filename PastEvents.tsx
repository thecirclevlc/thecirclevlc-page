import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from './lib/supabase';
import type { Event as DBEvent } from './lib/database.types';
import { StandardHeader } from './StandardHeader';
import HeroMedia from './components/HeroMedia';
import { usePageBackground } from './hooks/usePageBackground';
import { useSiteContent, useSiteBlock } from './hooks/useSiteContent';
import AdminToolbar from './components/AdminToolbar';
import PageShell from './components/PageShell';
import Footer from './components/Footer';
import GSAPReveal from './components/GSAPReveal';
import EditableText from './components/EditableText';

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

// Event Card with GSAP animations
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
        }
      );
    }, card);

    return () => { ctx.revert(); };
  }, [index]);

  return (
    <div ref={cardRef} className="group relative cursor-pointer" onClick={onClick}>
      <div
        className="absolute -top-4 -left-4 z-10 text-[#C42121] font-black text-6xl md:text-8xl opacity-20 leading-none pointer-events-none"
      >
        {event.number}
      </div>

      <div className="relative aspect-[3/4] overflow-hidden bg-black border border-[#C42121]/20">
        <img
          src={event.coverImage}
          alt={event.title}
          className="w-full h-full object-cover"
          style={{ filter: 'brightness(0.5)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      </div>

      <div className="mt-6 space-y-4">
        <div>
          <h3
            className="text-3xl md:text-4xl font-black text-[#C42121] tracking-tight leading-none"
          >
            {event.title}
          </h3>
        </div>

        {event.subtitle && (
          <p className="text-base font-light text-[#C42121] tracking-wide">{event.subtitle}</p>
        )}

        <p className="text-base text-[#C42121] leading-relaxed font-normal" style={{ opacity: 1 }}>
          {event.description}
        </p>

        <div className="pt-2 space-y-1 text-sm font-mono text-[#C42121]/80">
          <p>{event.date}</p>
          <p>{event.location}</p>
          {event.attendees && <p>{event.attendees} Attendees</p>}
        </div>

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

const SkeletonCard: React.FC = () => (
  <div className="animate-pulse">
    <div className="relative aspect-[3/4] bg-[#111] border border-[#C42121]/10" />
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
  const { title: heroTitle, subtitle: heroSubtitle, setContent: setEventsContent } = useSiteContent('content_events_hero');
  const { data: ctaData, setData: setCtaData } = useSiteBlock('content_cta_events', {
    title: "DON'T MISS THE NEXT CHAPTER",
    subtitle: 'The next Circle is forming. Limited spaces available.',
  });
  const heroTitleRef    = useRef<HTMLDivElement>(null);

  const heroWords = heroTitle.trim().split(' ');
  const heroLast  = heroWords.length > 1 ? (heroWords.pop() ?? '') : heroTitle;
  const heroRest  = heroWords.join(' ');

  const handleNav = (path: string) => {
    window.scrollTo(0, 0);
    setTimeout(() => navigate(path), 50);
  };

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

  useEffect(() => {
    const title = heroTitleRef.current;
    if (!title) return;

    gsap.fromTo(
      title.children,
      { opacity: 0, y: 100, rotationX: -90 },
      { opacity: 1, y: 0, rotationX: 0, duration: 1.2, stagger: 0.1, ease: 'power3.out', delay: 0.3 }
    );
  }, []);

  const handleEventClick = (eventId: string) => {
    window.scrollTo(0, 0);
    setTimeout(() => navigate(`/past-events/${eventId}`), 50);
  };

  return (
    <PageShell>
      <StandardHeader />

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
            <div className="flex items-center gap-8 md:gap-16 mb-8">
              <div ref={heroTitleRef} className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] uppercase flex-1">
                {heroRest && <div>{heroRest}</div>}
                <div className="text-[#C42121]">{heroLast}</div>
              </div>
            </div>

            <GSAPReveal delay={0.6}>
              <EditableText
                as="p"
                contentKey="content_events_hero"
                field="subtitle"
                value={heroSubtitle}
                onSave={v => setEventsContent('subtitle', v)}
                className="text-lg md:text-2xl font-light text-[#C42121]/70 max-w-3xl leading-relaxed tracking-wide"
                multiline
              />
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

        {/* Ecosystem Cross-links */}
        <section className="relative px-6 md:px-20 py-16 md:py-24 border-t border-[#C42121]/20">
          <div className="max-w-7xl mx-auto">
            <GSAPReveal>
              <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-8">The Circle Ecosystem</p>
            </GSAPReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GSAPReveal delay={0.1}>
                <button
                  onClick={() => handleNav('/djs')}
                  className="group w-full text-left border border-[#C42121]/15 hover:border-[#C42121]/40 p-8 md:p-10 transition-all duration-300 cursor-pointer"
                >
                  <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-3">Selectors</p>
                  <h3 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none group-hover:text-white transition-colors duration-300">
                    THE DJS
                  </h3>
                  <p className="text-sm text-[#C42121]/50 mt-3 leading-relaxed">
                    Meet the selectors who curate the sound of every Circle event.
                  </p>
                  <span className="inline-block mt-6 text-xs font-mono text-[#C42121]/60 group-hover:text-[#C42121] tracking-widest uppercase transition-colors duration-300">
                    Explore DJs &rarr;
                  </span>
                </button>
              </GSAPReveal>

              <GSAPReveal delay={0.2}>
                <button
                  onClick={() => handleNav('/artists')}
                  className="group w-full text-left border border-[#C42121]/15 hover:border-[#C42121]/40 p-8 md:p-10 transition-all duration-300 cursor-pointer"
                >
                  <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-3">Performers</p>
                  <h3 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none group-hover:text-white transition-colors duration-300">
                    THE ARTISTS
                  </h3>
                  <p className="text-sm text-[#C42121]/50 mt-3 leading-relaxed">
                    Discover the artists who bring live performance to The Circle.
                  </p>
                  <span className="inline-block mt-6 text-xs font-mono text-[#C42121]/60 group-hover:text-[#C42121] tracking-widest uppercase transition-colors duration-300">
                    Explore Artists &rarr;
                  </span>
                </button>
              </GSAPReveal>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative px-6 md:px-20 py-32 md:py-40 border-t border-[#C42121]/20">
          <GSAPReveal delay={0.1}>
            <div className="max-w-4xl mx-auto text-center">
              <EditableText
                as="h2"
                contentKey="content_cta_events"
                field="title"
                value={ctaData.title}
                onSave={v => setCtaData(prev => ({ ...prev, title: v }))}
                className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8 text-[#C42121]"
              />
              <EditableText
                as="p"
                contentKey="content_cta_events"
                field="subtitle"
                value={ctaData.subtitle}
                onSave={v => setCtaData(prev => ({ ...prev, subtitle: v }))}
                className="text-lg md:text-xl font-light text-[#C42121]/70 mb-12 leading-relaxed"
                multiline
              />
              <button
                className="group relative bg-[#C42121] text-black font-black text-xl md:text-2xl py-6 px-16 uppercase tracking-widest hover:bg-[#ff3333] transition-all duration-300 cursor-pointer"
                onClick={() => handleNav('/form')}
              >
                APPLY NOW
              </button>
            </div>
          </GSAPReveal>
        </section>
      </div>

      <Footer />
      <AdminToolbar />
    </PageShell>
  );
}
