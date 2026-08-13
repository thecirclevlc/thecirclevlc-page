import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StandardHeader } from './StandardHeader';
import Footer from './components/Footer';
import AdminToolbar from './components/AdminToolbar';
import GSAPReveal from './components/GSAPReveal';
import ProfileGallery from './components/ProfileGallery';
import SocialIcon from './components/SocialIcon';
import NotFound from './NotFound';
import { supabase } from './lib/supabase';
import { usePageTitle } from './hooks/usePageTitle';
import { embedUrl } from './lib/embedUrl';
import {
  PROFILE_SOCIAL_KEYS,
  type DJ, type ArtistWithCategory, type Event as DBEvent,
} from './lib/database.types';

type Profile = (DJ | ArtistWithCategory) & { artist_categories?: { name: string } | null };

interface Props { type: 'dj' | 'artist' }

// ── Events this profile appeared in ───────────────────────────────

function AppearedIn({ profileId, type }: { profileId: string; type: 'dj' | 'artist' }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Pick<DBEvent, 'id' | 'title' | 'slug' | 'date' | 'event_number'>[]>([]);

  useEffect(() => {
    if (!profileId) return;
    const joinTable = type === 'dj' ? 'event_djs' : 'event_artists';
    const idCol     = type === 'dj' ? 'dj_id' : 'artist_id';

    supabase
      .from(joinTable)
      .select('events(id, title, slug, date, event_number)')
      .eq(idCol, profileId)
      .then(({ data }) => {
        if (!data) return;
        setEvents(data
          .map((r: any) => r.events)
          .filter(Boolean)
          .sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? '')));
      });
  }, [profileId, type]);

  if (events.length === 0) return null;

  return (
    <section className="px-5 md:px-20 py-12 md:py-16 border-t border-primary/10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xs font-mono text-primary/40 tracking-[0.2em] uppercase mb-6">Appeared in</h2>
        <div className="space-y-1">
          {events.map(ev => (
            <button
              key={ev.id}
              onClick={() => { window.scrollTo(0, 0); navigate(`/past-events/${ev.slug}`); }}
              className="w-full flex items-center gap-3 py-3 px-3 -mx-3 rounded hover:bg-primary/5 transition-colors cursor-pointer group text-left"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary flex-shrink-0 transition-colors" />
              <span className="text-primary/80 font-medium group-hover:text-fg transition-colors">{ev.title}</span>
              {ev.event_number && <span className="text-primary/40 text-xs font-mono">{ev.event_number}</span>}
              {ev.date && (
                <span className="text-primary/30 text-xs font-mono ml-auto flex-shrink-0">
                  {new Date(ev.date + 'T00:00:00').getFullYear()}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────

export default function ProfileDetail({ type }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const table = type === 'dj' ? 'djs' : 'artists';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setProfile(null);

    supabase
      .from(table)
      .select(type === 'artist' ? '*, artist_categories(name)' : '*')
      .eq('slug', slug ?? '')
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile((data as unknown as Profile) ?? null);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slug, table, type]);

  usePageTitle(profile?.name ?? (type === 'dj' ? 'DJ' : 'Artist'));
  useEffect(() => { window.scrollTo(0, 0); }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile) return <NotFound />;

  const socials = (profile.social_links ?? {}) as Record<string, string>;
  const socialList = PROFILE_SOCIAL_KEYS.filter(s => socials[s.key]?.trim());
  const gallery = (profile.gallery_images ?? []).filter(Boolean);
  const videos  = (profile.videos ?? []).filter(v => v.url?.trim());
  const links   = (profile.links  ?? []).filter(l => l.label?.trim() && l.url?.trim());
  const facts   = (profile.facts  ?? []).filter(f => f.label?.trim() && f.value?.trim());
  const genres  = profile.genres ?? [];
  const categoryName = (profile as ArtistWithCategory).artist_categories?.name ?? null;

  return (
    <div className="min-h-screen bg-bg text-primary selection:bg-primary selection:text-black">
      <StandardHeader />

      <main className="relative z-10 pt-16 md:pt-20">

        {/* Hero — full width, which is the whole point of this page existing */}
        <section className="relative w-full h-[58vh] min-h-[380px] md:h-[75vh] md:min-h-[520px] overflow-hidden bg-black">
          {profile.photo_url ? (
            <img
              src={profile.photo_url}
              alt={profile.name}
              className="w-full h-full object-cover"
              style={{ filter: 'brightness(0.5)', objectPosition: profile.photo_position ?? 'center' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-primary/10 font-black text-[24vw] leading-none tracking-widest select-none">
                {profile.name.slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 px-5 md:px-20 pb-8 md:pb-16">
            <div className="max-w-6xl mx-auto">
              <button
                onClick={() => { window.scrollTo(0, 0); navigate(type === 'dj' ? '/djs' : '/artists'); }}
                className="text-xs font-mono text-primary/60 hover:text-primary tracking-widest uppercase mb-4 transition-colors cursor-pointer"
              >
                &larr; {type === 'dj' ? 'All DJs' : 'All artists'}
              </button>
              <h1 className="font-black text-fg tracking-tighter leading-[0.88] uppercase break-words hyphens-auto"
                  style={{ fontSize: 'clamp(2.5rem, 11vw, 7rem)' }}>
                {profile.name}
              </h1>
              {(categoryName || profile.based_in) && (
                <p className="mt-3 text-xs md:text-sm font-mono text-fg/60 tracking-[0.2em] uppercase">
                  {[categoryName, profile.based_in].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-5 md:px-20">

          {genres.length > 0 && (
            <GSAPReveal>
              <div className="flex flex-wrap gap-2 py-8">
                {genres.map((g, i) => (
                  <span key={i} className="text-xs font-mono px-3 py-1.5 border border-primary/30 text-primary/70 uppercase tracking-wider">
                    {g}
                  </span>
                ))}
              </div>
            </GSAPReveal>
          )}

          {profile.bio && (
            <GSAPReveal delay={0.05}>
              <div className="max-w-3xl py-6">
                <p className="text-fg/80 text-base md:text-lg leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            </GSAPReveal>
          )}

          {/* Free-form info — "crear nuevas informaciones" */}
          {facts.length > 0 && (
            <GSAPReveal delay={0.1}>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 py-8 border-t border-primary/10">
                {facts.map(f => (
                  <div key={f.id}>
                    <dt className="text-[10px] font-mono text-primary/40 tracking-[0.2em] uppercase mb-1">{f.label}</dt>
                    <dd className="text-fg/80 text-sm leading-relaxed">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </GSAPReveal>
          )}

          {/* Buttons — "anadir botones" */}
          {(links.length > 0 || profile.press_kit_url) && (
            <GSAPReveal delay={0.12}>
              <div className="flex flex-wrap gap-3 py-8 border-t border-primary/10">
                {links.map(l => (
                  <a
                    key={l.id}
                    href={l.url}
                    target={/^https?:\/\//i.test(l.url) ? '_blank' : undefined}
                    rel="noopener noreferrer"
                    className={l.primary
                      ? 'w-full sm:w-auto text-center bg-primary text-black font-black text-base md:text-lg py-4 px-10 uppercase tracking-widest hover:opacity-80 transition-opacity'
                      : 'w-full sm:w-auto text-center border border-primary/40 text-primary px-6 py-3.5 text-xs font-mono tracking-widest uppercase hover:bg-primary hover:text-black transition-colors'}
                  >
                    {l.label}
                  </a>
                ))}
                {profile.press_kit_url && (
                  <a
                    href={profile.press_kit_url}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-primary/30 text-primary/80 px-6 py-3.5 text-xs font-mono tracking-widest uppercase hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Press kit
                  </a>
                )}
              </div>
            </GSAPReveal>
          )}

          {socialList.length > 0 && (
            <GSAPReveal delay={0.15}>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 py-8 border-t border-primary/10">
                {socialList.map(s => (
                  <a
                    key={s.key}
                    href={s.key === 'email' ? `mailto:${socials[s.key]}` : socials[s.key]}
                    target={s.key === 'email' ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-xs font-mono px-4 py-2.5 border border-primary/30 text-primary/80 hover:bg-primary/10 hover:text-primary transition-colors uppercase tracking-wider"
                  >
                    <SocialIcon platform={s.key} size={14} />
                    {s.label}
                  </a>
                ))}
              </div>
            </GSAPReveal>
          )}

          {/* Videos — "anadir videos" */}
          {videos.length > 0 && (
            <GSAPReveal delay={0.18}>
              <div className="py-10 border-t border-primary/10">
                <h2 className="text-xs font-mono text-primary/40 tracking-[0.2em] uppercase mb-6">Video</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {videos.map(v => {
                    const embed = embedUrl(v.url);
                    if (!embed) {
                      return (
                        <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer"
                           className="text-primary underline underline-offset-4 break-all text-sm">
                          {v.title || v.url}
                        </a>
                      );
                    }
                    return (
                      <figure key={v.id}>
                        <div className="relative w-full aspect-video border border-primary/15 bg-black">
                          {embed.kind === 'iframe' ? (
                            <iframe
                              src={embed.src} title={v.title || embed.title} loading="lazy"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen className="absolute inset-0 w-full h-full"
                            />
                          ) : (
                            <video src={embed.src} controls playsInline className="absolute inset-0 w-full h-full object-contain" />
                          )}
                        </div>
                        {v.title && (
                          <figcaption className="mt-2 text-xs font-mono text-fg/40 tracking-wider uppercase">{v.title}</figcaption>
                        )}
                      </figure>
                    );
                  })}
                </div>
              </div>
            </GSAPReveal>
          )}

          {gallery.length > 0 && (
            <GSAPReveal delay={0.2}>
              <div className="py-10 md:py-14 border-t border-primary/10">
                <ProfileGallery images={gallery} />
              </div>
            </GSAPReveal>
          )}
        </div>

        <AppearedIn profileId={profile.id} type={type} />
      </main>

      <Footer />
      <AdminToolbar />
    </div>
  );
}
