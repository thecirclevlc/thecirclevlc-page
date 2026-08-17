/**
 * The layout vocabulary for page blocks.
 *
 * Deliberately a small set of named choices, not free numbers. Free numbers
 * are how a site stops looking like itself: give someone a margin field and
 * within a month no two sections line up. Every option here is a step on a
 * scale the design already uses, so any combination still reads as one site.
 *
 * Six decisions per block — how much of the row it takes, measure, alignment,
 * breathing room, surface and how it arrives. That is enough to compose a page
 * and few enough to hold in your head.
 */

export type BlockWidth   = 'narrow' | 'normal' | 'wide' | 'full';
export type BlockSpan    = 'full' | 'two-thirds' | 'half' | 'third';
export type BlockAlign   = 'left' | 'center';
export type BlockSpacing = 'tight' | 'normal' | 'roomy';
export type BlockSurface = 'none' | 'tint' | 'invert' | 'line';
export type BlockReveal  = 'none' | 'fade' | 'rise' | 'words' | 'blur' | 'wipe';

export interface BlockStyle {
  /**
   * How much of its row the block takes. Anything under a whole row sits
   * beside the block next to it — which is the only thing a photo needs in
   * order to end up next to a paragraph instead of above it.
   */
  span?:    BlockSpan;
  width?:   BlockWidth;
  align?:   BlockAlign;
  spacing?: BlockSpacing;
  surface?: BlockSurface;
  reveal?:  BlockReveal;
}

export const DEFAULT_BLOCK_STYLE: Required<BlockStyle> = {
  span: 'full', width: 'normal', align: 'left', spacing: 'normal', surface: 'none', reveal: 'rise',
};

// ── Options, with the wording the client sees ────────────────────

export const SPAN_OPTIONS: { value: BlockSpan; label: string; hint: string }[] = [
  { value: 'full',       label: 'Whole row',  hint: 'Its own band across the page' },
  { value: 'two-thirds', label: 'Two thirds', hint: 'The wide side of a pair — usually the text' },
  { value: 'half',       label: 'Half',       hint: 'Side by side with the block next to it' },
  { value: 'third',      label: 'A third',    hint: 'Three across' },
];

export const WIDTH_OPTIONS: { value: BlockWidth; label: string; hint: string }[] = [
  { value: 'narrow', label: 'Narrow', hint: 'Comfortable for reading' },
  { value: 'normal', label: 'Normal', hint: 'The usual width' },
  { value: 'wide',   label: 'Wide',   hint: 'Roomy, for images' },
  { value: 'full',   label: 'Full',   hint: 'Edge to edge' },
];

export const ALIGN_OPTIONS: { value: BlockAlign; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Centred' },
];

export const SPACING_OPTIONS: { value: BlockSpacing; label: string; hint: string }[] = [
  { value: 'tight',  label: 'Tight',  hint: 'Less air around it, and paragraphs closer together' },
  { value: 'normal', label: 'Normal', hint: 'The standard rhythm' },
  { value: 'roomy',  label: 'Roomy',  hint: 'More air around it, and paragraphs further apart' },
];

export const SURFACE_OPTIONS: { value: BlockSurface; label: string; hint: string }[] = [
  { value: 'none',   label: 'None',       hint: 'Sits on the page background' },
  { value: 'tint',   label: 'Tinted',     hint: 'A faint wash of your colour' },
  { value: 'invert', label: 'Inverted',   hint: 'Your colour as the background' },
  { value: 'line',   label: 'Ruled off',  hint: 'A hairline above it' },
];

export const REVEAL_OPTIONS: { value: BlockReveal; label: string; hint: string }[] = [
  { value: 'none',  label: 'None',        hint: 'Just there' },
  { value: 'fade',  label: 'Fade in',     hint: 'Quiet' },
  { value: 'rise',  label: 'Rise up',     hint: 'The site default' },
  { value: 'words', label: 'Word by word', hint: 'Editorial. Best on short headings' },
  { value: 'blur',  label: 'Focus in',    hint: 'Blurred to sharp' },
  { value: 'wipe',  label: 'Wipe across', hint: 'Bold. Use sparingly' },
];

// ── Class mapping ────────────────────────────────────────────────

const WIDTH_CLASS: Record<BlockWidth, string> = {
  narrow: 'max-w-2xl',
  normal: 'max-w-4xl',
  wide:   'max-w-6xl',
  full:   'max-w-none',
};

const SPACING_CLASS: Record<BlockSpacing, string> = {
  tight:  'py-6 md:py-8',
  normal: 'py-12 md:py-20',
  roomy:  'py-20 md:py-32',
};

const SURFACE_CLASS: Record<BlockSurface, string> = {
  none:   '',
  tint:   'bg-primary/[0.04]',
  invert: 'bg-primary text-black',
  line:   'border-t border-primary/15',
};

/** Twelfths of a row each span takes. The grid is 12 columns wide. */
const SPAN_TWELFTHS: Record<BlockSpan, number> = {
  full: 12, 'two-thirds': 8, half: 6, third: 4,
};

const SPAN_CLASS: Record<BlockSpan, string> = {
  full:         'md:col-span-12',
  'two-thirds': 'md:col-span-8',
  half:         'md:col-span-6',
  third:        'md:col-span-4',
};

/** Gap between blocks sharing a row, on the same scale as their outer air. */
const GAP_CLASS: Record<BlockSpacing, string> = {
  tight:  'gap-5 md:gap-8',
  normal: 'gap-8 md:gap-12',
  roomy:  'gap-10 md:gap-16',
};

/**
 * The span of a block, tolerating anything.
 *
 * `blocks` is JSONB: a value written by a newer version of the panel, or by
 * hand, can be any string at all. An unrecognised one has to fall back rather
 * than reach `SPAN_CLASS[undefined]` and take the page down.
 */
export const spanOf = (style?: BlockStyle): BlockSpan =>
  style?.span && style.span in SPAN_TWELFTHS ? style.span : DEFAULT_BLOCK_STYLE.span;

/**
 * Whether a reveal splits its content into words.
 *
 * Word-by-word only works on plain text: applied to an image or a button row
 * it would tear the markup apart, so callers check this before using it.
 */
export const isWordReveal = (style?: BlockStyle) =>
  (style?.reveal ?? DEFAULT_BLOCK_STYLE.reveal) === 'words';

// ── Rows ─────────────────────────────────────────────────────────
//
// The client: "para poner las fotos al lado de los textos y eliminar los
// espacios vacíos". Every block used to be its own band across the page, so a
// photo could only ever sit *above* a paragraph — and a short photo next to a
// short paragraph became two half-empty bands instead of one full one.
//
// Rather than a new "photo and text" block — which would answer that one
// request and nothing else — a block now says how much of its row it wants.
// Neighbours that fit share a row. Photo beside text is a photo set to half
// followed by a text set to half; three cards is three thirds; and the order
// she drags them into decides which side the photo lands on. No new block
// type, and it composes with everything that already exists.

/**
 * Groups blocks into rows, in order.
 *
 * A whole-row block is always alone. Anything narrower keeps collecting
 * neighbours until the row is full, so 'half' + 'half' pair up but
 * 'two-thirds' + 'half' cannot and the second one starts a new row. This is
 * what makes the layout predictable while dragging: a block can only ever
 * move up into the row above or down into the one below.
 */
export function packRows<T extends { style?: BlockStyle }>(blocks: T[]): T[][] {
  const rows: T[][] = [];
  let row: T[] = [];
  let filled = 0;

  for (const block of blocks) {
    const twelfths = SPAN_TWELFTHS[spanOf(block.style)];

    if (twelfths >= 12) {
      if (row.length) { rows.push(row); row = []; filled = 0; }
      rows.push([block]);
      continue;
    }
    if (filled + twelfths > 12) { rows.push(row); row = []; filled = 0; }
    row.push(block);
    filled += twelfths;
  }

  if (row.length) rows.push(row);
  return rows;
}

/**
 * Twelfths of a row its blocks actually occupy, out of 12.
 *
 * Exists so the panel can point at the empty space rather than leave her to
 * find it on the published page. "Two thirds" alone on a row leaves a third of
 * the width blank, and nothing else in the editor would ever say so.
 */
export const rowFill = (row: { style?: BlockStyle }[]): number =>
  row.reduce((sum, b) => sum + SPAN_TWELFTHS[spanOf(b.style)], 0);

/** The span that divides a row evenly between that many blocks. */
const evenSpan = (count: number): BlockSpan | null =>
  count === 1 ? 'full' : count === 2 ? 'half' : count === 3 ? 'third' : null;

/**
 * Inserts blocks after `afterId`, keeping a multi-block arrangement intact.
 *
 * THE BUG THIS EXISTS FOR: rows are packed greedily from the flat list, so
 * adding the "Photo + text" pair straight after a block that is alone on a
 * half-width row made the *photo* pair up with that block and left the *text*
 * stranded on a row of its own. She clicks "Photo + text" and does not get a
 * photo next to text — which is the entire promise of the button.
 *
 * So the partial row above is closed first, its blocks dividing their row
 * evenly. That is a change to something she already had, but always in the
 * direction she asked for: a block sitting alone on half a row is a block with
 * half a row of blank space next to it, and this fills it.
 */
export function insertBlocks<T extends { id: string; style?: BlockStyle }>(
  list: T[],
  blocks: T[],
  afterId: string | null,
): T[] {
  const found = afterId === null ? -1 : list.findIndex(b => b.id === afterId);
  const at = afterId === null ? 0 : found < 0 ? list.length : found + 1;
  const next = [...list.slice(0, at), ...blocks, ...list.slice(at)];
  if (blocks.length < 2) return next;

  const rowAbove = packRows(list.slice(0, at)).pop();
  if (!rowAbove || rowFill(rowAbove) === 12) return next;

  const span = evenSpan(rowAbove.length);
  if (!span) return next;
  const ids = new Set(rowAbove.map(b => b.id));
  return next.map(b => (ids.has(b.id) ? { ...b, style: { ...b.style, span } } : b));
}

/**
 * Moves one block to sit beside another, and sets both spans so they fit.
 *
 * This is the answer to the client's "no entiendo cómo sería el mover la
 * organización para que el texto se mueva y de otro lado esté una imagen".
 * Asking her to open a menu on two separate blocks and pick "Half" on each —
 * having first understood that a row is twelve columns — is not something
 * anyone should have to learn. Dragging the photo onto the side of the
 * paragraph is the whole gesture, and this works out the arithmetic.
 *
 * The rule is one sentence: everything that ends up sharing the row divides it
 * evenly. Two blocks are halves, three are thirds. A fourth will not fit, so
 * the drop is refused and the list comes back untouched rather than silently
 * doing something else.
 */
export function placeBeside<T extends { id: string; style?: BlockStyle }>(
  list: T[],
  fromId: string,
  toId: string,
  side: 'left' | 'right',
): T[] {
  const from = list.findIndex(b => b.id === fromId);
  const to   = list.findIndex(b => b.id === toId);
  if (from < 0 || to < 0 || fromId === toId) return list;

  const rows = packRows(list);
  // Whoever already shares the target's row comes along: dropping a third
  // photo beside a pair makes all three thirds, not a pair plus an orphan.
  const targetRow = rows.find(row => row.some(b => b.id === toId)) ?? [];
  const sourceRow = rows.find(row => row.some(b => b.id === fromId)) ?? [];
  const group = [...targetRow.filter(b => b.id !== fromId), list[from]];

  const span = evenSpan(group.length);
  if (!span) return list;
  const groupIds = new Set(group.map(b => b.id));

  // THE BUG THIS GUARDS: the blocks the dragged one leaves behind have to close
  // up too. Rows are packed greedily over the flat list, so a row left one slot
  // short swallows the next block along — and dragging a photo across the page
  // silently dragged a *different* section up into the hole behind it. She
  // would have watched two blocks move when she moved one.
  const orphans     = sourceRow.filter(b => b.id !== fromId && !groupIds.has(b.id));
  const orphanSpan  = orphans.length ? evenSpan(orphans.length) : null;
  const orphanIds   = new Set(orphans.map(b => b.id));

  const moved = list[from];
  const rest  = list.filter(b => b.id !== fromId);
  const at    = rest.findIndex(b => b.id === toId);
  const next  = [...rest.slice(0, side === 'left' ? at : at + 1), moved,
                 ...rest.slice(side === 'left' ? at : at + 1)];

  return next.map(b =>
    groupIds.has(b.id) ? { ...b, style: { ...b.style, span } }
    : orphanSpan && orphanIds.has(b.id) ? { ...b, style: { ...b.style, span: orphanSpan } }
    : b);
}

/** Whether `placeBeside` would actually do something, so the UI can say so. */
export function canPlaceBeside<T extends { id: string; style?: BlockStyle }>(
  list: T[], fromId: string, toId: string,
): boolean {
  if (fromId === toId) return false;
  const row = packRows(list).find(r => r.some(b => b.id === toId));
  if (!row) return false;
  return evenSpan(row.filter(b => b.id !== fromId).length + 1) !== null;
}

/**
 * Takes a block out of the row it shares and gives it the full width back.
 *
 * The way out has to be as easy as the way in, or a layout she made by accident
 * is a layout she is stuck with.
 *
 * It also *moves* — down to just past its old row. Re-spanning in place was not
 * enough: pulling the middle block out of three-across left the outer two as
 * halves with the full-width block still sitting between them, so neither could
 * reach the other and the page ended up with two half-empty rows instead of one
 * tidy one.
 */
export function separate<T extends { id: string; style?: BlockStyle }>(
  list: T[],
  id: string,
): T[] {
  const row = packRows(list).find(r => r.some(b => b.id === id));
  if (!row) return list;

  const staying    = row.filter(b => b.id !== id);
  const span       = staying.length ? evenSpan(staying.length) : null;
  const stayingIds = new Set(staying.map(b => b.id));
  // Anchored to the last block that STAYS, not the last of the row — the block
  // being pulled out is often that one, and looking for it after removing it
  // sent the section to the very bottom of the page.
  const anchor     = staying.length ? staying[staying.length - 1].id : null;

  const original = list[list.findIndex(b => b.id === id)];
  const me   = { ...original, style: { ...original.style, span: 'full' as BlockSpan } };
  const rest = list.filter(b => b.id !== id);
  const at   = anchor === null ? -1 : rest.findIndex(b => b.id === anchor);
  const next = at < 0
    ? list.map(b => (b.id === id ? me : b))   // alone on its row: nothing to move past
    : [...rest.slice(0, at + 1), me, ...rest.slice(at + 1)];

  return next.map(b =>
    span && stayingIds.has(b.id) ? { ...b, style: { ...b.style, span } } : b);
}

/**
 * Removes a block and closes up the row it leaves behind.
 *
 * Deleting one half of a "photo + text" pair used to leave the survivor at half
 * width with a permanently blank half-row beside it — the exact empty space the
 * client asked to be rid of, reintroduced by the delete button.
 */
export function removeBlock<T extends { id: string; style?: BlockStyle }>(
  list: T[],
  id: string,
): T[] {
  const row = packRows(list).find(r => r.some(b => b.id === id));
  const staying = (row ?? []).filter(b => b.id !== id);
  const span = staying.length ? evenSpan(staying.length) : null;
  const stayingIds = new Set(staying.map(b => b.id));

  return list
    .filter(b => b.id !== id)
    .map(b => (span && stayingIds.has(b.id) ? { ...b, style: { ...b.style, span } } : b));
}

export interface RowLayout {
  /** Outer band: side padding, vertical air, and the surface of a lone block. */
  band: string;
  /** Inner container: the measure, and the grid the cells sit in. */
  grid: string;
  /** One entry per block in the row, in the same order. */
  cells: { outer: string; inner: string }[];
}

/**
 * The classes for one packed row.
 *
 * The row — not the block — owns the side padding and the vertical air: two
 * blocks side by side have to breathe as one unit, or a seam opens down the
 * middle of the page. They come from the first block in the row, the same way
 * its measure does. A lone block is the first block in its own row, so for
 * every page already built this is exactly the band it has always had.
 *
 * Surface is the one thing that stays per block, so one side of a pair can be
 * tinted on its own. A lone block's surface still covers the whole band.
 */
export function rowLayout(row: { style?: BlockStyle }[]): RowLayout {
  const lead   = row[0]?.style;
  const s      = { ...DEFAULT_BLOCK_STYLE, ...lead };
  const shared = row.length > 1 || spanOf(lead) !== 'full';

  // A reading measure holding two columns is too tight to read either. So an
  // untouched width means 'wide' once a row is shared — while a width she
  // actually chose is always honoured.
  const width = shared ? (lead?.width ?? 'wide') : s.width;

  // A tinted or inverted cell is a visible box, and boxes sharing a row have to
  // match height — the grid default. Centring them instead leaves two panels of
  // different heights floating against each other, which looks like a mistake
  // rather than a choice.
  const boxed = row.some(b => ({ ...DEFAULT_BLOCK_STYLE, ...b.style }).surface !== 'none');

  return {
    band: [
      'relative',
      width === 'full' ? 'px-0' : 'px-5 md:px-20',
      SPACING_CLASS[s.spacing],
      shared ? '' : SURFACE_CLASS[s.surface],
    ].filter(Boolean).join(' '),

    grid: [
      WIDTH_CLASS[width],
      'mx-auto',
      // One block needs no grid; more than one gets twelve columns to divide.
      shared ? `grid grid-cols-1 md:grid-cols-12 ${GAP_CLASS[s.spacing]}` : '',
      // A bare pair reads best centred against each other — that is the "photo
      // beside text" case, and centring is what closes the gap a short
      // paragraph would otherwise leave. Three or more are cards, and cards
      // line up along their tops.
      row.length < 2 || boxed ? '' : row.length === 2 ? 'md:items-center' : 'md:items-start',
    ].filter(Boolean).join(' '),

    cells: row.map(block => {
      const cell    = { ...DEFAULT_BLOCK_STYLE, ...block.style };
      const surface = shared ? SURFACE_CLASS[cell.surface] : '';
      return {
        // `min-w-0`, or one long unbroken word in a column widens the whole
        // grid and shoves its neighbour off the page.
        outer: [
          shared ? `${SPAN_CLASS[spanOf(block.style)]} min-w-0` : '',
          surface ? `${surface} p-6 md:p-8` : '',
        ].filter(Boolean).join(' '),
        inner: cell.align === 'center' ? 'text-center' : '',
      };
    }),
  };
}
