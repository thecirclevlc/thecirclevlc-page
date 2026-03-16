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
import PageShell from './components/PageShell';
import Footer from './components/Footer';

gsap.registerPlugin(ScrollTrigger);

// ── Pinned Scroll Gallery ─────────────────────────────────────────
// The section pins to the viewport while images scroll horizontally.
// Once all images have been seen, the pin releases.

const PinnedGallery: React.FC<{ images: string[]; onImageClick: (index: number) => void }> = ({ images, onImageClick }) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track || images.length <= 1) return;

    const ctx = gsap.context(() => {
      // Total horizontal distance to scroll
      const totalScroll = track.scrollWidth - window.innerWidth;

      gsap.to(track, {
        x: -totalScroll,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${totalScroll}`,
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
    }, section);

    return () => ctx.revert();
  }, [images]);

  // Fallback for single image — no pin needed
  if (images.length === 1) {
    return (
      <div
        className="relative aspect-[16/10] overflow-hidden bg-black border border-[#C42121]/20 cursor-pointer group"
        onClick={() => onImageClick(0)}
      >
        <img src={images[0]} alt="Event image" className="w-full h-full object-cover" style={{ filter: 'brightness(0.65)' }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  return (
    <div ref={sectionRef} className="relative h-screen overflow-hidden">
      {/* Counter */}
      <div className="absolute top-6 left-6 md:left-20 z-10 flex items-center gap-4">
        <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase">Gallery</p>
        <span ref={counterRef} className="text-[10px] font-mono text-[#C42121]/60 tracking-widest">
          01 / {String(images.length).padStart(2, '0')}
        </span>
      </div>

      {/* Horizontal track */}
      <div ref={trackRef} className="flex items-center h-full gap-4 md:gap-6 pl-6 md:pl-20 will-change-transform">
        {images.map((img, i) => (
          <div
            key={i}
            className="flex-shrink-0 relative overflow-hidden border border-[#C42121]/20 cursor-pointer group"
            style={{ width: 'min(80vw, 900px)', height: '75vh' }}
            onClick={() => onImageClick(i)}
          >
            <img
              src={img}
              alt={`Gallery image ${i + 1}`}
              className="w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03]"
              style={{ filter: 'brightness(0.65)' }}
              loading="lazy"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
              <span className="text-[10px] font-mono tracking-widest text-white border border-white/40 px-3 py-1.5 uppercase">
                Expand
              </span>
            </div>
          </div>
        ))}
        {/* End spacer so last image can reach center */}
        <div className="flex-shrink-0 w-[20vw]" />
      </div>
    </div>
  );
};

// Keep legacy vertical gallery as fallback for gallery_style === 'default' on mobile
const ImageGallery: React.FC<{ images: string[]; onImageClick: (index: number) => void }> = ({ images, onImageClick }) => (
  <div className="space-y-12 md:space-y-20">
    {images.map((image, index) => (
      <div
        key={index}
        className="relative aspect-[16/10] overflow-hidden bg-black border border-[#C42121]/20 cursor-pointer group"
        onClick={() => onImageClick(index)}
      >
        <img src={image} alt={`Event image ${index + 1}`} className="w-full h-full object-cover" style={{ filter: 'brightness(0.65)' }} loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="text-[#C42121] text-sm font-mono tracking-widest">CLICK TO EXPAND</div>
        </div>
      </div>
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
  const [nextEvent, setNext]    = useState<Pick<DBEvent, 'id' | 'title' | 'slug' | 'event_number' | 'cover_image_url' | 'date'> | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [eventDJs, setEventDJs]           = useState<DJ[]>([]);
  const [eventArtists, setEventArtists]   = useState<ArtistWithCategory[]>([]);

  const [activeProfile, setActiveProfile]   = useState<DJ | ArtistWithCategory | null>(null);
  const [activeType, setActiveType]         = useState<ProfileType>('dj');

  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);

  const heroRef = useRef<HTMLDivElement>(null);

  const handleNav = (path: string) => {
    window.scrollTo(0, 0);
    setTimeout(() => navigate(path), 50);
  };

  // ── Fetch event + joins ────────────────────────────────────────
  useEffect(() => {
    if (!eventId) return;
    setLoading(true);
    setNotFound(false);

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
      if (error || !eventData) { setNotFound(true); setLoading(false); return; }
      setEvent(eventData);
      setNext(nextData?.[0] ?? null);

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
  const showLegacyLineup = eventDJs.length === 0 && eventArtists.length === 0 && (event.lineup ?? []).length > 0;

  return (
    <PageShell>

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
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-xs font-mono text-[#C42121]/40 tracking-wider mb-6">
              <button
                onClick={() => handleNav('/past-events')}
                className="hover:text-[#C42121] transition-colors uppercase cursor-pointer"
              >
                Events
              </button>
              <span>/</span>
              <span className="text-[#C42121]/70 truncate max-w-[200px]">{event.title}</span>
            </div>

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
                    {showLegacyLineup && (event.lineup ?? []).map((name, i) => (
                      <div key={i} className="py-3 border-b border-[#C42121]/10 text-xl font-black text-[#C42121] uppercase tracking-tight">
                        {name}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleNav('/djs')}
                    className="mt-4 text-xs font-mono text-[#C42121]/40 hover:text-[#C42121] tracking-widest uppercase transition-colors cursor-pointer"
                  >
                    View all DJs &rarr;
                  </button>
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
                  <button
                    onClick={() => handleNav('/artists')}
                    className="mt-4 text-xs font-mono text-[#C42121]/40 hover:text-[#C42121] tracking-widest uppercase transition-colors cursor-pointer"
                  >
                    View all Artists &rarr;
                  </button>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* ── Partnerships ────────────────────────────────── */}
        {event.partnerships && (event.partnerships as any[]).length > 0 && (
          <section className="relative px-6 md:px-20 py-12 md:py-16 border-t border-[#C42121]/20">
            <div className="max-w-7xl mx-auto">
              <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-6">Collaborations & Partners</p>
              <div className="flex flex-wrap gap-6 items-center">
                {(event.partnerships as any[]).map((p: any, i: number) => (
                  <a
                    key={i}
                    href={p.url || '#'}
                    target={p.url ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-3 border border-[#C42121]/20 hover:border-[#C42121]/40 transition-colors group"
                  >
                    {p.logo_url && (
                      <img src={p.logo_url} alt={p.name} className="h-8 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity" />
                    )}
                    <span className="text-sm font-mono text-[#C42121]/70 group-hover:text-[#C42121] tracking-wider uppercase transition-colors">
                      {p.name}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </section>
        )}

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

        {/* ── Image Gallery ── */}
        {galleryImages.length > 0 && (
          <div className="border-t border-[#C42121]/20">
            {event.gallery_style === 'horizontal' ? (
              <HorizontalGallery
                images={galleryImages}
                onImageClick={idx => setLightboxIndex(idx)}
              />
            ) : (
              <PinnedGallery
                images={galleryImages}
                onImageClick={idx => setLightboxIndex(idx)}
              />
            )}
          </div>
        )}

        {/* ── Next Event ─────────────────────────────────── */}
        {nextEvent && (
          <section className="relative border-t border-[#C42121]/20">
            <div
              className="group relative h-[60vh] md:h-[80vh] overflow-hidden cursor-pointer"
              onClick={() => handleNav(`/past-events/${nextEvent.slug}`)}
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
                  <div className="text-lg md:text-xl font-light text-[#C42121]/80 mb-4">{nextEvent.event_number}</div>
                )}
                {nextEvent.date && (
                  <div className="text-sm font-mono text-[#C42121]/50 mb-8">
                    {formatDate(nextEvent.date)}
                  </div>
                )}
                <span className="inline-block text-sm font-mono tracking-widest text-[#C42121] border border-[#C42121]/40 px-6 py-3 group-hover:bg-[#C42121] group-hover:text-black transition-all duration-300 uppercase">
                  View Event &rarr;
                </span>
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
            onClick={() => handleNav('/past-events')}
          >
            VIEW ALL EVENTS
          </button>
        </section>

      </div>

      <Footer />
      <AdminToolbar />
    </PageShell>
  );
}
