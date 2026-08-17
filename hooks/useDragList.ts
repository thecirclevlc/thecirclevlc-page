import { useRef, useState } from 'react';

/**
 * Drag one item of an ordered list onto another.
 *
 * The client asked for "libertad tipo drag de las secciones". The panel and the
 * live page both had ↑ ↓ buttons only, which means moving a section past five
 * others is five clicks and a guess about where it landed.
 *
 * Native HTML5 drag and drop, no library. A drag-and-drop dependency is 30-50kB
 * for behaviour the browser already has, and this list is a handful of items on
 * a page — none of the reasons to reach for one (virtualised lists, nested
 * trees, multi-container transfers) apply here.
 *
 * The ↑ ↓ buttons stay. Drag is not reachable by keyboard, so removing them
 * would take the feature away from anyone not using a mouse.
 */

/** Moves one item, returning a new list. Out-of-range indices leave it alone. */
export function reorder<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const out = list.slice();
  const [moved] = out.splice(from, 1);
  out.splice(to, 0, moved);
  return out;
}

/**
 * Where in the target the block would land.
 *
 * `left` and `right` are what make arranging a page a drag rather than a
 * lesson: drop the photo on the side of the paragraph and they end up side by
 * side, with no menu and nothing to know about columns. The middle two thirds
 * stay plain reordering, so the old gesture still does the old thing.
 */
export type DropZone = 'left' | 'over' | 'right';

/**
 * Which zone of the target the dragged block is over.
 *
 * Measured as *sideways movement since the grab*, not as raw pointer position.
 *
 * THE BUG THIS EXISTS FOR: the grip lives at one edge of a block, so the
 * pointer starts near that edge and stays there when you drag straight down a
 * list. Comparing raw position against the target meant the pointer was always
 * in the same outer third it started in, and every ordinary reorder in the
 * panel came out as "put these two side by side". Dragging straight down now
 * reads as no sideways intent at all, whatever edge the handle sits on.
 */
export function zoneAt(
  clientX: number,
  rect: { left: number; width: number },
  grab?: { offsetX: number; width: number },
): DropZone {
  if (rect.width <= 0) return 'over';
  const here = (clientX - rect.left) / rect.width;
  // Where in its own block she took hold of it. Without a grab we fall back to
  // the block's centre, which is the same thing for a drag that never moved.
  const held = grab && grab.width > 0 ? grab.offsetX / grab.width : 0.5;
  const moved = here - held;
  return moved < -0.25 ? 'left' : moved > 0.25 ? 'right' : 'over';
}

export interface DragList {
  /** Id being dragged, for dimming it while it travels. */
  dragId: string | null;
  /** Id currently under the pointer, for showing where it would land. */
  overId: string | null;
  /** Which part of that target, for showing which side it would land on. */
  overZone: DropZone;
  /**
   * Spread onto the grip. If the grip sits inside an element marked
   * `data-drag-item`, that element becomes the drag preview.
   */
  handleProps: (id: string) => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  /** Spread onto the thing that can be dropped on. */
  targetProps: (id: string) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

export function useDragList(
  onDropped: (fromId: string, toId: string, zone: DropZone) => void,
): DragList {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overZone, setZone] = useState<DropZone>('over');
  // The id also lives in a ref because Safari empties dataTransfer during
  // dragover, and some browsers hand back the wrong type on drop. The ref is
  // the source of truth; dataTransfer is set only to make the drag legal.
  const dragging = useRef<string | null>(null);
  // Where inside its own block she took hold, so a straight-down drag reads as
  // no sideways intent regardless of which edge the handle sits on.
  const grab = useRef<{ offsetX: number; width: number } | undefined>(undefined);

  return {
    dragId,
    overId,
    overZone,
    handleProps: id => ({
      draggable: true,
      onDragStart: e => {
        dragging.current = id;
        setDragId(id);
        const item = (e.currentTarget as HTMLElement).closest('[data-drag-item]')
          ?? (e.currentTarget as HTMLElement).closest('section')
          ?? (e.currentTarget as HTMLElement);
        const r = item.getBoundingClientRect();
        grab.current = { offsetX: e.clientX - r.left, width: r.width };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        // Otherwise the drag preview is the little grip icon on its own, which
        // gives no clue what is being moved. Opt-in per host, because a whole
        // page section is too big to drag around as a ghost.
        const ghost = (e.currentTarget as HTMLElement).closest('[data-drag-item]');
        if (ghost) e.dataTransfer.setDragImage(ghost, 24, 24);
      },
      onDragEnd: () => { dragging.current = null; grab.current = undefined; setDragId(null); setOverId(null); setZone('over'); },
    }),
    targetProps: id => ({
      onDragOver: e => {
        if (!dragging.current || dragging.current === id) return;
        // Both of these are required: without preventDefault the browser
        // refuses the drop and the cursor stays a "no entry" sign.
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const zone = zoneAt(e.clientX, e.currentTarget.getBoundingClientRect(), grab.current);
        if (overId !== id) setOverId(id);
        if (overZone !== zone) setZone(zone);
      },
      onDragLeave: () => setOverId(prev => (prev === id ? null : prev)),
      onDrop: e => {
        // Bail out before preventDefault when this is not one of our drags.
        // These handlers sit on a wrapper containing every input of a block, and
        // cancelling the default action during the bubble phase would stop her
        // dropping selected text into a textarea.
        const from = dragging.current;
        if (!from) return;
        e.preventDefault();
        // Read the zone from this event rather than from state: the last
        // dragover may have been a frame ago, and dropping on the very edge
        // has to land where the indicator said it would.
        const zone = zoneAt(e.clientX, e.currentTarget.getBoundingClientRect(), grab.current);
        dragging.current = null;
        grab.current = undefined;
        setDragId(null);
        setOverId(null);
        setZone('over');
        if (from !== id) onDropped(from, id, zone);
      },
    }),
  };
}
