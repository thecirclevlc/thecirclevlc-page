import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Events', path: '/past-events' },
  { label: 'DJs', path: '/djs' },
  { label: 'Artists', path: '/artists' },
  { label: 'Contact', href: 'mailto:contact@thecirclevlc.com' },
];

export default function Footer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const handleNav = (path: string) => {
    window.scrollTo(0, 0);
    setTimeout(() => navigate(path), 50);
  };

  const visibleLinks = NAV_LINKS.filter(link => {
    if (!link.path) return true;
    return pathname !== link.path && !pathname.startsWith(link.path + '/');
  });

  return (
    <footer className="relative w-full border-t border-[#C42121]/10">
      {/* Mobile: stacked layout */}
      <div className="md:hidden px-6 py-10 space-y-8">
        <div>
          <p className="text-2xl font-black text-[#C42121] tracking-tighter uppercase leading-none">
            THE CIRCLE
          </p>
          <p className="text-[10px] font-mono text-[#C42121]/60 tracking-[0.2em] uppercase mt-2">
            Valencia, Spain
          </p>
        </div>
        <a
          href="https://www.aliastudio.cc/"
          target="_blank"
          rel="noopener noreferrer"
          className="block text-sm font-mono text-[#C42121]/70 hover:text-[#C42121] transition-colors uppercase tracking-wider"
        >
          By Alia Studio
        </a>
        <nav className="flex flex-wrap gap-x-8 gap-y-3">
          {visibleLinks.map(link =>
            link.href ? (
              <a key={link.label} href={link.href} className="text-sm font-mono text-[#C42121]/70 hover:text-[#C42121] transition-colors uppercase tracking-wider">
                {link.label}
              </a>
            ) : (
              <button key={link.path} onClick={() => handleNav(link.path!)} className="text-sm font-mono text-[#C42121]/70 hover:text-[#C42121] transition-colors uppercase tracking-wider cursor-pointer">
                {link.label}
              </button>
            )
          )}
        </nav>
        <div className="border-t border-[#C42121]/10 pt-4 flex flex-col gap-2">
          <span className="text-xs font-mono text-[#C42121]/60 tracking-wider uppercase">&copy; 2026 The Circle</span>
          <div className="flex gap-6">
            <button onClick={() => handleNav('/terms')} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors tracking-wider uppercase cursor-pointer">Terms &amp; Conditions</button>
            <button onClick={() => handleNav('/privacy')} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors tracking-wider uppercase cursor-pointer">Privacy Policy</button>
          </div>
        </div>
      </div>

      {/* Desktop: single row */}
      <div className="hidden md:block px-20 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <p className="text-2xl font-black text-[#C42121] tracking-tighter uppercase leading-none">
              THE CIRCLE
            </p>
            <span className="text-[#C42121]/20">|</span>
            <a
              href="https://www.aliastudio.cc/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors uppercase tracking-wider"
            >
              By Alia Studio
            </a>
            <span className="text-[#C42121]/20">|</span>
            <span className="text-xs font-mono text-[#C42121]/60 tracking-wider uppercase">&copy; 2026</span>
          </div>

          <nav className="flex items-center gap-6">
            {visibleLinks.map(link =>
              link.href ? (
                <a key={link.label} href={link.href} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors uppercase tracking-wider">
                  {link.label}
                </a>
              ) : (
                <button key={link.path} onClick={() => handleNav(link.path!)} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors uppercase tracking-wider cursor-pointer">
                  {link.label}
                </button>
              )
            )}
            <span className="text-[#C42121]/20">|</span>
            <button onClick={() => handleNav('/terms')} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors tracking-wider uppercase cursor-pointer">Terms</button>
            <button onClick={() => handleNav('/privacy')} className="text-xs font-mono text-[#C42121]/60 hover:text-[#C42121] transition-colors tracking-wider uppercase cursor-pointer">Privacy</button>
          </nav>
        </div>
      </div>
    </footer>
  );
}
