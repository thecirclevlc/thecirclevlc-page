# Ecosystem UX Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all dead-end navigation, add cross-page interconnections, unify the color system, and add a proper footer — making the Events/DJs/Artists ecosystem fully navigable.

**Architecture:** Extract shared components (Footer, noise/vignette overlays, GSAPReveal) to eliminate copy-paste. Then fix interconnection issues top-down: ProfileModal clickable events, breadcrumbs on EventDetail, cross-links on PastEvents, proper footer on all pages, color system fix.

**Tech Stack:** React 19, TypeScript, Tailwind CSS (CDN), GSAP, Framer Motion, React Router DOM 7

---

### Task 1: Extract shared components (Footer, PageShell)

**Files:**
- Create: `components/Footer.tsx`
- Create: `components/PageShell.tsx` (noise overlay + vignette + wrapper)
- Create: `components/GSAPReveal.tsx`
- Modify: `PastEvents.tsx` — replace inline footer/noise/vignette/GSAPReveal with shared components
- Modify: `DJs.tsx` — same
- Modify: `Artists.tsx` — same
- Modify: `EventDetail.tsx` — same

**Step 1: Create `components/Footer.tsx`**

New navigation footer with links to Events, DJs, Artists, Form + existing copyright/credit/contact.

```tsx
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
```

**Step 2: Create `components/PageShell.tsx`**

Wraps noise overlay + vignette so we don't repeat them on every page.

```tsx
import React from 'react';

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#050000] text-[#C42121] selection:bg-[#C42121] selection:text-black">
      {/* Noise Overlay */}
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
      {children}
    </div>
  );
}
```

**Step 3: Create `components/GSAPReveal.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

export default GSAPReveal;
```

**Step 4: Update PastEvents.tsx, DJs.tsx, Artists.tsx, EventDetail.tsx**

In each file:
- Remove inline GSAPReveal component definition
- Remove inline noise overlay + vignette divs
- Remove inline footer
- Import and use `PageShell`, `Footer`, `GSAPReveal` from `components/`
- Keep `AdminToolbar` inside `PageShell`

**Step 5: Commit**

```bash
git add components/Footer.tsx components/PageShell.tsx components/GSAPReveal.tsx PastEvents.tsx DJs.tsx Artists.tsx EventDetail.tsx
git commit -m "refactor: extract Footer, PageShell, GSAPReveal shared components"
```

---

### Task 2: Fix ProfileModal — make "Appeared In" events clickable

**Files:**
- Modify: `components/ProfileModal.tsx:66-85` (AppearedIn component)

**Step 1: Update AppearedIn to use clickable links**

Change the event rows from plain text to clickable navigation items. Import `useNavigate`. When clicked, close the modal and navigate to the event.

The `AppearedIn` component needs an `onClose` prop and `useNavigate`:

```tsx
// In AppearedIn component — add onClose prop and navigation
function AppearedIn({ profileId, type, onClose }: { profileId: string; type: ProfileType; onClose: () => void }) {
  const navigate = useNavigate();
  // ... existing fetch logic ...

  const handleEventClick = (slug: string) => {
    onClose();
    window.scrollTo(0, 0);
    setTimeout(() => navigate(`/past-events/${slug}`), 300);
  };

  // In the render, make each event row clickable:
  // Change <div> to <button> with onClick={handleEventClick(ev.slug)}
  // Add hover styles: hover:text-white, cursor-pointer
}
```

Pass `onClose` from the parent `ProfileModal` component down to `AppearedIn`.

**Step 2: Commit**

```bash
git add components/ProfileModal.tsx
git commit -m "feat: make Appeared In events clickable in ProfileModal"
```

---

### Task 3: Fix artist category color — remove green, use red

**Files:**
- Modify: `Artists.tsx:139` — change `text-[#059669]/70` to `text-[#C42121]/60`
- Modify: `components/ProfileModal.tsx:194` — change `border-[#059669]/40 text-[#34d399]` to `border-[#C42121]/40 text-[#C42121]/70`

**Step 1: Fix color in Artists.tsx**

```tsx
// Line 139: change from green to red variant
<p className="text-xs font-mono text-[#C42121]/60 tracking-wider uppercase">
```

**Step 2: Fix color in ProfileModal.tsx**

```tsx
// Line 194: change from green to red variant with distinct styling
<span className="text-xs font-mono px-3 py-1 border border-[#C42121]/40 text-[#C42121] bg-[#C42121]/5 uppercase tracking-wider">
```

**Step 3: Commit**

```bash
git add Artists.tsx components/ProfileModal.tsx
git commit -m "fix: replace green artist category color with monochromatic red"
```

---

### Task 4: Add breadcrumbs to EventDetail

**Files:**
- Modify: `EventDetail.tsx` — add breadcrumb navigation above hero title

**Step 1: Add breadcrumb inside the hero section**

Inside the hero's content area (before the event number), add:

```tsx
<div className="flex items-center gap-2 text-xs font-mono text-[#C42121]/40 tracking-wider mb-6">
  <button
    onClick={() => { window.scrollTo(0, 0); setTimeout(() => navigate('/past-events'), 50); }}
    className="hover:text-[#C42121] transition-colors uppercase cursor-pointer"
  >
    Events
  </button>
  <span>/</span>
  <span className="text-[#C42121]/70">{event.title}</span>
</div>
```

**Step 2: Commit**

```bash
git add EventDetail.tsx
git commit -m "feat: add breadcrumb navigation to EventDetail page"
```

---

### Task 5: Add ecosystem cross-links on PastEvents page

**Files:**
- Modify: `PastEvents.tsx` — add "Meet the DJs" + "Meet the Artists" section between events grid and CTA

**Step 1: Add cross-link section**

After the events grid section and before the CTA section, add:

```tsx
{/* Ecosystem Cross-links */}
<section className="relative px-6 md:px-20 py-16 md:py-24 border-t border-[#C42121]/20">
  <div className="max-w-7xl mx-auto">
    <GSAPReveal>
      <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-8">The Circle Ecosystem</p>
    </GSAPReveal>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* DJs link */}
      <GSAPReveal delay={0.1}>
        <button
          onClick={() => handleNav('/djs')}
          className="group w-full text-left border border-[#C42121]/15 hover:border-[#C42121]/40 p-8 md:p-10 transition-all duration-300 cursor-pointer"
        >
          <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-3">Selectors</p>
          <h3 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none group-hover:text-white transition-colors duration-300">
            THE DJS
          </h3>
          <p className="text-sm text-[#C42121]/50 mt-3 leading-relaxed">
            Meet the selectors who curate the sound of every Circle event.
          </p>
          <span className="inline-block mt-6 text-xs font-mono text-[#C42121]/60 group-hover:text-[#C42121] tracking-widest uppercase transition-colors duration-300">
            Explore DJs &rarr;
          </span>
        </button>
      </GSAPReveal>

      {/* Artists link */}
      <GSAPReveal delay={0.2}>
        <button
          onClick={() => handleNav('/artists')}
          className="group w-full text-left border border-[#C42121]/15 hover:border-[#C42121]/40 p-8 md:p-10 transition-all duration-300 cursor-pointer"
        >
          <p className="text-[10px] font-mono text-[#C42121]/40 tracking-[0.2em] uppercase mb-3">Performers</p>
          <h3 className="text-3xl md:text-4xl font-black tracking-tighter uppercase leading-none group-hover:text-white transition-colors duration-300">
            THE ARTISTS
          </h3>
          <p className="text-sm text-[#C42121]/50 mt-3 leading-relaxed">
            Discover the artists who bring live performance to The Circle.
          </p>
          <span className="inline-block mt-6 text-xs font-mono text-[#C42121]/60 group-hover:text-[#C42121] tracking-widest uppercase transition-colors duration-300">
            Explore Artists &rarr;
          </span>
        </button>
      </GSAPReveal>
    </div>
  </div>
</section>
```

Also add a `handleNav` helper at the top of the component (similar to `handleEventClick`):

```tsx
const handleNav = (path: string) => {
  window.scrollTo(0, 0);
  setTimeout(() => navigate(path), 50);
};
```

**Step 2: Commit**

```bash
git add PastEvents.tsx
git commit -m "feat: add DJs and Artists cross-links on Events page"
```

---

### Task 6: Add "View all" links in EventDetail lineup columns

**Files:**
- Modify: `EventDetail.tsx` — add "View all DJs →" and "View all Artists →" links at the bottom of their respective columns

**Step 1: Add navigation links to lineup columns**

After the DJs list (after the `showLegacyLineup` block), add:

```tsx
<button
  onClick={() => { window.scrollTo(0, 0); setTimeout(() => navigate('/djs'), 50); }}
  className="mt-6 text-xs font-mono text-[#C42121]/40 hover:text-[#C42121] tracking-widest uppercase transition-colors cursor-pointer"
>
  View all DJs &rarr;
</button>
```

After the Artists list, add:

```tsx
<button
  onClick={() => { window.scrollTo(0, 0); setTimeout(() => navigate('/artists'), 50); }}
  className="mt-6 text-xs font-mono text-[#C42121]/40 hover:text-[#C42121] tracking-widest uppercase transition-colors cursor-pointer"
>
  View all Artists &rarr;
</button>
```

**Step 2: Commit**

```bash
git add EventDetail.tsx
git commit -m "feat: add View All links to DJ/Artist columns in EventDetail"
```

---

### Task 7: Fix "Next Event" section UX in EventDetail

**Files:**
- Modify: `EventDetail.tsx:444-473` — change ↓ arrow to →, add date/venue context

**Step 1: Update the Next Event section**

Replace the `↓` with `→` and add date/location info:

```tsx
{/* Replace the arrow and add context */}
<div className="text-sm font-mono text-[#C42121]/60 mb-4 tracking-widest">NEXT EVENT</div>
<h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-none uppercase mb-6">
  {nextEvent.title}
</h2>
{nextEvent.event_number && (
  <div className="text-lg md:text-xl font-light text-[#C42121]/80 mb-8">{nextEvent.event_number}</div>
)}
{nextEvent.date && (
  <div className="text-sm font-mono text-[#C42121]/50 mb-8">
    {new Date(nextEvent.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
  </div>
)}
<span className="inline-block text-sm font-mono tracking-widest text-[#C42121] border border-[#C42121]/40 px-6 py-3 group-hover:bg-[#C42121] group-hover:text-black transition-all duration-300 uppercase">
  View Event &rarr;
</span>
```

Also update the select query to include `date` and `venue` fields (they're already there: `id,title,slug,event_number,cover_image_url,date`).

**Step 2: Commit**

```bash
git add EventDetail.tsx
git commit -m "fix: improve Next Event section with arrow and date context"
```

---

### Task 8: Final integration pass — replace all inline footers and wrappers

This is the actual file-by-file replacement from Task 1. After all components are created, go through each page and do the swap.

**Step 1: Update all four pages**

Each page follows this pattern:
- Wrap everything in `<PageShell>` instead of the manual `<div className="min-h-screen ...">` + noise + vignette
- Replace inline `<footer>` with `<Footer />`
- Replace inline `GSAPReveal` with imported `GSAPReveal`

**Step 2: Verify the app loads and all pages render**

Run: `npm run dev` and manually check:
- `/past-events` — events load, cross-links visible, footer has nav
- `/past-events/:slug` — breadcrumb visible, lineup has "View all" links, next event has →
- `/djs` — cards load, profile modal works, footer has nav
- `/artists` — cards load, no green colors, footer has nav
- Click a DJ/Artist → ProfileModal → "Appeared In" → click event → navigates correctly

**Step 3: Commit**

```bash
git add PastEvents.tsx DJs.tsx Artists.tsx EventDetail.tsx
git commit -m "refactor: integrate shared PageShell and Footer across all public pages"
```
