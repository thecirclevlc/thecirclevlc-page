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

export interface DragList {
  /** Id being dragged, for dimming it while it travels. */
  dragId: string | null;
  /** Id currently under the pointer, for showing where it would land. */
  overId: string | null;
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

export function useDragList(onDropped: (fromId: string, toId: string) => void): DragList {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // The id also lives in a ref because Safari empties dataTransfer during
  // dragover, and some browsers hand back the wrong type on drop. The ref is
  // the source of truth; dataTransfer is set only to make the drag legal.
  const dragging = useRef<string | null>(null);

  return {
    dragId,
    overId,
    handleProps: id => ({
      draggable: true,
      onDragStart: e => {
        dragging.current = id;
        setDragId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        // Otherwise the drag preview is the little grip icon on its own, which
        // gives no clue what is being moved. Opt-in per host, because a whole
        // page section is too big to drag around as a ghost.
        const ghost = (e.currentTarget as HTMLElement).closest('[data-drag-item]');
        if (ghost) e.dataTransfer.setDragImage(ghost, 24, 24);
      },
      onDragEnd: () => { dragging.current = null; setDragId(null); setOverId(null); },
    }),
    targetProps: id => ({
      onDragOver: e => {
        if (!dragging.current || dragging.current === id) return;
        // Both of these are required: without preventDefault the browser
        // refuses the drop and the cursor stays a "no entry" sign.
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (overId !== id) setOverId(id);
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
        dragging.current = null;
        setDragId(null);
        setOverId(null);
        if (from !== id) onDropped(from, id);
      },
    }),
  };
}
