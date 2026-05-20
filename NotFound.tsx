import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { HamburgerMenu } from './HamburgerMenu';
import Footer from './components/Footer';

// ── ASCII "404" art — 7 rows × 33 cols (10-col digits + 3-col gutters) ────
// Each digit is 9 cols wide, joined with 3 spaces. '#' = filled cell, ' ' = empty.
const DIGIT_4 = [
  '#     ###',
  '#     ###',
  '#     ###',
  '#########',
  '#########',
  '      ###',
  '      ###',
];

const DIGIT_0 = [
  ' #######',
  '##     ##',
  '##     ##',
  '##     ##',
  '##     ##',
  '##     ##',
  ' #######',
];

function buildArt(): string[] {
  const rows: string[] = [];
  for (let r = 0; r < 7; r++) {
    rows.push(`${DIGIT_4[r]}   ${DIGIT_0[r]}   ${DIGIT_4[r]}`);
  }
  return rows;
}

const GLYPHS = ['█', '▓', '▒', '░', '▄', '▀', '╬', '*', '+', '·'];
const SOLID = '█';

// ── Glitter cell ──────────────────────────────────────────────────────────
interface Cell {
  ch: string;
  white: boolean;
}

export default function NotFound() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);

  // Initial grid: '#' becomes a solid block, ' ' stays empty
  const initial = useMemo(() => {
    const art = buildArt();
    return art.map(row =>
      row.split('').map<Cell>(c => ({
        ch: c === '#' ? SOLID : ' ',
        white: false,
      })),
    );
  }, []);

  const [grid, setGrid] = useState<Cell[][]>(initial);

  // Glitter loop — self-rescheduling setTimeout with random 80-150ms delay
  useEffect(() => {
    let timeoutId: number | null = null;
    let mounted = true;

    const tick = () => {
      if (!mounted) return;

      setGrid(prev => {
        const next = prev.map(row => row.slice());
        const totalRows = next.length;
        const totalCols = next[0]?.length ?? 0;
        const paintable: Array<[number, number]> = [];
        for (let r = 0; r < totalRows; r++) {
          for (let c = 0; c < totalCols; c++) {
            if (prev[r][c].ch !== ' ') paintable.push([r, c]);
          }
        }
        // Mutate ~6% of paintable cells per tick
        const mutations = Math.max(2, Math.floor(paintable.length * 0.06));
        for (let i = 0; i < mutations; i++) {
          const [r, c] = paintable[Math.floor(Math.random() * paintable.length)];
          const isSparkle = Math.random() < 0.04;
          next[r][c] = {
            ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            white: isSparkle,
          };
        }
        // Decay: any cell currently white reverts in next pass with 60% prob
        for (let r = 0; r < totalRows; r++) {
          for (let c = 0; c < totalCols; c++) {
            if (prev[r][c].white && Math.random() < 0.6) {
              next[r][c] = { ch: next[r][c].ch, white: false };
            }
          }
        }
        return next;
      });

      const delay = 80 + Math.random() * 70;
      timeoutId = window.setTimeout(tick, delay);
    };

    timeoutId = window.setTimeout(tick, 120);
    return () => {
      mounted = false;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, []);

  // GSAP staggered row reveal on mount
  useEffect(() => {
    if (!rowsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from('.ascii-row', {
        opacity: 0,
        y: 16,
        filter: 'blur(8px)',
        duration: 0.8,
        stagger: 0.08,
        ease: 'power3.out',
      });
    }, rowsRef);
    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-[#050000] text-[#C42121] overflow-hidden flex flex-col"
      style={{ fontFamily: 'Poppins, sans-serif' }}
    >
      {/* CRT vignette */}
      <div
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, transparent 0%, transparent 50%, rgba(0,0,0,0.65) 100%)',
        }}
      />
      {/* Scanlines */}
      <div
        className="pointer-events-none fixed inset-0 z-[1] opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.4) 0px, rgba(255,255,255,0.4) 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* Header — minimal, just hamburger top-right */}
      <header className="fixed top-0 w-full bg-[#050000]/80 backdrop-blur-sm border-b border-[#C42121]/20 z-50 h-16 md:h-20 flex items-center justify-end px-4 md:px-10">
        <HamburgerMenu />
      </header>

      {/* Main */}
      <main className="relative z-[2] flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-12">
        <div
          ref={rowsRef}
          className="font-mono leading-[0.95] select-none"
          style={{
            fontSize: 'clamp(6px, 1.8vw, 18px)',
            letterSpacing: '0.05em',
          }}
          aria-label="404 not found"
        >
          {grid.map((row, ri) => (
            <div key={ri} className="ascii-row whitespace-pre">
              {row.map((cell, ci) => (
                <span
                  key={ci}
                  style={{
                    color: cell.white ? '#ffffff' : '#C42121',
                    textShadow: cell.white
                      ? '0 0 8px rgba(255,255,255,0.8), 0 0 16px rgba(255,255,255,0.4)'
                      : '0 0 6px rgba(196,33,33,0.4)',
                  }}
                >
                  {cell.ch}
                </span>
              ))}
            </div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 0.6, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8, ease: 'easeOut' }}
          className="mt-10 md:mt-14 text-xs md:text-sm font-mono tracking-[0.5em] uppercase text-[#f5f5f0]/70"
        >
          PAGE NOT FOUND // SIGNAL LOST
        </motion.p>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.03, backgroundColor: '#C42121' }}
          whileTap={{ scale: 0.97 }}
          className="mt-10 border border-[#C42121] px-10 py-3 text-xs tracking-[0.3em] transition-colors uppercase font-bold mix-blend-exclusion hover:text-black"
        >
          RETURN
        </motion.button>
      </main>

      <div className="relative z-[2]">
        <Footer />
      </div>
    </div>
  );
}
