import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { supabase } from '../lib/supabase';
import type { DJ, ArtistWithCategory, Event as DBEvent } from '../lib/database.types';
import { X, Instagram, Music, Globe } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────

export type ProfileType = 'dj' | 'artist';

interface ProfileModalProps {
  profile: DJ | ArtistWithCategory | null;
  type: ProfileType;
  onClose: () => void;
}

// ── Social link icon helper ────────────────────────────────────────

function SocialLink({ href, label }: { href: string; label: string }) {
  const icon = label === 'Instagram' ? <Instagram size={14} />
    : label === 'SoundCloud' || label === 'Spotify' ? <Music size={14} />
    : <Globe size={14} />;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs font-mono px-3 py-2 border border-[#C42121]/30 text-[#C42121]/80 hover:bg-[#C42121]/10 hover:text-[#C42121] transition-colors uppercase tracking-wider"
    >
      {icon}
      {label}
    </a>
  );
}

// ── Appeared-in events (now clickable) ────────────────────────────

function AppearedIn({ profileId, type, onClose }: { profileId: string; type: ProfileType; onClose: () => void }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Pick<DBEvent, 'id' | 'title' | 'slug' | 'date' | 'event_number'>[]>([]);

  useEffect(() => {
    if (!profileId) return;
    const joinTable = type === 'dj' ? 'event_djs' : 'event_artists';
    const idCol     = type === 'dj' ? 'dj_id' : 'artist_id';

    supabase
      .from(joinTable)
      .select(`events(id, title, slug, date, event_number)`)
      .eq(idCol, profileId)
      .then(({ data }) => {
        if (data) {
          const evts = data
            .map((r: any) => r.events)
            .filter(Boolean)
            .sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? ''));
          setEvents(evts);
        }
      });
  }, [profileId, type]);

  if (events.length === 0) return null;

  const handleEventClick = (slug: string) => {
    onClose();
    window.scrollTo(0, 0);
    setTimeout(() => navigate(`/past-events/${slug}`), 300);
  };

  return (
    <div className="mt-8">
      <h4 className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-3">APPEARED IN</h4>
      <div className="space-y-1">
        {events.map(ev => (
          <button
            key={ev.id}
            onClick={() => handleEventClick(ev.slug)}
            className="w-full flex items-center gap-3 text-sm py-2.5 px-3 -mx-3 rounded hover:bg-[#C42121]/5 transition-colors cursor-pointer group text-left"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#C42121]/40 group-hover:bg-[#C42121] flex-shrink-0 transition-colors" />
            <span className="text-[#C42121]/80 font-medium group-hover:text-white transition-colors">{ev.title}</span>
            {ev.event_number && (
              <span className="text-[#C42121]/40 text-xs font-mono">{ev.event_number}</span>
            )}
            {ev.date && (
              <span className="text-[#C42121]/30 text-xs font-mono ml-auto flex-shrink-0">
                {new Date(ev.date + 'T00:00:00').getFullYear()}
              </span>
            )}
          </button>
        ))}
      </div>
      <button
        onClick={() => {
          onClose();
          window.scrollTo(0, 0);
          setTimeout(() => navigate('/past-events'), 300);
        }}
        className="mt-4 text-xs font-mono text-[#C42121]/40 hover:text-[#C42121] tracking-widest uppercase transition-colors cursor-pointer"
      >
        View all Events &rarr;
      </button>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────

export default function ProfileModal({ profile, type, onClose }: ProfileModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // GSAP stagger for content inside the panel
  useEffect(() => {
    if (!profile || !contentRef.current) return;
    const items = contentRef.current.querySelectorAll('.profile-item');
    if (!items.length) return;

    gsap.fromTo(
      items,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out', delay: 0.25 }
    );
  }, [profile]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const socials = (profile?.social_links ?? {}) as Record<string, string>;
  const socialLinks = [
    { key: 'instagram',  label: 'Instagram' },
    { key: 'soundcloud', label: 'SoundCloud' },
    { key: 'spotify',    label: 'Spotify' },
    { key: 'website',    label: 'Website' },
  ].filter(s => socials[s.key]);

  const genres: string[] = profile?.genres ?? [];

  const categoryName = type === 'artist'
    ? (profile as ArtistWithCategory)?.artist_categories?.name ?? null
    : null;

  return (
    <AnimatePresence>
      {profile && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/70 z-[90] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-in panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-[#050000] border-l border-[#C42121]/20 z-[100] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-5 right-5 z-10 w-9 h-9 flex items-center justify-center border border-[#C42121]/30 text-[#C42121]/60 hover:text-[#C42121] hover:border-[#C42121]/60 transition-colors"
            >
              <X size={16} />
            </button>

            {/* Hero image */}
            <div className="relative h-72 md:h-96 overflow-hidden bg-black flex-shrink-0">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.45)' }}
                />
              ) : (
                <div className="w-full h-full bg-[#0d0000] flex items-center justify-center">
                  <span className="text-[#C42121]/10 font-black text-[10rem] leading-none tracking-widest select-none">
                    {profile.name.slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050000] via-[#050000]/30 to-transparent" />

              {/* Name overlaid on photo */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="profile-item text-4xl md:text-5xl font-black text-white tracking-tight leading-none uppercase">
                  {profile.name}
                </h2>
              </div>
            </div>

            {/* Content */}
            <div ref={contentRef} className="px-6 py-8 space-y-6">

              {/* Category / genres pills */}
              {(categoryName || genres.length > 0) && (
                <div className="profile-item flex flex-wrap gap-2">
                  {categoryName && (
                    <span className="text-xs font-mono px-3 py-1 border border-[#C42121]/40 text-[#C42121] bg-[#C42121]/5 uppercase tracking-wider">
                      {categoryName}
                    </span>
                  )}
                  {genres.map((g, i) => (
                    <span key={i} className="text-xs font-mono px-3 py-1 border border-[#C42121]/30 text-[#C42121]/70 uppercase tracking-wider">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div className="profile-item">
                  <p className="text-sm text-[#C42121]/70 leading-relaxed">{profile.bio}</p>
                </div>
              )}

              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="profile-item flex flex-wrap gap-2">
                  {socialLinks.map(s => (
                    <SocialLink key={s.key} href={socials[s.key]} label={s.label} />
                  ))}
                </div>
              )}

              {/* Divider */}
              <div className="profile-item border-t border-[#C42121]/10" />

              {/* Appeared In — now clickable */}
              <div className="profile-item">
                <AppearedIn profileId={profile.id} type={type} onClose={onClose} />
              </div>

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
