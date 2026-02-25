import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from './lib/supabase';
import type { Event as DBEvent } from './lib/database.types';
import { StandardHeader } from './StandardHeader';
import HeroMedia from './components/HeroMedia';
import ImageLightbox from './components/ImageLightbox';

gsap.registerPlugin(ScrollTrigger);

// Image Gallery Component with GSAP and Lightbox
const ImageGallery: React.FC<{ images: string[]; onImageClick: (index: number) => void }> = ({ images, onImageClick }) => {
  return (
    <div className="space-y-12 md:space-y-20">
      {images.map((image, index) => (
        <GSAPImage key={index} image={image} index={index} onClick={onImageClick} />
      ))}
    </div>
  );
};

const GSAPImage: React.FC<{ image: string; index: number; onClick: (index: number) => void }> = ({ image, index, onClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;

    // Wrap ScrollTrigger animations in context for proper cleanup on unmount
    const ctx = gsap.context(() => {
      gsap.fromTo(
        container,
        { opacity: 0, y: 80 },
        {
          opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: container, start: 'top 85%' },
        }
      );
      gsap.fromTo(
        img,
        { scale: 1.2, filter: 'brightness(0.3)' },
        {
          scale: 1, filter: 'brightness(0.6)', duration: 1.5, ease: 'power2.out',
          scrollTrigger: { trigger: container, start: 'top 85%' },
        }
      );
    }, container);

    // Hover animation
    const handleMouseEnter = () => {
      gsap.to(img, { scale: 1.05, filter: 'brightness(0.8)', duration: 0.6, ease: 'power2.out' });
    };
    const handleMouseLeave = () => {
      gsap.to(img, { scale: 1, filter: 'brightness(0.6)', duration: 0.6, ease: 'power2.out' });
    };

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      ctx.revert(); // kills ScrollTrigger instances + tweens automatically
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative aspect-[16/10] overflow-hidden bg-black border border-[#C42121]/20 cursor-pointer group"
      onClick={() => onClick(index)}
    >
      <img ref={imageRef} src={image} alt={`Event image ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

      {/* Click hint */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="text-[#C42121] text-sm font-mono tracking-widest">CLICK TO EXPAND</div>
      </div>
    </div>
  );
};

// ── Adapt DB event for rendering ────────────────────────────────
function formatDate(date: string | null) {
  if (!date) return '';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// Main Event Detail Page
export default function EventDetail() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();   // eventId holds the slug

  const [event, setEvent]       = useState<DBEvent | null>(null);
  const [nextEvent, setNext]    = useState<DBEvent | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Fetch event by slug + the next event by date
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setNotFound(false);

    // Fetch event + next event in parallel (faster than sequential awaits)
    Promise.all([
      supabase.from('events').select('*').eq('slug', eventId).single(),
      supabase
        .from('events')
        .select('id,title,slug,event_number,cover_image_url,date')
        .eq('status', 'published')
        .neq('slug', eventId)
        .order('date', { ascending: false })
        .limit(1),
    ]).then(([{ data: eventData, error }, { data: nextData }]) => {
      if (error || !eventData) { setNotFound(true); }
      else { setEvent(eventData); setNext(nextData?.[0] ?? null); }
      setLoading(false);
    });
  }, [eventId]);

  // Logo rotation
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

  // Hero parallax effect
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const img = hero.querySelector('img');
    if (!img) return;

    gsap.to(img, {
      y: 150,
      ease: 'none',
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
      },
    });
  }, [event]);

  // Hero content animation
  useEffect(() => {
    if (!event) return;

    const tl = gsap.timeline();

    tl.fromTo(
      '.hero-number',
      {
        opacity: 0,
        x: -100,
        filter: 'blur(20px)',
      },
      {
        opacity: 0.4,
        x: 0,
        filter: 'blur(0px)',
        duration: 1.2,
        ease: 'power3.out',
      }
    )
      .fromTo(
        '.hero-title',
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
          ease: 'power3.out',
        },
        '-=0.8'
      )
      .fromTo(
        '.hero-meta > div',
        {
          opacity: 0,
          y: 30,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power2.out',
        },
        '-=0.6'
      );
  }, [event]);


  // ── Loading state ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050000] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#C42121] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen bg-[#050000] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-black text-[#C42121] mb-4">EVENT NOT FOUND</h1>
          <button
            className="border border-[#C42121] px-8 py-3 text-sm font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer"
            onClick={() => navigate('/past-events')}
          >
            BACK TO EVENTS
          </button>
        </div>
      </div>
    );
  }

  // Aliases from DB → template format
  const coverImage   = event.cover_image_url ?? 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=800&fit=crop';
  const galleryImages = event.gallery_images ?? [];
  const lineup       = event.lineup ?? [];
  const tags         = event.tags ?? [];

  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black">
      {/* Image Lightbox */}
      <ImageLightbox
        images={galleryImages}
        initialIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />

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
        <section ref={heroRef} className="relative h-[100dvh] flex items-end overflow-hidden">
          {/* Background media (video or image) with parallax on image */}
          <HeroMedia
            videoUrl={event.hero_video_url}
            imageUrl={coverImage}
            posterUrl={coverImage}
            priority
          />

          {/* Hero Content */}
          <div className="relative z-10 w-full px-6 md:px-20 pb-20 md:pb-32">
            {/* Event Number */}
            {event.event_number && (
              <div className="hero-number text-[#C42121]/40 font-black text-[15vw] md:text-[10vw] leading-none mb-4">{event.event_number}</div>
            )}

            {/* Title */}
            <h1 className="hero-title text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase mb-6">{event.title}</h1>

            {/* Meta Info */}
            <div className="hero-meta flex flex-wrap gap-8 text-sm md:text-base font-mono text-[#C42121]/70">
              {event.date && (
                <div>
                  <span className="block text-[10px] text-[#C42121]/50 mb-1 tracking-wider">DATE</span>
                  {formatDate(event.date)}
                </div>
              )}
              {event.venue && (
                <div>
                  <span className="block text-[10px] text-[#C42121]/50 mb-1 tracking-wider">LOCATION</span>
                  {event.venue}
                </div>
              )}
              {event.attendees && (
                <div>
                  <span className="block text-[10px] text-[#C42121]/50 mb-1 tracking-wider">ATTENDEES</span>
                  {event.attendees}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Description Section */}
        <section className="relative px-6 md:px-20 py-20 md:py-32 border-t border-[#C42121]/20">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 md:gap-20">
              {/* Left — short description teaser */}
              <div className="space-y-6">
                {event.short_description && (
                  <>
                    <span className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase">About</span>
                    <p className="text-xl md:text-2xl font-light text-[#C42121]/80 leading-relaxed">
                      {event.short_description}
                    </p>
                  </>
                )}
              </div>

              {/* Right — tags + lineup */}
              <div className="space-y-12">
                {/* Tags */}
                {tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-mono text-[#C42121]/50 mb-4 tracking-wider">EXPERIENCE</h3>
                    <div className="flex flex-wrap gap-3">
                      {tags.map((tag, i) => (
                        <span key={i} className="text-xs font-mono px-4 py-2 border border-[#C42121]/30 text-[#C42121]/80 uppercase tracking-wider hover:bg-[#C42121]/10 transition-colors duration-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lineup */}
                {lineup.length > 0 && (
                  <div>
                    <h3 className="text-sm font-mono text-[#C42121]/50 mb-4 tracking-wider">LINEUP</h3>
                    <div className="space-y-2">
                      {lineup.map((artist, i) => (
                        <div key={i} className="text-lg font-light text-[#C42121]/90 border-l-2 border-[#C42121]/30 pl-4 hover:border-[#C42121] hover:text-[#C42121] transition-colors duration-300">
                          {artist}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Long Description */}
        {event.description && (
          <section className="relative px-6 md:px-20 py-20 md:py-32 border-t border-[#C42121]/20 bg-black/30">
            <div className="max-w-5xl mx-auto space-y-8">
              {event.description.split('\n').filter(Boolean).map((paragraph, index) => (
                <p key={index} className="text-lg md:text-2xl font-light text-[#C42121]/80 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Image Gallery */}
        {galleryImages.length > 0 && (
          <section className="relative px-6 md:px-20 py-20 md:py-32 border-t border-[#C42121]/20">
            <div className="max-w-7xl mx-auto">
              <ImageGallery images={galleryImages} onImageClick={(index) => setLightboxIndex(index)} />
            </div>
          </section>
        )}

        {/* Next Event */}
        {nextEvent && (
          <section className="relative border-t border-[#C42121]/20">
            <div
              className="group relative h-[60vh] md:h-[80vh] overflow-hidden cursor-pointer next-event-section"
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => navigate(`/past-events/${nextEvent.slug}`), 50);
              }}
            >
              <img
                src={nextEvent.cover_image_url ?? ''}
                alt={nextEvent.title}
                className="absolute inset-0 w-full h-full object-cover next-event-img"
                style={{ filter: 'brightness(0.3)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050000] via-[#050000]/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <div className="text-sm font-mono text-[#C42121]/60 mb-4 tracking-widest next-event-label">NEXT EVENT</div>
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase mb-6 next-event-title">{nextEvent.title}</h2>
                {nextEvent.event_number && (
                  <div className="text-lg md:text-xl font-light text-[#C42121]/80 next-event-subtitle">{nextEvent.event_number}</div>
                )}
                <div className="mt-12 text-4xl text-[#C42121] next-event-arrow">↓</div>
              </div>
            </div>
          </section>
        )}

        {/* Back to Events CTA */}
        <section className="relative px-6 md:px-20 py-32 md:py-40 border-t border-[#C42121]/20 text-center">
          <div className="">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 uppercase">
              EXPLORE MORE
              <br />
              <span className="text-[#C42121]">PAST EVENTS</span>
            </h2>
            <button
              className="border border-[#C42121] px-12 py-4 text-sm font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer"
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => navigate('/past-events'), 50);
              }}
            >
              VIEW ALL EVENTS
            </button>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative w-full px-6 md:px-8 py-6 md:py-8 flex justify-between items-center border-t border-[#C42121]/10 text-[#f5f5f0]/50">
        <div className="text-sm tracking-wider uppercase font-mono">
          © 2026 THE CIRCLE
        </div>
        <div className="text-sm tracking-wider uppercase font-mono">
          <a
            href="https://www.aliastudio.cc/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#C42121] transition-colors"
          >
            BY ALIA
          </a>
        </div>
        <div className="text-sm tracking-wider uppercase font-mono">
          <a href="mailto:contact@thecirclevlc.com" className="hover:text-[#C42121] transition-colors">
            CONTACT
          </a>
        </div>
      </footer>
    </div>
  );
}
