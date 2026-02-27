import React from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Events', path: '/past-events' },
  { label: 'DJs', path: '/djs' },
  { label: 'Artists', path: '/artists' },
  { label: 'Join Us', path: '/form' },
];

export default function Footer() {
  const navigate = useNavigate();

  const handleNav = (path: string) => {
    window.scrollTo(0, 0);
    setTimeout(() => navigate(path), 50);
  };

  return (
    <footer className="relative w-full border-t border-[#C42121]/10">
      {/* Navigation row */}
      <div className="px-6 md:px-20 py-10 md:py-14">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <div>
            <p className="text-2xl md:text-3xl font-black text-[#C42121] tracking-tighter uppercase leading-none">
              THE CIRCLE
            </p>
            <p className="text-[10px] font-mono text-[#C42121]/30 tracking-[0.2em] uppercase mt-2">
              Valencia, Spain
            </p>
          </div>

          {/* Nav links */}
          <nav className="flex flex-wrap gap-x-8 gap-y-3">
            {NAV_LINKS.map(link => (
              <button
                key={link.path}
                onClick={() => handleNav(link.path)}
                className="text-sm font-mono text-[#C42121]/50 hover:text-[#C42121] transition-colors duration-200 uppercase tracking-wider cursor-pointer"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Contact */}
          <a
            href="mailto:contact@thecirclevlc.com"
            className="text-sm font-mono text-[#C42121]/50 hover:text-[#C42121] transition-colors duration-200 uppercase tracking-wider"
          >
            Contact
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-6 md:px-20 py-4 border-t border-[#C42121]/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span className="text-xs font-mono text-[#f5f5f0]/30 tracking-wider uppercase">
            &copy; 2026 The Circle
          </span>
          <a
            href="https://www.aliastudio.cc/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono text-[#f5f5f0]/30 hover:text-[#C42121] transition-colors tracking-wider uppercase"
          >
            By Alia
          </a>
        </div>
      </div>
    </footer>
  );
}
