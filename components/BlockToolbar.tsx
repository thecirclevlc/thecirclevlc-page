import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUp, ArrowDown, Copy, Trash2, SlidersHorizontal, X, Eye, EyeOff, GripVertical, Rows3,
} from 'lucide-react';
import BlockLayoutControls from './BlockLayoutControls';
import { type BlockStyle } from '../lib/blockStyle';

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
  /** Spread from useDragList. Absent means this host has no drag. */
  dragHandleProps?: React.HTMLAttributes<HTMLElement> & { draggable?: true };
  /**
   * Whether the layout panel is open. Held by the parent, not here: changing a
   * block's share of the row repacks the rows, which remounts this component,
   * and local state would close the panel she is in the middle of using.
   */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Given when this block shares its row. Taking it back out has to be one
   * click too, or a row she made by dragging something a bit too far to the
   * left is a row she is stuck with.
   */
  onSeparate?: () => void;
}

export default function BlockToolbar({
  style, hidden, canUp, canDown, onStyle, onMove, onDuplicate, onDelete, onToggleHidden,
  dragHandleProps, open, onOpenChange, onSeparate,
}: Props) {
  const setOpen = onOpenChange;
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Position the panel next to the button, in page coordinates.
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const width = 320;
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
      {/* Above the block, not inside it. It used to float in the band's 80px of
          side padding; now that the band belongs to the whole row, `top-3` would
          sit on top of the content — over the top of a photo, exactly where she
          is looking. */}
      <div
        className={`absolute bottom-full right-0 mb-1 z-30 flex items-center gap-0.5 rounded-lg
                   bg-black/85 backdrop-blur-md border border-white/15 p-1 transition-opacity ${
                     open ? 'opacity-100' : 'opacity-0 group-hover/block:opacity-100 focus-within:opacity-100'
                   }`}
      >
        {dragHandleProps && (
          <span
            {...dragHandleProps}
            title="Drag to move this block"
            aria-label="Drag to move this block"
            className="w-7 h-8 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-grab active:cursor-grabbing"
          >
            <GripVertical size={14} />
          </span>
        )}
        <Btn title="Move up"   disabled={!canUp}   onClick={() => onMove(-1)}><ArrowUp size={14} /></Btn>
        <Btn title="Move down" disabled={!canDown} onClick={() => onMove(1)}><ArrowDown size={14} /></Btn>
        <span className="w-px h-4 bg-white/15 mx-0.5" />
        <button
          ref={btnRef}
          onClick={() => setOpen(!open)}
          title="Layout"
          aria-label="Layout"
          aria-expanded={open}
          className={`w-8 h-8 flex items-center justify-center rounded transition-colors cursor-pointer ${
            open ? 'bg-white text-black' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <SlidersHorizontal size={14} />
        </button>
        {onSeparate && (
          <Btn title="Give this block its own row again" onClick={onSeparate}>
            <Rows3 size={14} />
          </Btn>
        )}
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
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: 320, zIndex: 9999 }}
          className="rounded-xl bg-[#0b0b0b]/97 backdrop-blur-xl border border-white/15 shadow-2xl p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-white text-xs tracking-[0.14em] uppercase">Layout</p>
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="text-white/40 hover:text-white transition-colors cursor-pointer">
              <X size={14} />
            </button>
          </div>

          <BlockLayoutControls style={style} onStyle={onStyle} />

          <p className="text-[#555] text-[10px] leading-relaxed pt-1 border-t border-white/10">
            Changes save as you make them. Scroll the block out of view and back to watch its entrance again.
          </p>
        </div>,
        document.body,
      )}
    </>
  );
}
