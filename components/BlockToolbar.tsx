import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUp, ArrowDown, Copy, Trash2, SlidersHorizontal, X, Eye, EyeOff,
} from 'lucide-react';
import {
  DEFAULT_BLOCK_STYLE,
  WIDTH_OPTIONS, ALIGN_OPTIONS, SPACING_OPTIONS, SURFACE_OPTIONS, REVEAL_OPTIONS,
  type BlockStyle,
} from '../lib/blockStyle';

/**
 * The controls that appear over a block while edit mode is on.
 *
 * Sits on the live page rather than in a form, because the point is to see the
 * change land: pick "Roomy" and the section breathes underneath you. A settings
 * screen elsewhere means editing blind and switching tabs to check.
 *
 * Invisible until you hover the block, so the page still reads as the page.
 */

interface Props {
  style: BlockStyle | undefined;
  hidden?: boolean;
  canUp: boolean;
  canDown: boolean;
  onStyle: (next: BlockStyle) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleHidden: () => void;
}

const CHIP = 'px-2.5 py-1.5 rounded text-[11px] leading-none transition-colors cursor-pointer';

function Choice<T extends string>({ label, hint, value, options, onChange }: {
  label: string;
  hint?: string;
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  const active = options.find(o => o.value === value);
  return (
    <div>
      <p className="text-[#666] text-[10px] tracking-[0.14em] uppercase mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map(o => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            title={o.hint}
            className={`${CHIP} ${
              o.value === value
                ? 'bg-white text-black font-medium'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {(active?.hint || hint) && (
        <p className="text-[#555] text-[10px] mt-1.5 leading-relaxed">{active?.hint ?? hint}</p>
      )}
    </div>
  );
}

export default function BlockToolbar({
  style, hidden, canUp, canDown, onStyle, onMove, onDuplicate, onDelete, onToggleHidden,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const s = { ...DEFAULT_BLOCK_STYLE, ...style };
  const set = (patch: Partial<BlockStyle>) => onStyle({ ...style, ...patch });

  // Position the panel next to the button, in page coordinates.
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = 300;
    setPos({
      top: r.bottom + window.scrollY + 8,
      left: Math.max(12, Math.min(r.right + window.scrollX - width, window.innerWidth - width - 12)),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      if (btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const Btn = ({ title, disabled, onClick, children }: {
    title: string; disabled?: boolean; onClick: () => void; children: React.ReactNode;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="w-8 h-8 flex items-center justify-center rounded text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:hover:bg-transparent transition-colors cursor-pointer"
    >
      {children}
    </button>
  );

  return (
    <>
      <div
        className="absolute top-3 right-3 z-30 flex items-center gap-0.5 rounded-lg
                   bg-black/85 backdrop-blur-md border border-white/15 p-1
                   opacity-0 group-hover/block:opacity-100 focus-within:opacity-100 transition-opacity"
      >
        <Btn title="Move up"   disabled={!canUp}   onClick={() => onMove(-1)}><ArrowUp size={14} /></Btn>
        <Btn title="Move down" disabled={!canDown} onClick={() => onMove(1)}><ArrowDown size={14} /></Btn>
        <span className="w-px h-4 bg-white/15 mx-0.5" />
        <button
          ref={btnRef}
          onClick={() => setOpen(o => !o)}
          title="Layout"
          aria-label="Layout"
          aria-expanded={open}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${
            open ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <SlidersHorizontal size={14} />
        </button>
        <Btn title={hidden ? 'Show on the page' : 'Hide without deleting'} onClick={onToggleHidden}>
          {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </Btn>
        <Btn title="Duplicate" onClick={onDuplicate}><Copy size={14} /></Btn>
        <span className="w-px h-4 bg-white/15 mx-0.5" />
        <button
          onClick={onDelete}
          title="Delete"
          aria-label="Delete"
          className="w-8 h-8 flex items-center justify-center rounded text-white/50 hover:text-red-300 hover:bg-red-500/15 transition-colors cursor-pointer"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={panelRef}
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: 300, zIndex: 9999 }}
          className="rounded-xl bg-[#0b0b0b]/97 backdrop-blur-xl border border-white/15 shadow-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-white text-xs tracking-[0.14em] uppercase">Layout</p>
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="text-white/40 hover:text-white transition-colors cursor-pointer">
              <X size={14} />
            </button>
          </div>

          <Choice label="Width"    value={s.width}   options={WIDTH_OPTIONS}   onChange={v => set({ width: v })} />
          <Choice label="Align"    value={s.align}   options={ALIGN_OPTIONS}   onChange={v => set({ align: v })} />
          <Choice label="Spacing"  value={s.spacing} options={SPACING_OPTIONS} onChange={v => set({ spacing: v })} />
          <Choice label="Surface"  value={s.surface} options={SURFACE_OPTIONS} onChange={v => set({ surface: v })} />
          <Choice label="Entrance" value={s.reveal}  options={REVEAL_OPTIONS}  onChange={v => set({ reveal: v })} />

          <p className="text-[#555] text-[10px] leading-relaxed pt-1 border-t border-white/10">
            Changes save as you make them. Scroll the block out of view and back to watch its entrance again.
          </p>
        </div>,
        document.body,
      )}
    </>
  );
}
