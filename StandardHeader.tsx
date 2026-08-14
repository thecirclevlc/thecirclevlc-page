import React, { useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { HamburgerMenu } from './HamburgerMenu';
import CircleLogo from './components/CircleLogo';
import { useSiteBlock } from './hooks/useSiteContent';
import {
  visibleNavItems,
  DEFAULT_HAMBURGER, NAV_HAMBURGER_KEY,
  type HamburgerNavConfig, type NavItem,
} from './lib/database.types';

/**
 * The site header. One implementation, used everywhere.
 *
 * The client asked to "quitar tres puntos y poner los botones en el heading".
 * On desktop the menu entries are now written straight into the bar; the
 * three-dot overlay survives on phones, where it is the only navigation that
 * fits and where it remains the most recognisable thing about this header.
 *
 * Entries come from the same `nav_hamburger` row the admin already edits, so
 * the bar and the overlay can never disagree.
 */

/** Beyond this the bar gets crowded and starts wrapping, so the rest fold into the overlay. */
const MAX_INLINE_ITEMS = 6;

export const StandardHeader: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const rotation = useMotionValue(0);
  const { data: nav } = useSiteBlock<HamburgerNavConfig>(NAV_HAMBURGER_KEY, DEFAULT_HAMBURGER);

  useEffect(() => {
    let lastTime = performance.now();
    let animationId = 0;
    const update = () => {
      const time = performance.now();
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      rotation.set(rotation.get() + 0.98 * delta);
      animationId = requestAnimationFrame(update);
    };
    animationId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationId);
  }, [rotation]);

  const items = visibleNavItems(nav.items).slice(0, MAX_INLINE_ITEMS);

  const go = (item: NavItem) => {
    if (item.mode === 'external' && item.external_url) {
      window.open(item.external_url, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(item.route ?? '/');
  };

  const isCurrent = (item: NavItem) => {
    if (item.mode !== 'route' || !item.route) return false;
    return item.route === '/' ? pathname === '/' : pathname.startsWith(item.route);
  };

  return (
    <header className="fixed top-0 w-full bg-bg border-b border-primary/30 z-[100] h-16 md:h-20 flex items-center justify-between px-4 md:px-10">
      {/* Logo */}
      <button
        onClick={() => { navigate('/'); }}
        aria-label="The Circle — home"
        className="flex-shrink-0 rounded-full focus:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"
      >
        <motion.div
          style={{ rotate: rotation }}
          className="w-12 h-12 md:w-16 md:h-16 flex items-center justify-center"
        >
          <CircleLogo className="w-full h-full" />
        </motion.div>
      </button>

      {/* Everything else sits together on the right.
          Grouped rather than left as separate flex children: with
          `justify-between` and three children the nav floated in the middle of
          the bar, adrift from the logo and from the button it belongs with. */}
      <div className="flex items-center gap-2 md:gap-4">

        {/* Desktop: the entries, written out */}
        <nav aria-label="Main" className="hidden lg:flex items-center gap-1">
          {items.map(item => {
            const current = isCurrent(item);
            return (
              <button
                key={item.id}
                onClick={() => go(item)}
                aria-current={current ? 'page' : undefined}
                className={`group relative px-3 xl:px-4 py-2 text-xs font-mono tracking-[0.2em] uppercase transition-colors cursor-pointer
                            focus:outline-none focus-visible:ring-1 focus-visible:ring-primary
                            ${current ? 'text-primary' : 'text-primary/55 hover:text-primary'}`}
              >
                {item.label}
                {/* Underline marks the page you are on, and grows on hover */}
                <span
                  className={`absolute left-3 right-3 xl:left-4 xl:right-4 bottom-1 h-px bg-primary origin-left transition-transform duration-300
                              ${current ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100 group-focus-visible:scale-x-100'}`}
                />
              </button>
            );
          })}
        </nav>

        {/* Optional call-to-action, text and destination set in the admin */}
        {nav.cta?.label && (
          <button
            onClick={() => { navigate(nav.cta!.route || '/form'); }}
            className="hidden sm:block bg-primary text-black font-black text-[11px] md:text-xs py-2.5 px-5 md:px-6
                       uppercase tracking-widest hover:opacity-80 transition-opacity cursor-pointer
                       focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            {nav.cta.label}
          </button>
        )}

        {/* Mobile + tablet: the three dots stay */}
        <div className="lg:hidden">
          <HamburgerMenu />
        </div>
      </div>
    </header>
  );
};
