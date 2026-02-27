import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from './lib/supabase';
import type { ArtistWithCategory } from './lib/database.types';
import { StandardHeader } from './StandardHeader';
import HeroMedia from './components/HeroMedia';
import { usePageBackground } from './hooks/usePageBackground';
import { useSiteContent } from './hooks/useSiteContent';
import ProfileModal from './components/ProfileModal';
import AdminToolbar from './components/AdminToolbar';
import PageShell from './components/PageShell';
import Footer from './components/Footer';
import GSAPReveal from './components/GSAPReveal';

gsap.registerPlugin(ScrollTrigger);

// ── Artist Card ───────────────────────────────────────────────────
const ArtistCard: React.FC<{ artist: ArtistWithCategory; index: number; onClick: () => void }> = ({ artist, index, onClick }) => {
  const cardRef  = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card  = cardRef.current;
    const image = imageRef.current;
    if (!card || !image) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(card,
        { opacity: 0, y: 80, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, delay: index * 0.08, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' } }
      );
    }, card);

    const enter = () => {
      gsap.to(card,  { y: -10, duration: 0.5, ease: 'power2.out' });
      gsap.to(image, { scale: 1.08, duration: 0.7, ease: 'power2.out' });
    };
    const leave = () => {
      gsap.to(card,  { y: 0, duration: 0.5, ease: 'power2.inOut' });
      gsap.to(image, { scale: 1, duration: 0.7, ease: 'power2.inOut' });
    };
    card.addEventListener('mouseenter', enter);
    card.addEventListener('mouseleave', leave);
    return () => {
      ctx.revert();
      card.removeEventListener('mouseenter', enter);
      card.removeEventListener('mouseleave', leave);
    };
  }, [index]);

  const socials = (artist.social_links ?? {}) as Record<string, string>;
  const socialLinks = [
    { key: 'instagram',  label: 'IG' },
    { key: 'soundcloud', label: 'SC' },
    { key: 'spotify',    label: 'SP' },
    { key: 'website',    label: 'WEB' },
  ].filter(s => socials[s.key]);

  return (
    <div ref={cardRef} className="group cursor-pointer" onClick={onClick}>
      <div className="relative aspect-[3/4] overflow-hidden bg-black border border-[#C42121]/20">
        <div ref={imageRef} className="w-full h-full">
          {artist.photo_url ? (
            <img
              src={artist.photo_url}
              alt={artist.name}
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.65)' }}
            />
          ) : (
            <div className="w-full h-full bg-[#0d0000] flex items-center justify-center">
              <span className="text-[#C42121]/20 font-black text-6xl tracking-widest">
                {artist.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {artist.featured && (
          <div className="absolute top-4 right-4 text-[10px] font-mono tracking-widest border border-[#C42121]/50 px-2 py-1 text-[#C42121]/80 uppercase">
            FEATURED
          </div>
        )}

        {socialLinks.length > 0 && (
          <div className="absolute bottom-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {socialLinks.map(s => (
              <a
                key={s.key}
                href={socials[s.key]}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="text-[10px] font-mono tracking-widest border border-[#C42121]/40 px-2 py-1 text-[#C42121]/80 hover:bg-[#C42121]/10 transition-colors uppercase"
              >
                {s.label}
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 space-y-2">
        <h3 className="text-xl md:text-2xl font-black text-[#C42121] tracking-tight leading-none uppercase">
          {artist.name}
        </h3>
        {artist.artist_categories?.name && (
          <p className="text-xs font-mono text-[#C42121]/60 tracking-wider uppercase">
            {artist.artist_categories.name}
          </p>
        )}
        {artist.genres?.length > 0 && (
          <p className="text-sm font-mono text-[#C42121]/50 tracking-wider">
            {artist.genres.join(' · ')}
          </p>
        )}
        {artist.bio && (
          <p className="text-sm text-[#C42121]/60 leading-relaxed line-clamp-2">{artist.bio}</p>
        )}
      </div>
    </div>
  );
};

const SkeletonArtist: React.FC = () => (
  <div className="animate-pulse">
    <div className="aspect-[3/4] bg-[#0d0000] border border-[#C42121]/10" />
    <div className="mt-5 space-y-2">
      <div className="h-6 w-2/3 bg-[#111] rounded" />
      <div className="h-3 w-1/2 bg-[#0a0a0a] rounded" />
    </div>
  </div>
);

// ── Main Artists Page ─────────────────────────────────────────────
export default function Artists() {
  const navigate              = useNavigate();
  const [artists, setArtists] = useState<ArtistWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const { bgUrl, bgType }     = usePageBackground('page_artists');
  const { title: heroTitle, subtitle: heroSubtitle } = useSiteContent('content_artists_hero');
  const heroTitleRef          = useRef<HTMLDivElement>(null);
  const [activeArtist, setActiveArtist] = useState<ArtistWithCategory | null>(null);

  const heroWords = heroTitle.trim().split(' ');
  const heroLast  = heroWords.length > 1 ? (heroWords.pop() ?? '') : heroTitle;
  const heroRest  = heroWords.join(' ');

  const handleNav = (path: string) => {
    window.scrollTo(0, 0);
    setTimeout(() => navigate(path), 50);
  };

  useEffect(() => {
    supabase
      .from('artists')
      .select('*, artist_categories(id, name, slug, sort_order)')
      .order('featured', { ascending: false })
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (data) setArtists(data as ArtistWithCategory[]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const title = heroTitleRef.current;
    if (!title) return;
    gsap.fromTo(title.children,
      { opacity: 0, y: 100, rotationX: -90 },
      { opacity: 1, y: 0, rotationX: 0, duration: 1.2, stagger: 0.1, ease: 'power3.out', delay: 0.3 }
    );
  }, []);

  return (
    <PageShell>
      <StandardHeader />

      <div className="relative z-10 pt-16 md:pt-20">

        {/* ── Hero ─────────────────────────────────────── */}
        <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-6 md:px-20 py-20 md:py-32 border-b border-[#C42121]/20 overflow-hidden">
          {bgType !== 'none' && bgUrl && (
            <HeroMedia
              videoUrl={bgType === 'video' ? bgUrl : null}
              imageUrl={bgType === 'image' ? bgUrl : null}
              overlayClass="bg-gradient-to-t from-[#050000]/90 via-[#050000]/50 to-[#050000]/70"
            />
          )}
          <div className="relative z-10 w-full max-w-7xl">
            <div ref={heroTitleRef} className="text-6xl md:text-9xl font-black tracking-tighter leading-[0.9] uppercase mb-8">
              {heroRest && <div>{heroRest}</div>}
              <div className="text-[#C42121]">{heroLast}</div>
            </div>
            <GSAPReveal delay={0.6}>
              <p className="text-lg md:text-2xl font-light text-[#C42121]/70 max-w-3xl leading-relaxed tracking-wide">
                {heroSubtitle}
              </p>
            </GSAPReveal>
          </div>
        </section>

        {/* ── Artists — grouped by category ────────────── */}
        <section className="relative px-6 md:px-20 py-14 md:py-20">
          <div className="max-w-7xl mx-auto space-y-12">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
                {[1,2,3,4,5,6,7,8].map(i => <SkeletonArtist key={i} />)}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-[#C42121]/50 text-xl font-mono tracking-widest">ERROR LOADING ARTISTS</p>
                <p className="text-[#C42121]/30 text-sm font-mono mt-3">{error}</p>
              </div>
            ) : artists.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#C42121]/50 text-xl font-mono tracking-widest">NO ARTISTS YET</p>
                <p className="text-[#C42121]/30 text-sm font-mono mt-3">Check back soon.</p>
              </div>
            ) : (
              (() => {
                const catOrder: Record<string, number> = {};
                artists.forEach(a => {
                  if (a.artist_categories) {
                    catOrder[a.artist_categories.name] = a.artist_categories.sort_order;
                  }
                });

                const groups: Record<string, ArtistWithCategory[]> = {};
                artists.forEach(a => {
                  const key = a.artist_categories?.name ?? 'Other';
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(a);
                });

                const sortedKeys = Object.keys(groups).sort((a, b) => {
                  if (a === 'Other') return 1;
                  if (b === 'Other') return -1;
                  return (catOrder[a] ?? 999) - (catOrder[b] ?? 999);
                });

                return sortedKeys.map(cat => (
                  <div key={cat}>
                    <h3 className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-8 border-b border-[#C42121]/10 pb-4">
                      {cat}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
                      {groups[cat].map((artist, index) => (
                        <ArtistCard
                          key={artist.id}
                          artist={artist}
                          index={index}
                          onClick={() => setActiveArtist(artist)}
                        />
                      ))}
                    </div>
                  </div>
                ));
              })()
            )}
          </div>
        </section>

        {/* Profile Modal */}
        <ProfileModal
          profile={activeArtist}
          type="artist"
          onClose={() => setActiveArtist(null)}
        />

        {/* ── Cross-link to DJs ────────────────────────── */}
        <section className="relative px-6 md:px-20 py-20 border-t border-[#C42121]/20">
          <GSAPReveal delay={0.1}>
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-2">Also at The Circle</p>
                <h3 className="text-3xl md:text-4xl font-black tracking-tight uppercase">THE DJS</h3>
              </div>
              <button
                className="border border-[#C42121]/40 px-8 py-3 text-sm font-mono tracking-widest text-[#C42121] hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer flex-shrink-0"
                onClick={() => handleNav('/djs')}
              >
                EXPLORE DJS &rarr;
              </button>
            </div>
          </GSAPReveal>
        </section>

        {/* ── Cross-link to Events ─────────────────────── */}
        <section className="relative px-6 md:px-20 py-20 border-t border-[#C42121]/20">
          <GSAPReveal delay={0.1}>
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-2">Where they perform</p>
                <h3 className="text-3xl md:text-4xl font-black tracking-tight uppercase">THE EVENTS</h3>
              </div>
              <button
                className="border border-[#C42121]/40 px-8 py-3 text-sm font-mono tracking-widest text-[#C42121] hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer flex-shrink-0"
                onClick={() => handleNav('/past-events')}
              >
                VIEW EVENTS &rarr;
              </button>
            </div>
          </GSAPReveal>
        </section>

        {/* ── CTA ─────────────────────────────────────── */}
        <section className="relative px-6 md:px-20 py-32 md:py-40 border-t border-[#C42121]/20">
          <GSAPReveal delay={0.1}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8">
                WANT TO
                <br />
                <span className="text-[#C42121]">PERFORM?</span>
              </h2>
              <p className="text-lg md:text-xl font-light text-[#C42121]/70 mb-12 leading-relaxed">
                We're always looking for artists who push boundaries. Apply to join The Circle.
              </p>
              <button
                className="bg-[#C42121] text-black font-black text-xl md:text-2xl py-6 px-16 uppercase tracking-widest hover:bg-[#ff3333] transition-all duration-300 cursor-pointer"
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
