import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from './lib/supabase';
import type { Event as DBEvent, DJ, ArtistWithCategory } from './lib/database.types';
import { StandardHeader } from './StandardHeader';
import HeroMedia from './components/HeroMedia';
import ImageLightbox from './components/ImageLightbox';
import ProfileModal, { type ProfileType } from './components/ProfileModal';
import AdminToolbar from './components/AdminToolbar';
import HorizontalGallery from './components/HorizontalGallery';

gsap.registerPlugin(ScrollTrigger);

// ── Image Gallery ────────────────────────────────────────────────

const GSAPImage: React.FC<{ image: string; index: number; onClick: (index: number) => void }> = ({ image, index, onClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const img = imageRef.current;
    if (!container || !img) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(container,
        { opacity: 0, y: 80 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: container, start: 'top 85%' } }
      );
      gsap.fromTo(img,
        { scale: 1.2, filter: 'brightness(0.3)' },
        { scale: 1, filter: 'brightness(0.6)', duration: 1.5, ease: 'power2.out',
          scrollTrigger: { trigger: container, start: 'top 85%' } }
      );
    }, container);

    const handleMouseEnter = () => gsap.to(img, { scale: 1.05, filter: 'brightness(0.8)', duration: 0.6, ease: 'power2.out' });
    const handleMouseLeave = () => gsap.to(img, { scale: 1, filter: 'brightness(0.6)', duration: 0.6, ease: 'power2.out' });

    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      ctx.revert();
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
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="text-[#C42121] text-sm font-mono tracking-widest">CLICK TO EXPAND</div>
      </div>
    </div>
  );
};

const ImageGallery: React.FC<{ images: string[]; onImageClick: (index: number) => void }> = ({ images, onImageClick }) => (
  <div className="space-y-12 md:space-y-20">
    {images.map((image, index) => (
      <GSAPImage key={index} image={image} index={index} onClick={onImageClick} />
    ))}
  </div>
);

// ── Name Row — text-only, hover pop (no cursor tracking = no lag) ─

const NameRow: React.FC<{
  name: string;
  photo_url: string | null;
  subtitle?: string;
  onSetHover: (url: string | null) => void;
  onClick: () => void;
}> = ({ name, photo_url, subtitle, onSetHover, onClick }) => (
  <div
    className="group cursor-pointer flex items-baseline justify-between gap-3 py-3 border-b border-[#C42121]/10 hover:border-[#C42121]/40 transition-colors duration-200"
    onMouseEnter={() => { if (photo_url) onSetHover(photo_url); }}
    onMouseLeave={() => onSetHover(null)}
    onClick={onClick}
  >
    <span className="text-xl md:text-2xl font-black text-[#C42121] uppercase tracking-tight leading-none group-hover:text-white transition-colors duration-200">
      {name}
    </span>
    {subtitle && (
      <span className="text-[10px] font-mono text-[#C42121]/40 tracking-wider whitespace-nowrap flex-shrink-0">
        {subtitle}
      </span>
    )}
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────

function formatDate(date: string | null) {
  if (!date) return '';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Main Page ─────────────────────────────────────────────────────

export default function EventDetail() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();

  const [event, setEvent]       = useState<DBEvent | null>(null);
  const [nextEvent, setNext]    = useState<DBEvent | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // DJ / Artist join data
  const [eventDJs, setEventDJs]           = useState<DJ[]>([]);
  const [eventArtists, setEventArtists]   = useState<ArtistWithCategory[]>([]);

  // Profile modal
  const [activeProfile, setActiveProfile]   = useState<DJ | ArtistWithCategory | null>(null);
  const [activeType, setActiveType]         = useState<ProfileType>('dj');

  // Hover image — fixed position pop (no cursor tracking, no lag)
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);

  // ── Fetch event + joins ────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setNotFound(false);

    Promise.all([
      // Base event
      supabase.from('events').select('*').eq('slug', eventId).single(),
      // Next event
      supabase
        .from('events')
        .select('id,title,slug,event_number,cover_image_url,date')
        .eq('status', 'published')
        .neq('slug', eventId)
        .order('date', { ascending: false })
        .limit(1),
    ]).then(([{ data: eventData, error }, { data: nextData }]) => {
      if (error || !eventData) { setNotFound(true); setLoading(false); return; }
      setEvent(eventData);
      setNext(nextData?.[0] ?? null);

      // Fetch DJ and Artist joins in parallel
      Promise.all([
        supabase
          .from('event_djs')
          .select('sort_order, djs(*)')
          .eq('event_id', eventData.id)
          .order('sort_order'),
        supabase
          .from('event_artists')
          .select('sort_order, artists(*, artist_categories(id,name,slug,sort_order))')
          .eq('event_id', eventData.id)
          .order('sort_order'),
      ]).then(([{ data: djData }, { data: artistData }]) => {
        if (djData) {
          const djs = djData.map((r: any) => r.djs).filter(Boolean) as DJ[];
          setEventDJs(djs);
        }
        if (artistData) {
          const artists = artistData.map((r: any) => r.artists).filter(Boolean) as ArtistWithCategory[];
          setEventArtists(artists);
        }
        setLoading(false);
      });
    });
  }, [eventId]);

  // ── Hero parallax ─────────────────────────────────────────────
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const img = hero.querySelector('img');
    if (!img) return;
    gsap.to(img, {
      y: 150, ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
    });
  }, [event]);

  // ── Hero content animation ────────────────────────────────────
  useEffect(() => {
    if (!event) return;
    const tl = gsap.timeline();
    tl.fromTo('.hero-number',
      { opacity: 0, x: -100, filter: 'blur(20px)' },
      { opacity: 0.4, x: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' }
    ).fromTo('.hero-title',
      { opacity: 0, y: 100, rotationX: -90 },
      { opacity: 1, y: 0, rotationX: 0, duration: 1.2, ease: 'power3.out' },
      '-=0.8'
    ).fromTo('.hero-meta > div',
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power2.out' },
      '-=0.6'
    );
  }, [event]);

  // ── Music styles: unique genres from DJs + event tags ─────────
  const musicStyles = React.useMemo(() => {
    const genres = eventDJs.flatMap(dj => dj.genres ?? []);
    const tags   = event?.tags ?? [];
    return [...new Set([...genres, ...tags])];
  }, [eventDJs, event]);

  // ── Loading / not found ───────────────────────────────────────
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

  const coverImage    = event.cover_image_url ?? 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&h=800&fit=crop';
  const galleryImages = event.gallery_images ?? [];
  // Legacy lineup fallback: show if no join data
  const showLegacyLineup = eventDJs.length === 0 && eventArtists.length === 0 && (event.lineup ?? []).length > 0;

  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black">

      {/* Image Lightbox */}
      <ImageLightbox
        images={galleryImages}
        initialIndex={lightboxIndex ?? 0}
        isOpen={lightboxIndex !== null}
        onClose={() => setLightboxIndex(null)}
      />

      {/* Profile Modal */}
      <ProfileModal
        profile={activeProfile}
        type={activeType}
        onClose={() => setActiveProfile(null)}
      />

      {/* Noise Overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03] z-[1] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.3) 100%)' }} />

      <StandardHeader />

      <div className="relative z-10 pt-16 md:pt-20">

        {/* ── Hero ──────────────────────────────────────── */}
        <section ref={heroRef} className="relative h-[100dvh] flex items-end overflow-hidden">
          <HeroMedia
            videoUrl={event.hero_video_url}
            imageUrl={coverImage}
            posterUrl={coverImage}
            priority
          />
          <div className="relative z-10 w-full px-6 md:px-20 pb-20 md:pb-32">
            {event.event_number && (
              <div className="hero-number text-[#C42121]/40 font-black text-[15vw] md:text-[10vw] leading-none mb-4">
                {event.event_number}
              </div>
            )}
            <h1 className="hero-title text-6xl md:text-9xl font-black tracking-tighter leading-[0.85] uppercase mb-6">
              {event.title}
            </h1>
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

        {/* ── 3-Column: About · DJs · Artists ───────────── */}
        <section className="relative px-6 md:px-20 py-16 md:py-24 border-t border-[#C42121]/20">
          <div className="max-w-7xl mx-auto">
            <div className={`grid grid-cols-1 gap-12 md:gap-0 ${
              eventArtists.length > 0 && (eventDJs.length > 0 || showLegacyLineup)
                ? 'md:grid-cols-3'
                : (eventDJs.length > 0 || showLegacyLineup || eventArtists.length > 0)
                  ? 'md:grid-cols-2'
                  : 'md:grid-cols-1'
            }`}>

              {/* Column 1 — About */}
              <div className="md:pr-10 space-y-6">
                <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase">About</p>
                {event.short_description && (
                  <p className="text-base md:text-lg font-light text-[#C42121]/80 leading-relaxed">
                    {event.short_description}
                  </p>
                )}
                {event.description && (
                  <div className="space-y-4">
                    {event.description.split('\n').filter(Boolean).map((para, i) => (
                      <p key={i} className="text-sm text-[#C42121]/60 leading-relaxed">{para}</p>
                    ))}
                  </div>
                )}
                {musicStyles.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase">Music</p>
                    <div className="flex flex-wrap gap-2">
                      {musicStyles.map((style, i) => (
                        <span key={i} className="text-[10px] font-mono px-3 py-1.5 border border-[#C42121]/25 text-[#C42121]/70 uppercase tracking-wider hover:bg-[#C42121]/10 transition-colors">
                          {style}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Column 2 — DJs */}
              {(eventDJs.length > 0 || showLegacyLineup) && (
                <div className="md:px-10 md:border-l md:border-[#C42121]/10 space-y-4">
                  <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase">DJs — Line Up</p>
                  <div>
                    {eventDJs.map(dj => (
                      <NameRow
                        key={dj.id}
                        name={dj.name}
                        subtitle={dj.genres?.slice(0, 2).join(' · ')}
                        photo_url={dj.photo_url}
                        onSetHover={setHoveredUrl}
                        onClick={() => { setHoveredUrl(null); setActiveType('dj'); setActiveProfile(dj); }}
                      />
                    ))}
                    {/* Legacy text fallback */}
                    {showLegacyLineup && (event.lineup ?? []).map((name, i) => (
                      <div key={i} className="py-3 border-b border-[#C42121]/10 text-xl font-black text-[#C42121] uppercase tracking-tight">
                        {name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Column 3 — Artists */}
              {eventArtists.length > 0 && (
                <div className="md:pl-10 md:border-l md:border-[#C42121]/10 space-y-4">
                  <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase">Artists</p>
                  <div>
                    {eventArtists.map(artist => (
                      <NameRow
                        key={artist.id}
                        name={artist.name}
                        subtitle={artist.artist_categories?.name ?? (artist.genres?.slice(0, 1).join('') ?? undefined)}
                        photo_url={artist.photo_url}
                        onSetHover={setHoveredUrl}
                        onClick={() => { setHoveredUrl(null); setActiveType('artist'); setActiveProfile(artist); }}
                      />
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* ── Hover image — fixed pop, no cursor tracking ─── */}
        {hoveredUrl && (
          <div className="fixed right-10 top-1/2 -translate-y-1/2 pointer-events-none z-[200]
                          w-48 h-60 overflow-hidden border border-[#C42121]/30 shadow-2xl
                          hidden md:block">
            <img
              src={hoveredUrl}
              alt=""
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.75)' }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* ── Image Gallery (default vertical / horizontal parallax) ── */}
        {galleryImages.length > 0 && (
          <section className="relative px-6 md:px-20 py-20 md:py-32 border-t border-[#C42121]/20">
            <div className="max-w-7xl mx-auto">
              {event.gallery_style === 'horizontal' ? (
                <HorizontalGallery
                  images={galleryImages}
                  onImageClick={idx => setLightboxIndex(idx)}
                />
              ) : (
                <ImageGallery
                  images={galleryImages}
                  onImageClick={idx => setLightboxIndex(idx)}
                />
              )}
            </div>
          </section>
        )}

        {/* ── Next Event ─────────────────────────────────── */}
        {nextEvent && (
          <section className="relative border-t border-[#C42121]/20">
            <div
              className="group relative h-[60vh] md:h-[80vh] overflow-hidden cursor-pointer"
              onClick={() => {
                window.scrollTo(0, 0);
                setTimeout(() => navigate(`/past-events/${nextEvent.slug}`), 50);
              }}
            >
              <img
                src={nextEvent.cover_image_url ?? ''}
                alt={nextEvent.title}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.3)' }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050000] via-[#050000]/70 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                <div className="text-sm font-mono text-[#C42121]/60 mb-4 tracking-widest">NEXT EVENT</div>
                <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase mb-6">
                  {nextEvent.title}
                </h2>
                {nextEvent.event_number && (
                  <div className="text-lg md:text-xl font-light text-[#C42121]/80">{nextEvent.event_number}</div>
                )}
                <div className="mt-12 text-4xl text-[#C42121]">↓</div>
              </div>
            </div>
          </section>
        )}

        {/* ── Back to Events ────────────────────────────── */}
        <section className="relative px-6 md:px-20 py-32 md:py-40 border-t border-[#C42121]/20 text-center">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 uppercase">
            EXPLORE MORE
            <br />
            <span className="text-[#C42121]">PAST EVENTS</span>
          </h2>
          <button
            className="border border-[#C42121] px-12 py-4 text-sm font-mono tracking-widest hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer"
            onClick={() => { window.scrollTo(0, 0); setTimeout(() => navigate('/past-events'), 50); }}
          >
            VIEW ALL EVENTS
          </button>
        </section>

      </div>

      {/* Footer */}
      <footer className="relative w-full px-6 md:px-8 py-6 md:py-8 flex justify-between items-center border-t border-[#C42121]/10 text-[#f5f5f0]/50">
        <div className="text-sm tracking-wider uppercase font-mono">© 2026 THE CIRCLE</div>
        <div className="text-sm tracking-wider uppercase font-mono">
          <a href="https://www.aliastudio.cc/" target="_blank" rel="noopener noreferrer" className="hover:text-[#C42121] transition-colors">BY ALIA</a>
        </div>
        <div className="text-sm tracking-wider uppercase font-mono">
          <a href="mailto:contact@thecirclevlc.com" className="hover:text-[#C42121] transition-colors">CONTACT</a>
        </div>
      </footer>

      <AdminToolbar />
    </div>
  );
}
