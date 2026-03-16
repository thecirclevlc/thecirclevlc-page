import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { supabase } from '../lib/supabase';
import type { DJ, ArtistWithCategory, Event as DBEvent } from '../lib/database.types';
import { X } from 'lucide-react';
import SocialIcon from './SocialIcon';

// ── Types ─────────────────────────────────────────────────────────

export type ProfileType = 'dj' | 'artist';

interface ProfileModalProps {
  profile: DJ | ArtistWithCategory | null;
  type: ProfileType;
  onClose: () => void;
}

// ── Social link icon helper ────────────────────────────────────────

function SocialLink({ href, label, platform }: { href: string; label: string; platform: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-xs font-mono px-3 py-2 border border-[#C42121]/30 text-[#C42121]/80 hover:bg-[#C42121]/10 hover:text-[#C42121] transition-colors uppercase tracking-wider"
    >
      <SocialIcon platform={platform} size={14} />
      {label}
    </a>
  );
}

// ── Appeared-in events (now clickable) ────────────────────────────

function AppearedIn({ profileId, type, onClose }: { profileId: string; type: ProfileType; onClose: () => void }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Pick<DBEvent, 'id' | 'title' | 'slug' | 'date' | 'event_number' | 'tags'>[]>([]);

  useEffect(() => {
    if (!profileId) return;
    const joinTable = type === 'dj' ? 'event_djs' : 'event_artists';
    const idCol     = type === 'dj' ? 'dj_id' : 'artist_id';

    supabase
      .from(joinTable)
      .select(`events(id, title, slug, date, event_number, tags)`)
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
            {ev.tags && ev.tags.length > 0 && (
              <div className="flex gap-1 ml-2 flex-shrink-0">
                {ev.tags.slice(0, 2).map((tag, i) => (
                  <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 border border-[#C42121]/15 text-[#C42121]/30 uppercase tracking-wider">
                    {tag}
                  </span>
                ))}
              </div>
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
            className="fixed top-0 right-0 h-full w-full sm:w-[640px] bg-[#050000] border-l border-[#C42121]/20 z-[100] overflow-y-auto"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 flex items-center justify-center bg-black/60 backdrop-blur-sm border border-white/20 text-white/80 hover:text-white hover:bg-black/80 transition-all rounded-full cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Hero image */}
            <div className="relative w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden bg-black flex-shrink-0">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  style={{ filter: 'brightness(0.45)', objectPosition: (profile as any).photo_position ?? 'center' }}
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

              {(profile as any).based_in && (
                <div className="profile-item flex items-center gap-2 text-xs font-mono text-[#C42121]/50 tracking-wider">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  {(profile as any).based_in}
                </div>
              )}

              {/* Bio */}
              {profile.bio && (
                <div className="profile-item">
                  <p className="text-sm text-[#C42121]/70 leading-relaxed whitespace-pre-line">{profile.bio}</p>
                </div>
              )}

              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="profile-item flex flex-wrap gap-2">
                  {socialLinks.map(s => (
                    <SocialLink key={s.key} href={socials[s.key]} label={s.label} platform={s.key} />
                  ))}
                </div>
              )}

              {(profile as any).press_kit_url && (
                <div className="profile-item">
                  <a
                    href={(profile as any).press_kit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-mono px-4 py-2.5 border border-[#C42121]/30 text-[#C42121]/80 hover:bg-[#C42121]/10 hover:text-[#C42121] transition-colors uppercase tracking-wider"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Press Kit
                  </a>
                </div>
              )}

              {(profile as any).gallery_images?.length > 0 && (
                <div className="profile-item">
                  <h4 className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-3">Gallery</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {(profile as any).gallery_images.map((url: string, i: number) => (
                      <div key={i} className="aspect-square overflow-hidden border border-[#C42121]/15">
                        <img src={url} alt={`${profile.name} photo ${i + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          style={{ filter: 'brightness(0.7)' }} />
                      </div>
                    ))}
                  </div>
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
