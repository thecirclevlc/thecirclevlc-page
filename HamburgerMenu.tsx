import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { useNavigate } from 'react-router-dom';
import { useSiteBlock } from './hooks/useSiteContent';
import { supabase } from './lib/supabase';
import {
  Instagram, Music, Youtube, Facebook, Linkedin, Mail, Globe, Twitter,
} from 'lucide-react';
import {
  DEFAULT_HAMBURGER, NAV_HAMBURGER_KEY,
  type HamburgerNavConfig, type NavItem, type SocialLink, type SocialPlatform,
} from './lib/database.types';
import { brandColor } from './lib/cssVar';

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

function resolveHref(item: NavItem): string {
  if (item.mode === 'external' && item.external_url) return item.external_url;
  return item.route ?? '/';
}

export const HamburgerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const circle1Ref = useRef<HTMLDivElement>(null);
  const circle2Ref = useRef<HTMLDivElement>(null);
  const circle3Ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: nav } = useSiteBlock<HamburgerNavConfig>(NAV_HAMBURGER_KEY, DEFAULT_HAMBURGER);

  // Load visible social links once
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

  const toggleMenu = () => setIsOpen(o => !o);

  // Escape cierra y devuelve el foco al botón que lo abrió.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); buttonRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    const overlay = overlayRef.current;
    const menuItems = menuItemsRef.current;
    const button = buttonRef.current;
    const c1 = circle1Ref.current;
    const c2 = circle2Ref.current;
    const c3 = circle3Ref.current;

    if (!overlay || !menuItems || !button || !c1 || !c2 || !c3) return;

    if (isOpen) {
      const buttonRect = button.getBoundingClientRect();
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const buttonCenterY = buttonRect.top + buttonRect.height / 2;
      const maxDistX = Math.max(buttonCenterX, window.innerWidth - buttonCenterX);
      const maxDistY = Math.max(buttonCenterY, window.innerHeight - buttonCenterY);
      const maxRadius = Math.sqrt(maxDistX * maxDistX + maxDistY * maxDistY);

      document.body.style.overflow = 'hidden';

      const tl = gsap.timeline();
      tl.to(c1, { rotation: 45, x: 5, y: 0, duration: 0.6, ease: 'expo.inOut' })
        .to(c2, { opacity: 0, scale: 0, duration: 0.4, ease: 'expo.inOut' }, '-=0.5')
        .to(c3, { rotation: -45, x: -5, y: 0, duration: 0.6, ease: 'expo.inOut' }, '-=0.6');

      gsap.fromTo(
        overlay,
        { opacity: 1, clipPath: `circle(0px at ${buttonCenterX}px ${buttonCenterY}px)` },
        { clipPath: `circle(${maxRadius}px at ${buttonCenterX}px ${buttonCenterY}px)`,
          duration: 1.2, ease: 'expo.inOut', delay: 0.1 },
      );

      const items = menuItems.querySelectorAll('.menu-item');
      gsap.fromTo(
        items,
        {
          opacity: 0, scale: 0.3,
          x: window.innerWidth / 2 - buttonCenterX,
          y: window.innerHeight / 2 - buttonCenterY,
        },
        { opacity: 1, scale: 1, x: 0, y: 0,
          duration: 1, stagger: 0.1, delay: 0.5, ease: 'expo.out' },
      );
    } else {
      const tl = gsap.timeline({ onComplete: () => { document.body.style.overflow = ''; } });
      tl.to(c1, { rotation: 0, x: 0, y: 0, duration: 0.5, ease: 'expo.inOut' })
        .to(c2, { opacity: 1, scale: 1, duration: 0.4, ease: 'expo.inOut' }, '-=0.4')
        .to(c3, { rotation: 0, x: 0, y: 0, duration: 0.5, ease: 'expo.inOut' }, '-=0.5');

      const items = menuItems.querySelectorAll('.menu-item');
      gsap.to(items, { opacity: 0, scale: 0.3, duration: 0.5, stagger: 0.05, ease: 'expo.in' });

      const buttonRect = button.getBoundingClientRect();
      const buttonCenterX = buttonRect.left + buttonRect.width / 2;
      const buttonCenterY = buttonRect.top + buttonRect.height / 2;

      gsap.to(overlay, {
        clipPath: `circle(0px at ${buttonCenterX}px ${buttonCenterY}px)`,
        duration: 0.8, delay: 0.2, ease: 'expo.inOut',
        onComplete: () => { gsap.set(overlay, { opacity: 0 }); },
      });
    }

    return () => {
      document.body.style.overflow = '';
      gsap.killTweensOf([overlay, menuItems, c1, c2, c3, ...Array.from(menuItems.querySelectorAll('.menu-item'))]);
    };
  }, [isOpen]);

  const handleItemClick = (item: NavItem) => {
    if (item.mode === 'external' && item.external_url) {
      window.open(item.external_url, '_blank', 'noopener,noreferrer');
      setTimeout(() => setIsOpen(false), 200);
      return;
    }
    window.scrollTo(0, 0);
    navigate(resolveHref(item));
    setTimeout(() => setIsOpen(false), 300);
  };

  const handleSocialClick = (s: SocialLink) => {
    const url = s.platform === 'email' ? `mailto:${s.url}` : s.url;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="relative z-[10001] flex flex-row items-center justify-center gap-2 w-12 h-12 cursor-pointer group
                   focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded-full"
        aria-label={isOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={isOpen}
        aria-controls="main-menu-overlay"
      >
        <div ref={circle1Ref} className="w-2.5 h-2.5 bg-primary rounded-full" />
        <div ref={circle2Ref} className="w-2.5 h-2.5 bg-primary rounded-full" />
        <div ref={circle3Ref} className="w-2.5 h-2.5 bg-primary rounded-full" />
      </button>

      <div
        ref={overlayRef}
        id="main-menu-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        // @ts-expect-error — `inert` is valid HTML; React's types lag behind.
        inert={isOpen ? undefined : ''}
        className={`fixed inset-0 bg-black z-[10000] flex flex-col items-center justify-center ${
          isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        style={{ opacity: 0 }}
      >
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--color-primary) 15%, transparent) 0%, transparent 60%)' }}
        />

        <div ref={menuItemsRef} className="relative z-10 w-full max-w-5xl px-8">
          <nav className="flex flex-col items-center justify-center gap-3 md:gap-5 lg:gap-6">
            {nav.items.map(item => (
              <MenuItem key={item.id} label={item.label} onClick={() => handleItemClick(item)} />
            ))}
          </nav>

          {socials.length > 0 && (
            <div className="menu-item mt-12 flex items-center justify-center gap-5">
              {socials.map(s => {
                const Icon = SOCIAL_ICON[s.platform];
                return (
                  <button
                    key={s.id}
                    onClick={() => handleSocialClick(s)}
                    aria-label={s.platform}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-primary/30 text-primary hover:bg-primary hover:text-black transition-colors"
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

const MenuItem: React.FC<{ label: string; onClick?: () => void }> = React.memo(({ label, onClick }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useEffect(() => () => { tlRef.current?.kill(); }, []);

  const handleMouseEnter = () => {
    tlRef.current?.kill();
    const tl = gsap.timeline();
    tlRef.current = tl;
    tl.to(textRef.current, { y: -4, color: brandColor(), duration: 0.45, ease: 'power3.out' }, 0);
    tl.fromTo(lineRef.current,
      { scaleX: 0, transformOrigin: '0% 50%' },
      { scaleX: 1, transformOrigin: '0% 50%', duration: 0.5, ease: 'power3.inOut' }, 0,
    );
  };

  const handleMouseLeave = () => {
    tlRef.current?.kill();
    const tl = gsap.timeline();
    tlRef.current = tl;
    tl.to(textRef.current, { y: 0, color: brandColor(), duration: 0.4, ease: 'power2.out' }, 0);
    tl.to(lineRef.current, { scaleX: 0, transformOrigin: '100% 50%', duration: 0.35, ease: 'power3.in' }, 0);
  };

  return (
    <div className="menu-item w-full">
      <button
        type="button"
        className="relative w-full flex items-center justify-center py-2 md:py-3 cursor-pointer select-none
                   focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        <div
          ref={textRef}
          className="font-black tracking-tight leading-none"
          style={{ fontSize: 'clamp(2rem, 8vw, 6.5rem)', color: 'var(--color-primary)', willChange: 'transform, color' }}
        >
          {label}
        </div>
        <div
          ref={lineRef}
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
          style={{ transform: 'scaleX(0)', transformOrigin: '0% 50%' }}
        />
      </button>
    </div>
  );
});
