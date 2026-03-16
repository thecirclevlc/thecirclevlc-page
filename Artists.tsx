import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from './lib/supabase';
import type { ArtistWithCategory } from './lib/database.types';
import { StandardHeader } from './StandardHeader';
import HeroMedia from './components/HeroMedia';
import { usePageBackground } from './hooks/usePageBackground';
import { useSiteContent, useSiteBlock } from './hooks/useSiteContent';
import ProfileModal from './components/ProfileModal';
import AdminToolbar from './components/AdminToolbar';
import PageShell from './components/PageShell';
import Footer from './components/Footer';
import GSAPReveal from './components/GSAPReveal';
import EditableText from './components/EditableText';
import SocialIcon from './components/SocialIcon';

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
    { key: 'instagram' },
    { key: 'soundcloud' },
    { key: 'spotify' },
    { key: 'website' },
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
                className="flex items-center justify-center w-7 h-7 border border-[#C42121]/40 text-[#C42121]/80 hover:bg-[#C42121]/10 transition-colors"
              >
                <SocialIcon platform={s.key} size={12} />
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
  const { title: heroTitle, subtitle: heroSubtitle, setContent: setArtistsContent } = useSiteContent('content_artists_hero');
  const { data: ctaData, setData: setCtaData } = useSiteBlock('content_cta_artists', {
    title: 'WANT TO PERFORM?',
    subtitle: "We're always looking for artists who push boundaries. Apply to join The Circle.",
  });
  const heroTitleRef          = useRef<HTMLDivElement>(null);
  const [activeArtist, setActiveArtist] = useState<ArtistWithCategory | null>(null);
  const [filter, setFilter] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const allCategories = React.useMemo(() => {
    const cats = new Map<string, number>();
    artists.forEach(a => {
      if (a.artist_categories) {
        cats.set(a.artist_categories.name, a.artist_categories.sort_order);
      }
    });
    return Array.from(cats.entries()).sort((a, b) => a[1] - b[1]).map(([name]) => name);
  }, [artists]);

  const filteredArtists = React.useMemo(() => {
    return artists.filter(a => {
      const matchesSearch = !filter || a.name.toLowerCase().includes(filter.toLowerCase());
      const matchesCategory = filterCategory === 'all' || a.artist_categories?.name === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [artists, filter, filterCategory]);

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
              <EditableText
                as="p"
                contentKey="content_artists_hero"
                field="subtitle"
                value={heroSubtitle}
                onSave={v => setArtistsContent('subtitle', v)}
                className="text-lg md:text-2xl font-light text-[#C42121]/70 max-w-3xl leading-relaxed tracking-wide"
                multiline
              />
            </GSAPReveal>
          </div>
        </section>

        {/* ── Artists ──────────────────────────────────── */}
        <section className="relative px-6 md:px-20 py-14 md:py-20">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* Filter bar */}
            {!loading && !error && artists.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={filter}
                  onChange={e => setFilter(e.target.value)}
                  placeholder="Search artists..."
                  className="bg-transparent border border-[#C42121]/20 px-4 py-2.5 text-sm text-white placeholder-[#C42121]/30 font-mono tracking-wider focus:outline-none focus:border-[#C42121]/50 transition-colors flex-1 max-w-xs"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`text-[10px] font-mono px-3 py-1.5 border uppercase tracking-wider transition-colors cursor-pointer ${
                      filterCategory === 'all'
                        ? 'border-[#C42121] text-[#C42121] bg-[#C42121]/10'
                        : 'border-[#C42121]/20 text-[#C42121]/50 hover:border-[#C42121]/40'
                    }`}
                  >
                    All
                  </button>
                  {allCategories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setFilterCategory(cat)}
                      className={`text-[10px] font-mono px-3 py-1.5 border uppercase tracking-wider transition-colors cursor-pointer ${
                        filterCategory === cat
                          ? 'border-[#C42121] text-[#C42121] bg-[#C42121]/10'
                          : 'border-[#C42121]/20 text-[#C42121]/50 hover:border-[#C42121]/40'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
                {[1,2,3,4,5,6,7,8].map(i => <SkeletonArtist key={i} />)}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-[#C42121]/50 text-xl font-mono tracking-widest">ERROR LOADING ARTISTS</p>
                <p className="text-[#C42121]/30 text-sm font-mono mt-3">{error}</p>
              </div>
            ) : filteredArtists.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#C42121]/50 text-xl font-mono tracking-widest">{artists.length === 0 ? 'NO ARTISTS YET' : 'NO RESULTS'}</p>
                <p className="text-[#C42121]/30 text-sm font-mono mt-3">{artists.length === 0 ? 'Check back soon.' : 'Try a different filter.'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 sm:gap-10 md:gap-12">
                {filteredArtists.map((artist, index) => (
                  <ArtistCard key={artist.id} artist={artist} index={index} onClick={() => setActiveArtist(artist)} />
                ))}
              </div>
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
              <EditableText
                as="h2"
                contentKey="content_cta_artists"
                field="title"
                value={ctaData.title}
                onSave={v => setCtaData(prev => ({ ...prev, title: v }))}
                className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8 text-[#C42121]"
              />
              <EditableText
                as="p"
                contentKey="content_cta_artists"
                field="subtitle"
                value={ctaData.subtitle}
                onSave={v => setCtaData(prev => ({ ...prev, subtitle: v }))}
                className="text-lg md:text-xl font-light text-[#C42121]/70 mb-12 leading-relaxed"
                multiline
              />
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
