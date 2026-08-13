/**
 * The layout vocabulary for page blocks.
 *
 * Deliberately a small set of named choices, not free numbers. Free numbers
 * are how a site stops looking like itself: give someone a margin field and
 * within a month no two sections line up. Every option here is a step on a
 * scale the design already uses, so any combination still reads as one site.
 *
 * Five decisions per block — measure, alignment, breathing room, surface and
 * how it arrives. That is enough to compose a page and few enough to hold in
 * your head.
 */

export type BlockWidth   = 'narrow' | 'normal' | 'wide' | 'full';
export type BlockAlign   = 'left' | 'center';
export type BlockSpacing = 'tight' | 'normal' | 'roomy';
export type BlockSurface = 'none' | 'tint' | 'invert' | 'line';
export type BlockReveal  = 'none' | 'fade' | 'rise' | 'words' | 'blur' | 'wipe';

export interface BlockStyle {
  width?:   BlockWidth;
  align?:   BlockAlign;
  spacing?: BlockSpacing;
  surface?: BlockSurface;
  reveal?:  BlockReveal;
}

export const DEFAULT_BLOCK_STYLE: Required<BlockStyle> = {
  width: 'normal', align: 'left', spacing: 'normal', surface: 'none', reveal: 'rise',
};

// ── Options, with the wording the client sees ────────────────────

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

export const SPACING_OPTIONS: { value: BlockSpacing; label: string }[] = [
  { value: 'tight',  label: 'Tight' },
  { value: 'normal', label: 'Normal' },
  { value: 'roomy',  label: 'Roomy' },
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

/** Outer section classes — the band across the page. */
export function sectionClasses(style?: BlockStyle): string {
  const s = { ...DEFAULT_BLOCK_STYLE, ...style };
  const surface =
    s.surface === 'tint'   ? 'bg-primary/[0.04]'
    : s.surface === 'invert' ? 'bg-primary text-black'
    : s.surface === 'line'  ? 'border-t border-primary/15'
    : '';
  const padding = s.width === 'full' ? 'px-0' : 'px-5 md:px-20';
  return `relative ${padding} ${SPACING_CLASS[s.spacing]} ${surface}`.trim();
}

/** Inner container — the measure the content is set to. */
export function contentClasses(style?: BlockStyle): string {
  const s = { ...DEFAULT_BLOCK_STYLE, ...style };
  const align = s.align === 'center' ? 'text-center mx-auto' : 'mx-auto';
  return `${WIDTH_CLASS[s.width]} ${align}`.trim();
}

/**
 * Whether a reveal splits its content into words.
 *
 * Word-by-word only works on plain text: applied to an image or a button row
 * it would tear the markup apart, so callers check this before using it.
 */
export const isWordReveal = (style?: BlockStyle) =>
  (style?.reveal ?? DEFAULT_BLOCK_STYLE.reveal) === 'words';
