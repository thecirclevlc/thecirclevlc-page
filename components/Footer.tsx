import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSiteBlock } from '../hooks/useSiteContent';
import { supabase } from '../lib/supabase';
import {
  Instagram, Music, Youtube, Facebook, Linkedin, Mail, Globe, Twitter,
} from 'lucide-react';
import {
  DEFAULT_FOOTER, FOOTER_CONFIG_KEY,
  type FooterConfig, type NavItem, type SocialLink, type SocialPlatform,
} from '../lib/database.types';

const SOCIAL_ICON: Record<SocialPlatform, React.ElementType> = {
  instagram:  Instagram,
  tiktok:     Music,
  spotify:    Music,
  soundcloud: Music,
  youtube:    Youtube,
  x:          Twitter,
  facebook:   Facebook,
  linkedin:   Linkedin,
  email:      Mail,
  website:    Globe,
};

function resolveHref(item: NavItem): { path?: string; external?: string } {
  if (item.mode === 'external' && item.external_url) return { external: item.external_url };
  return { path: item.route ?? '/' };
}

export default function Footer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: cfg } = useSiteBlock<FooterConfig>(FOOTER_CONFIG_KEY, DEFAULT_FOOTER);
  const [socials, setSocials] = useState<SocialLink[]>([]);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('social_links')
      .select('*')
      .eq('visible', true)
      .order('sort_order')
      .then(({ data }) => {
        if (!cancelled && data) setSocials(data as SocialLink[]);
      });
    return () => { cancelled = true; };
  }, []);

  const handleNav = (item: NavItem) => {
    const r = resolveHref(item);
    if (r.external) { window.open(r.external, '_blank', 'noopener,noreferrer'); return; }
    if (!r.path) return;
    window.scrollTo(0, 0);
    setTimeout(() => navigate(r.path!), 50);
  };

  // Hide links pointing to the current page (existing behavior)
  const visibleLinks = cfg.links.filter(link => {
    if (link.mode !== 'route') return true;
    const p = link.route ?? '';
    return pathname !== p && !pathname.startsWith(p + '/');
  });

  const renderSocials = (size: number) => (
    socials.length > 0 && (
      <div className="flex items-center gap-4">
        {socials.map(s => {
          const Icon = SOCIAL_ICON[s.platform];
          const url = s.platform === 'email' ? `mailto:${s.url}` : s.url;
          return (
            <a
              key={s.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.platform}
              className="text-[#C42121]/60 hover:text-[#C42121] transition-colors"
            >
              <Icon size={size} />
            </a>
          );
        })}
      </div>
    )
  );

  return (
    <footer className="relative w-full border-t border-[#C42121]/10">
      {/* Mobile: stacked */}
      <div className="md:hidden px-6 py-10 space-y-8">
        <div>
          <p className="text-2xl font-black text-[#C42121] tracking-tighter uppercase leading-none">
            {cfg.brand_name}
          </p>
          <p className="text-[10px] font-mono text-[#C42121]/60 tracking-[0.2em] uppercase mt-2">
            {cfg.tagline}
          </p>
        </div>

        {/* DO NOT MAKE EDITABLE — Alia Studio credit is fixed by contract */}
        <a
          href="https://www.aliastudio.cc/"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-mono text-[#C42121]/70 hover:text-[#C42121] transition-colors uppercase tracking-wider"
        >
          By Alia Studio
        </a>

        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {visibleLinks.map(link => (
            <button
              key={link.id}
              onClick={() => handleNav(link)}
              className="text-sm font-mono text-[#C42121]/70 hover:text-[#C42121] transition-colors uppercase tracking-wider cursor-pointer"
            >
              {link.label}
            </button>
          ))}
          {cfg.contact_email && (
            <a
              href={`mailto:${cfg.contact_email}`}
              className="text-sm font-mono text-[#C42121]/70 hover:text-[#C42121] transition-colors uppercase tracking-wider"
            >
              Contact
            </a>
          )}
        </nav>

        {renderSocials(18)}

        <div className="border-t border-[#C42121]/10 pt-4 flex flex-col gap-2">
          <span className="text-xs font-mono text-[#C42121]/60 tracking-wider uppercase">
            &copy; {cfg.copyright_year} {cfg.brand_name}
          </span>
          <div className="flex gap-6">
            <button onClick={() => handleNav({ id: 't', label: 'Terms', mode: 'route', route: '/terms' })} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors tracking-wider uppercase cursor-pointer">Terms &amp; Conditions</button>
            <button onClick={() => handleNav({ id: 'p', label: 'Privacy', mode: 'route', route: '/privacy' })} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors tracking-wider uppercase cursor-pointer">Privacy Policy</button>
          </div>
        </div>
      </div>

      {/* Desktop: single row */}
      <div className="hidden md:block px-20 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <p className="text-2xl font-black text-[#C42121] tracking-tighter uppercase leading-none">
              {cfg.brand_name}
            </p>
            <span className="text-[#C42121]/20">|</span>
            {/* DO NOT MAKE EDITABLE — Alia Studio credit is fixed by contract */}
            <a
              href="https://www.aliastudio.cc/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors uppercase tracking-wider"
            >
              By Alia Studio
            </a>
            <span className="text-[#C42121]/20">|</span>
            <span className="text-xs font-mono text-[#C42121]/60 tracking-wider uppercase">
              &copy; {cfg.copyright_year}
            </span>
          </div>

          <nav className="flex items-center gap-6">
            {visibleLinks.map(link => (
              <button
                key={link.id}
                onClick={() => handleNav(link)}
                className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors uppercase tracking-wider cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            {cfg.contact_email && (
              <a
                href={`mailto:${cfg.contact_email}`}
                className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors uppercase tracking-wider"
              >
                Contact
              </a>
            )}
            <span className="text-[#C42121]/20">|</span>
            <button onClick={() => handleNav({ id: 't', label: 'Terms', mode: 'route', route: '/terms' })} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors tracking-wider uppercase cursor-pointer">Terms</button>
            <button onClick={() => handleNav({ id: 'p', label: 'Privacy', mode: 'route', route: '/privacy' })} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors tracking-wider uppercase cursor-pointer">Privacy</button>
            {socials.length > 0 && (
              <>
                <span className="text-[#C42121]/20">|</span>
                {renderSocials(14)}
              </>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
}
