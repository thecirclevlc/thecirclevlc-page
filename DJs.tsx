import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { supabase } from './lib/supabase';
import type { DJ } from './lib/database.types';
import { StandardHeader } from './StandardHeader';
import HeroMedia from './components/HeroMedia';
import { usePageBackground } from './hooks/usePageBackground';
import ProfileModal from './components/ProfileModal';
import AdminToolbar from './components/AdminToolbar';

gsap.registerPlugin(ScrollTrigger);

// ── GSAP scroll reveal ────────────────────────────────────────────
const GSAPReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(el,
        { opacity: 0, y: 80, filter: 'blur(10px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, delay, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none none' } }
      );
    }, el);
    return () => ctx.revert();
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
};

// ── DJ Card ───────────────────────────────────────────────────────
const DJCard: React.FC<{ dj: DJ; index: number; onClick: () => void }> = ({ dj, index, onClick }) => {
  const cardRef  = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card  = cardRef.current;
    const image = imageRef.current;
    if (!card || !image) return;

    // Wrap ScrollTrigger animation in context for proper cleanup on unmount
    const ctx = gsap.context(() => {
      gsap.fromTo(card,
        { opacity: 0, y: 80, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, delay: index * 0.08, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%', toggleActions: 'play none none none' } }
      );
    }, card);

    // Hover
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
      ctx.revert(); // kills ScrollTrigger + tweens automatically
      card.removeEventListener('mouseenter', enter);
      card.removeEventListener('mouseleave', leave);
    };
  }, [index]);

  // Social link icons
  const socials = dj.social_links as Record<string, string>;
  const socialLinks = [
    { key: 'instagram',  label: 'IG' },
    { key: 'soundcloud', label: 'SC' },
    { key: 'spotify',    label: 'SP' },
    { key: 'website',    label: 'WEB' },
  ].filter(s => socials[s.key]);

  return (
    <div ref={cardRef} className="group cursor-pointer" onClick={onClick}>
      {/* Photo */}
      <div className="relative aspect-[3/4] overflow-hidden bg-black border border-[#C42121]/20">
        <div ref={imageRef} className="w-full h-full">
          {dj.photo_url ? (
            <img
              src={dj.photo_url}
              alt={dj.name}
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.65)' }}
            />
          ) : (
            <div className="w-full h-full bg-[#0d0000] flex items-center justify-center">
              <span className="text-[#C42121]/20 font-black text-6xl tracking-widest">
                {dj.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        {/* Featured badge */}
        {dj.featured && (
          <div className="absolute top-4 right-4 text-[10px] font-mono tracking-widest border border-[#C42121]/50 px-2 py-1 text-[#C42121]/80 uppercase">
            FEATURED
          </div>
        )}

        {/* Social links on hover */}
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

      {/* Info */}
      <div className="mt-5 space-y-2">
        <h3 className="text-xl md:text-2xl font-black text-[#C42121] tracking-tight leading-none uppercase">
          {dj.name}
        </h3>
        {dj.genres?.length > 0 && (
          <p className="text-sm font-mono text-[#C42121]/50 tracking-wider">
            {dj.genres.join(' · ')}
          </p>
        )}
        {dj.bio && (
          <p className="text-sm text-[#C42121]/60 leading-relaxed line-clamp-2">{dj.bio}</p>
        )}
      </div>
    </div>
  );
};

// ── Skeleton card ─────────────────────────────────────────────────
const SkeletonDJ: React.FC = () => (
  <div className="animate-pulse">
    <div className="aspect-[3/4] bg-[#0d0000] border border-[#C42121]/10" />
    <div className="mt-5 space-y-2">
      <div className="h-6 w-2/3 bg-[#111] rounded" />
      <div className="h-3 w-1/2 bg-[#0a0a0a] rounded" />
    </div>
  </div>
);

// ── Main DJs Page ─────────────────────────────────────────────────
export default function DJs() {
  const navigate          = useNavigate();
  const [djs, setDJs]     = useState<DJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const { bgUrl, bgType }     = usePageBackground('page_djs');
  const heroTitleRef      = useRef<HTMLDivElement>(null);
  const [activeDJ, setActiveDJ] = useState<DJ | null>(null);

  // Fetch DJs
  useEffect(() => {
    supabase
      .from('djs')
      .select('*')
      .order('featured', { ascending: false })
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (data) setDJs(data);
        setLoading(false);
      });
  }, []);

  // Hero entrance
  useEffect(() => {
    const title = heroTitleRef.current;
    if (!title) return;
    gsap.fromTo(title.children,
      { opacity: 0, y: 100, rotationX: -90 },
      { opacity: 1, y: 0, rotationX: 0, duration: 1.2, stagger: 0.1, ease: 'power3.out', delay: 0.3 }
    );
  }, []);

  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black">

      {/* Noise overlay */}
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
              <div>THE</div>
              <div className="text-[#C42121]">DJS</div>
            </div>
            <GSAPReveal delay={0.6}>
              <p className="text-lg md:text-2xl font-light text-[#C42121]/70 max-w-3xl leading-relaxed tracking-wide">
                The selectors who define The Circle. Each set a journey, each night a collective experience.
              </p>
            </GSAPReveal>
          </div>
        </section>

        {/* ── DJs — grouped by genre ───────────────────── */}
        <section className="relative px-6 md:px-20 py-14 md:py-20">
          <div className="max-w-7xl mx-auto space-y-12">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
                {[1,2,3,4,5,6,7,8].map(i => <SkeletonDJ key={i} />)}
              </div>
            ) : error ? (
              <div className="text-center py-20">
                <p className="text-[#C42121]/50 text-xl font-mono tracking-widest">ERROR LOADING DJS</p>
                <p className="text-[#C42121]/30 text-sm font-mono mt-3">{error}</p>
              </div>
            ) : djs.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-[#C42121]/50 text-xl font-mono tracking-widest">NO DJS YET</p>
                <p className="text-[#C42121]/30 text-sm font-mono mt-3">Check back soon.</p>
              </div>
            ) : (
              /* Group DJs by first genre; ungrouped DJs go under "Other" */
              (() => {
                const groups: Record<string, DJ[]> = {};
                djs.forEach(dj => {
                  const key = (dj.genres && dj.genres.length > 0) ? dj.genres[0] : 'Other';
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(dj);
                });
                const sortedEntries = Object.entries(groups).sort(([a], [b]) => {
                  if (a === 'Other') return 1;
                  if (b === 'Other') return -1;
                  return a.localeCompare(b);
                });
                return sortedEntries.map(([genre, groupDJs]) => (
                  <div key={genre}>
                    <h3 className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-8 border-b border-[#C42121]/10 pb-4">
                      {genre}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-8 md:gap-10">
                      {groupDJs.map((dj, index) => (
                        <DJCard
                          key={dj.id}
                          dj={dj}
                          index={index}
                          onClick={() => setActiveDJ(dj)}
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
          profile={activeDJ}
          type="dj"
          onClose={() => setActiveDJ(null)}
        />

        {/* ── Cross-link to Artists ────────────────────── */}
        <section className="relative px-6 md:px-20 py-20 border-t border-[#C42121]/20">
          <GSAPReveal delay={0.1}>
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-2">Also at The Circle</p>
                <h3 className="text-3xl md:text-4xl font-black tracking-tight uppercase">THE ARTISTS</h3>
              </div>
              <button
                className="border border-[#C42121]/40 px-8 py-3 text-sm font-mono tracking-widest text-[#C42121] hover:bg-[#C42121] hover:text-black transition-all duration-300 uppercase cursor-pointer flex-shrink-0"
                onClick={() => { window.scrollTo(0, 0); setTimeout(() => navigate('/artists'), 50); }}
              >
                EXPLORE ARTISTS →
              </button>
            </div>
          </GSAPReveal>
        </section>

        {/* ── CTA ─────────────────────────────────────── */}
        <section className="relative px-6 md:px-20 py-32 md:py-40 border-t border-[#C42121]/20">
          <GSAPReveal delay={0.1}>
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[1.1] mb-8">
                ARE YOU A
                <br />
                <span className="text-[#C42121]">SELECTOR?</span>
              </h2>
              <p className="text-lg md:text-xl font-light text-[#C42121]/70 mb-12 leading-relaxed">
                We're always looking for artists who push boundaries. Apply to join The Circle.
              </p>
              <button
                className="bg-[#C42121] text-black font-black text-xl md:text-2xl py-6 px-16 uppercase tracking-widest hover:bg-[#ff3333] transition-all duration-300 cursor-pointer"
                onClick={() => { window.scrollTo(0, 0); setTimeout(() => navigate('/form'), 50); }}
              >
                APPLY NOW
              </button>
            </div>
          </GSAPReveal>
        </section>

      </div>

      <AdminToolbar />

      {/* Footer */}
      <footer className="relative w-full px-6 md:px-8 py-6 md:py-8 flex justify-between items-center border-t border-[#C42121]/10 text-[#f5f5f0]/50">
        <div className="text-sm md:text-base tracking-wider uppercase font-mono">© 2026 THE CIRCLE</div>
        <div className="text-sm md:text-base tracking-wider uppercase font-mono">
          <a href="https://www.aliastudio.cc/" target="_blank" rel="noopener noreferrer"
            className="hover:text-[#C42121] transition-colors">BY ALIA</a>
        </div>
        <div className="text-sm md:text-base tracking-wider uppercase font-mono">
          <a href="mailto:contact@thecirclevlc.com"
            className="hover:text-[#C42121] transition-colors">CONTACT</a>
        </div>
      </footer>
    </div>
  );
}
