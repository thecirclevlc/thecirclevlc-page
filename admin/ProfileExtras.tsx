import React from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { embedUrl } from '../lib/embedUrl';
import {
  PROFILE_SOCIAL_KEYS,
  type ProfileVideo, type ProfileLink, type ProfileFact, type SocialLinks,
} from '../lib/database.types';

/**
 * The three editors the client asked for on artist and DJ profiles —
 * "anadir botones, anadir videos, crear nuevas informaciones" — plus the
 * full set of social platforms.
 *
 * Shared by AdminDJForm and AdminArtistForm so the two profile forms stay
 * identical. They had drifted apart before, which is why she experienced
 * artists as the poor relation of DJs.
 */

const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors';
const LABEL = 'block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5';
const CARD  = 'bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4';

function uuid() {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function move<T>(arr: T[], idx: number, dir: -1 | 1): T[] {
  const j = idx + dir;
  if (j < 0 || j >= arr.length) return arr;
  const out = arr.slice();
  [out[idx], out[j]] = [out[j], out[idx]];
  return out;
}

function RowButtons({ onUp, onDown, onDelete, canUp, canDown }: {
  onUp: () => void; onDown: () => void; onDelete: () => void; canUp: boolean; canDown: boolean;
}) {
  return (
    <div className="flex gap-1 flex-shrink-0">
      <button type="button" onClick={onUp} disabled={!canUp}
        className="w-9 h-9 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
        aria-label="Move up"><ArrowUp size={13} /></button>
      <button type="button" onClick={onDown} disabled={!canDown}
        className="w-9 h-9 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
        aria-label="Move down"><ArrowDown size={13} /></button>
      <button type="button" onClick={onDelete}
        className="w-9 h-9 flex items-center justify-center rounded text-[#666] hover:text-red-400 hover:bg-red-950/30 transition-colors"
        aria-label="Remove"><Trash2 size={13} /></button>
    </div>
  );
}

const AddButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button type="button" onClick={onClick}
    className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors">
    <Plus size={12} /> {label}
  </button>
);

// ── Videos ────────────────────────────────────────────────────────

export function VideosEditor({ videos, onChange }: {
  videos: ProfileVideo[];
  onChange: (next: ProfileVideo[]) => void;
}) {
  const list = videos ?? [];
  return (
    <section className={CARD}>
      <div>
        <p className="text-white text-sm font-medium">Videos</p>
        <p className="text-[#555] text-xs mt-1">
          Paste the address from the browser bar. YouTube, Vimeo, SoundCloud and Mixcloud all work.
        </p>
      </div>

      {list.map((v, i) => (
        <div key={v.id} className="flex flex-wrap gap-2 items-end">
          <div className="flex-[2] min-w-[220px]">
            <label className={LABEL}>Link</label>
            <input className={INPUT} value={v.url}
              onChange={e => onChange(list.map(x => x.id === v.id ? { ...x, url: e.target.value } : x))}
              placeholder="https://www.youtube.com/watch?v=…" />
            {v.url && !embedUrl(v.url) && (
              <p className="text-amber-500/80 text-xs mt-1">Cannot be embedded — will show as a plain link.</p>
            )}
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className={LABEL}>Title (optional)</label>
            <input className={INPUT} value={v.title ?? ''}
              onChange={e => onChange(list.map(x => x.id === v.id ? { ...x, title: e.target.value } : x))} />
          </div>
          <RowButtons
            onUp={() => onChange(move(list, i, -1))}
            onDown={() => onChange(move(list, i, 1))}
            onDelete={() => onChange(list.filter(x => x.id !== v.id))}
            canUp={i > 0} canDown={i < list.length - 1}
          />
        </div>
      ))}

      <AddButton label="Add video" onClick={() => onChange([...list, { id: uuid(), url: '', title: '' }])} />
    </section>
  );
}

// ── Buttons ───────────────────────────────────────────────────────

export function LinksEditor({ links, onChange }: {
  links: ProfileLink[];
  onChange: (next: ProfileLink[]) => void;
}) {
  const list = links ?? [];
  return (
    <section className={CARD}>
      <div>
        <p className="text-white text-sm font-medium">Buttons</p>
        <p className="text-[#555] text-xs mt-1">
          Anything you want people to click: book me, buy tickets, donate, download.
        </p>
      </div>

      {list.map((l, i) => (
        <div key={l.id} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className={LABEL}>Button text</label>
            <input className={INPUT} value={l.label}
              onChange={e => onChange(list.map(x => x.id === l.id ? { ...x, label: e.target.value } : x))}
              placeholder="Book me" />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className={LABEL}>Where it goes</label>
            <input className={INPUT} value={l.url}
              onChange={e => onChange(list.map(x => x.id === l.id ? { ...x, url: e.target.value } : x))}
              placeholder="https://… or /form" />
          </div>
          <label className="flex items-center gap-2 text-xs text-[#ccc] py-2.5 cursor-pointer">
            <input type="checkbox" checked={l.primary ?? false}
              onChange={e => onChange(list.map(x => x.id === l.id ? { ...x, primary: e.target.checked } : x))}
              className="w-4 h-4 accent-[#059669]" />
            Loud
          </label>
          <RowButtons
            onUp={() => onChange(move(list, i, -1))}
            onDown={() => onChange(move(list, i, 1))}
            onDelete={() => onChange(list.filter(x => x.id !== l.id))}
            canUp={i > 0} canDown={i < list.length - 1}
          />
        </div>
      ))}

      <AddButton label="Add button" onClick={() => onChange([...list, { id: uuid(), label: '', url: '' }])} />
    </section>
  );
}

// ── Free-form info ────────────────────────────────────────────────

export function FactsEditor({ facts, onChange }: {
  facts: ProfileFact[];
  onChange: (next: ProfileFact[]) => void;
}) {
  const list = facts ?? [];
  return (
    <section className={CARD}>
      <div>
        <p className="text-white text-sm font-medium">Extra information</p>
        <p className="text-[#555] text-xs mt-1">
          Add any detail this profile needs — you choose both the label and the value.
          For example "Label" → "Circle Records", or "Available for" → "Club nights, festivals".
        </p>
      </div>

      {list.map((f, i) => (
        <div key={f.id} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <label className={LABEL}>Label</label>
            <input className={INPUT} value={f.label}
              onChange={e => onChange(list.map(x => x.id === f.id ? { ...x, label: e.target.value } : x))}
              placeholder="Label" />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className={LABEL}>Value</label>
            <input className={INPUT} value={f.value}
              onChange={e => onChange(list.map(x => x.id === f.id ? { ...x, value: e.target.value } : x))}
              placeholder="Circle Records" />
          </div>
          <RowButtons
            onUp={() => onChange(move(list, i, -1))}
            onDown={() => onChange(move(list, i, 1))}
            onDelete={() => onChange(list.filter(x => x.id !== f.id))}
            canUp={i > 0} canDown={i < list.length - 1}
          />
        </div>
      ))}

      <AddButton label="Add information" onClick={() => onChange([...list, { id: uuid(), label: '', value: '' }])} />
    </section>
  );
}

// ── Social links (all ten platforms) ──────────────────────────────

export function SocialsEditor({ socials, onChange }: {
  socials: SocialLinks;
  onChange: (next: SocialLinks) => void;
}) {
  const value = socials ?? {};
  return (
    <section className={CARD}>
      <p className="text-white text-sm font-medium">Social links</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PROFILE_SOCIAL_KEYS.map(s => (
          <div key={s.key}>
            <label className={LABEL}>{s.label}</label>
            <input
              className={INPUT}
              value={(value as Record<string, string>)[s.key] ?? ''}
              onChange={e => onChange({ ...value, [s.key]: e.target.value })}
              placeholder={s.key === 'email' ? 'name@example.com' : 'https://…'}
            />
          </div>
        ))}
      </div>
      <p className="text-[#444] text-xs">Leave a field empty and it will not appear on the profile.</p>
    </section>
  );
}
