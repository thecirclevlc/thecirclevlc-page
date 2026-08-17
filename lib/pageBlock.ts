import type { PageBlock, PageBlockType } from './database.types';
import type { BlockSpan } from './blockStyle';

/**
 * Making blocks, and telling when one is still empty.
 *
 * Both of these used to live twice — once in the panel and once in the live
 * page editor — and the two copies had drifted: the panel made a text block
 * with empty strings, the live page made one already saying "New section". So
 * the same button produced a different result depending on which screen she
 * happened to be on.
 */

export function uuid(): string {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * A new block, with something in it.
 *
 * Deliberately not empty. An empty block renders nothing, and a block that
 * renders nothing used to leave a band of blank page she could neither see nor
 * click — which is exactly how the client ended up with "un espacio que ya no
 * pude borrar". Starting with placeholder wording means the thing she just
 * added is visibly there, and visibly hers to change or delete.
 */
export function newBlock(type: PageBlockType): PageBlock {
  const id = uuid();
  switch (type) {
    case 'text':    return { id, type, heading: 'New section', body: 'Write here.' };
    case 'image':   return { id, type, url: '', alt: '', caption: '' };
    case 'gallery': return { id, type, heading: '', images: [] };
    case 'video':   return { id, type, heading: '', url: '', caption: '' };
    case 'buttons': return { id, type, heading: '', items: [{ id: uuid(), label: '', url: '', primary: true }] };
    case 'form':    return { id, type, heading: '', form_slug: '' };
  }
}

/**
 * Whether a block would render nothing at all on the public page.
 *
 * THE BUG THIS EXISTS FOR: she adds a Photo, saves before uploading the image,
 * and the page grows 96px on a phone and 160px on a desktop of blank space —
 * because every block painted its band whether or not it had any content to put
 * in it. Invisible, so there was nothing to click to get rid of it, and she
 * reasonably concluded the editor was broken.
 *
 * A block that is empty is skipped entirely for visitors, and drawn as a
 * labelled placeholder while she is editing, so it is obvious and deletable.
 */
export function isBlockEmpty(block: PageBlock): boolean {
  switch (block.type) {
    case 'text':    return !block.heading?.trim() && !block.body?.trim();
    case 'image':   return !block.url?.trim();
    case 'gallery': return (block.images ?? []).filter(Boolean).length === 0;
    // A heading alone is still something to show, so only a video with no
    // address and no heading counts as empty.
    case 'video':   return !block.url?.trim() && !block.heading?.trim();
    case 'buttons': return (block.items ?? []).filter(b => b.label?.trim() && b.url?.trim()).length === 0
                        && !block.heading?.trim();
    case 'form':    return !block.form_slug?.trim();
    // An unknown type comes from a newer version of the panel. It renders
    // nothing here, so treat it as empty rather than leave a mystery gap.
    default:        return true;
  }
}

/**
 * The things she can add, described as layouts rather than as parts.
 *
 * She does not think "a photo block set to half a row followed by a text block
 * set to half a row". She thinks "a photo with a paragraph next to it". Asking
 * her to add two blocks and then set the same option on each — after working
 * out that a row is twelve columns — is the step where she said "no entiendo
 * mucho realmente".
 *
 * So the menu offers the finished arrangement and this does the assembling.
 * The per-block controls stay for anyone who wants to go further; they are just
 * no longer the only way in.
 */
export interface BlockPreset {
  id: string;
  label: string;
  hint: string;
  /** Icon name is chosen by the caller — this file stays free of components. */
  icon: PageBlockType;
  build: () => PageBlock[];
}

const withSpan = (block: PageBlock, span: BlockSpan): PageBlock =>
  ({ ...block, style: { ...block.style, span } });

export const BLOCK_PRESETS: BlockPreset[] = [
  {
    id: 'text', label: 'Text', hint: 'Paragraphs, bullets, bold', icon: 'text',
    build: () => [newBlock('text')],
  },
  {
    id: 'image', label: 'Photo', hint: 'One image, on its own', icon: 'image',
    build: () => [newBlock('image')],
  },
  {
    id: 'photo-text', label: 'Photo + text', hint: 'Photo on the left, words on the right', icon: 'image',
    build: () => [withSpan(newBlock('image'), 'half'), withSpan(newBlock('text'), 'half')],
  },
  {
    id: 'text-photo', label: 'Text + photo', hint: 'Words on the left, photo on the right', icon: 'text',
    build: () => [withSpan(newBlock('text'), 'half'), withSpan(newBlock('image'), 'half')],
  },
  {
    id: 'three-photos', label: 'Three photos', hint: 'Side by side, across the row', icon: 'gallery',
    build: () => [
      withSpan(newBlock('image'), 'third'),
      withSpan(newBlock('image'), 'third'),
      withSpan(newBlock('image'), 'third'),
    ],
  },
  {
    id: 'two-texts', label: 'Two columns', hint: 'Two blocks of text, side by side', icon: 'text',
    build: () => [withSpan(newBlock('text'), 'half'), withSpan(newBlock('text'), 'half')],
  },
  {
    id: 'gallery', label: 'Gallery', hint: 'A grid of photos', icon: 'gallery',
    build: () => [newBlock('gallery')],
  },
  {
    id: 'video', label: 'Video', hint: 'YouTube, Vimeo, SoundCloud', icon: 'video',
    build: () => [newBlock('video')],
  },
  {
    id: 'buttons', label: 'Buttons', hint: 'Links, donations, downloads', icon: 'buttons',
    build: () => [newBlock('buttons')],
  },
  {
    id: 'form', label: 'Form', hint: 'Send people to one of your forms', icon: 'form',
    build: () => [newBlock('form')],
  },
];

/** What to call an empty block while she is editing, so she knows what to do. */
export function emptyBlockHint(block: PageBlock): string {
  switch (block.type) {
    case 'text':    return 'Empty text — click it to write something.';
    case 'image':   return 'No photo yet — add one from the panel, or delete this block.';
    case 'gallery': return 'Empty gallery — add photos from the panel, or delete this block.';
    case 'video':   return 'No video link yet — add one from the panel, or delete this block.';
    case 'buttons': return 'No buttons yet — add one from the panel, or delete this block.';
    case 'form':    return 'No form chosen yet — pick one from the panel, or delete this block.';
    default:        return 'This block has nothing in it. Delete it, or fill it from the panel.';
  }
}
