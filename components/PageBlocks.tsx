import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LegalBody from './LegalBody';
import ImageLightbox from './ImageLightbox';
import ProfileGallery from './ProfileGallery';
import BlockReveal, { SplitWords } from './BlockReveal';
import BlockToolbar from './BlockToolbar';
import EditableText from './EditableText';
import { useEditMode } from '../contexts/EditModeContext';
import { sectionClasses, contentClasses, isWordReveal, type BlockStyle } from '../lib/blockStyle';
import { supabase } from '../lib/supabase';
import { embedUrl } from '../lib/embedUrl';
import { formPath, ratioClass, type PageBlock } from '../lib/database.types';

/**
 * Renders one block of an admin-built page.
 *
 * Blocks are live-editable, exactly like the home page: with edit mode on, the
 * client clicks any heading or paragraph and changes it in place. Until now
 * that only worked for text stored in `site_settings`, so the moment she made
 * a page of her own she lost the feature and had to go back to the panel for
 * every word.
 *
 * Every branch is defensive about missing content: she edits these live, so a
 * half-filled block is a normal state, not an error. A block with nothing in
 * it renders nothing rather than an empty box on the public site.
 */

interface BlocksProps {
  blocks: PageBlock[];
  /** Row id of the page these blocks belong to; enables live editing. */
  pageId?: string;
  onBlocksChange?: (next: PageBlock[]) => void;
}

const objectPosition = (focus?: string) =>
  focus && focus !== 'center' ? focus : 'center';

function BlockHeading({ text, style }: { text?: string; style?: BlockStyle }) {
  if (!text) return null;
  return (
    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary mb-8">
      {isWordReveal(style) ? <SplitWords text={text} /> : text}
    </h2>
  );
}

function TextBlock({ block, edit }: {
  block: Extract<PageBlock, { type: 'text' }>;
  edit?: (field: string, value: string, label: string) => React.ComponentProps<typeof EditableText>['persist'];
}) {
  if (!block.body?.trim() && !block.heading?.trim() && !edit) return null;
  return (
    <>
      {(block.heading || edit) && (
        <EditableText
          as="h2"
          contentKey="page_block"
          field="heading"
          label="Page · Section heading"
          value={block.heading ?? ''}
          onSave={() => {}}
          persist={edit?.('heading', block.heading ?? '', 'heading')}
          className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary mb-8 block"
        />
      )}
      {(block.body?.trim() || edit) && (
        <div className="max-w-3xl text-fg/80 text-base md:text-lg leading-relaxed">
          {edit ? (
            <EditableText
              as="div"
              contentKey="page_block"
              field="body"
              label="Page · Text"
              value={block.body ?? ''}
              onSave={() => {}}
              persist={edit('body', block.body ?? '', 'body')}
              multiline
            >
              <LegalBody body={block.body} spacing={block.style?.spacing} />
            </EditableText>
          ) : (
            /* Reuses the renderer the legal pages already use: paragraphs,
               `- ` bullets and **bold**. One formatting dialect site-wide. */
            <LegalBody body={block.body} spacing={block.style?.spacing} />
          )}
        </div>
      )}
    </>
  );
}

function ImageBlock({ block }: { block: Extract<PageBlock, { type: 'image' }> }) {
  const [open, setOpen] = useState(false);
  if (!block.url) return null;
  const fit   = block.display?.fit ?? 'cover';
  const shape = ratioClass(block.display?.ratio);
  return (
    <figure className="max-w-4xl">
      <button
        onClick={() => setOpen(true)}
        className={`block w-full cursor-zoom-in group overflow-hidden bg-black ${shape}`}
        aria-label={block.alt || 'Enlarge image'}
      >
        <img
          src={block.url}
          alt={block.alt ?? ''}
          loading="lazy"
          decoding="async"
          className={shape
            ? `w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`
            : 'w-full h-auto'}
          style={{ objectPosition: objectPosition(block.display?.focus) }}
        />
      </button>
      <span className="block border border-primary/15 -mt-px pointer-events-none" />
      {block.caption && (
        <figcaption className="mt-3 text-xs font-mono text-fg/40 tracking-wider uppercase">
          {block.caption}
        </figcaption>
      )}
      <ImageLightbox images={[block.url]} initialIndex={0} isOpen={open} onClose={() => setOpen(false)} />
    </figure>
  );
}

function GalleryBlock({ block }: { block: Extract<PageBlock, { type: 'gallery' }> }) {
  const images = (block.images ?? []).filter(Boolean);
  if (images.length === 0) return null;
  // Same gallery as the artist and DJ profiles — one look across the site.
  return <ProfileGallery images={images} label={block.heading || 'Gallery'} />;
}

function VideoBlock({ block }: { block: Extract<PageBlock, { type: 'video' }> }) {
  const embed = embedUrl(block.url ?? '');
  if (!embed) {
    // Not embeddable — but she typed *something*, so surface it as a link
    // instead of swallowing it. Silently dropping her content is how she
    // ends up thinking the panel is broken.
    return block.url ? (
      <>
        <BlockHeading text={block.heading} style={block.style} />
        <a href={block.url} target="_blank" rel="noopener noreferrer"
           className="text-primary underline underline-offset-4 hover:text-fg transition-colors break-all">
          {block.url}
        </a>
      </>
    ) : null;
  }
  return (
    <>
      <BlockHeading text={block.heading} style={block.style} />
      <div className="max-w-4xl">
        <div className="relative w-full aspect-video border border-primary/15 bg-black">
          {embed.kind === 'iframe' ? (
            <iframe
              src={embed.src}
              title={embed.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <video src={embed.src} controls playsInline className="absolute inset-0 w-full h-full object-contain" />
          )}
        </div>
        {block.caption && (
          <p className="mt-3 text-xs font-mono text-fg/40 tracking-wider uppercase">{block.caption}</p>
        )}
      </div>
    </>
  );
}

function ButtonsBlock({ block }: { block: Extract<PageBlock, { type: 'buttons' }> }) {
  const navigate = useNavigate();
  const items = (block.items ?? []).filter(b => b.label?.trim() && b.url?.trim());
  if (items.length === 0) return null;

  const go = (url: string) => {
    if (/^https?:\/\//i.test(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    // Anything else is an internal path. Donation links are just external URLs
    // (PayPal, Ko-fi, a Stripe payment link) — which is why "donations" needs
    // no payment code at all.
    window.scrollTo(0, 0);
    navigate(url.startsWith('/') ? url : `/${url}`);
  };

  return (
    <>
      <BlockHeading text={block.heading} style={block.style} />
      <div className="flex flex-col sm:flex-row flex-wrap gap-4">
        {items.map(b => (
          <button
            key={b.id}
            onClick={() => go(b.url)}
            className={b.primary
              ? 'w-full sm:w-auto bg-primary text-black font-black text-lg md:text-xl py-5 px-12 uppercase tracking-widest hover:opacity-80 transition-opacity cursor-pointer'
              : 'w-full sm:w-auto border border-primary/40 text-primary px-8 py-4 text-sm font-mono tracking-widest uppercase hover:bg-primary hover:text-black transition-colors cursor-pointer'}
          >
            {b.label}
          </button>
        ))}
      </div>
    </>
  );
}

function FormBlock({ block }: { block: Extract<PageBlock, { type: 'form' }> }) {
  const navigate = useNavigate();
  if (!block.form_slug) return null;
  return (
    <>
      <BlockHeading text={block.heading} style={block.style} />
      <button
        onClick={() => { window.scrollTo(0, 0); navigate(formPath(block.form_slug)); }}
        className="bg-primary text-black font-black text-lg md:text-xl py-5 px-12 uppercase tracking-widest hover:opacity-80 transition-opacity cursor-pointer"
      >
        Open form
      </button>
    </>
  );
}

/** A new block, with the site's defaults already applied. */
function newBlock(type: PageBlock['type']): PageBlock {
  const id = (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
    ?? Math.random().toString(36).slice(2);
  const base = { id, style: {} as BlockStyle };
  switch (type) {
    case 'text':    return { ...base, type, heading: 'New section', body: 'Write here.' };
    case 'image':   return { ...base, type, url: '', alt: '', caption: '' };
    case 'gallery': return { ...base, type, heading: '', images: [] };
    case 'video':   return { ...base, type, heading: '', url: '', caption: '' };
    case 'buttons': return { ...base, type, heading: '', items: [] };
    case 'form':    return { ...base, type, heading: '', form_slug: '' };
  }
}

const ADD_TYPES: { type: PageBlock['type']; label: string }[] = [
  { type: 'text',    label: 'Text' },
  { type: 'image',   label: 'Photo' },
  { type: 'gallery', label: 'Gallery' },
  { type: 'video',   label: 'Video' },
  { type: 'buttons', label: 'Buttons' },
  { type: 'form',    label: 'Form' },
];

/**
 * The thin strip between blocks that adds a new one.
 *
 * Nearly invisible until you approach it — the page has to stay readable while
 * being edited, or she cannot judge what she is making.
 */
function AddBlockRail({ onAdd }: { onAdd: (t: PageBlock['type']) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative h-8 group/rail flex items-center justify-center px-5">
      <span className="absolute inset-x-5 h-px bg-primary/15 group-hover/rail:bg-primary/40 transition-colors" />
      {open ? (
        <div className="relative z-20 flex flex-wrap gap-1 rounded-lg bg-black/90 backdrop-blur-md border border-white/15 p-1">
          {ADD_TYPES.map(t => (
            <button
              key={t.type}
              onClick={() => { onAdd(t.type); setOpen(false); }}
              className="px-3 py-1.5 rounded text-[11px] text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              {t.label}
            </button>
          ))}
          <button onClick={() => setOpen(false)} aria-label="Cancel"
            className="px-2 py-1.5 rounded text-[11px] text-white/40 hover:text-white transition-colors cursor-pointer">
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="relative z-20 w-7 h-7 rounded-full bg-black/80 border border-primary/40 text-primary
                     flex items-center justify-center opacity-0 group-hover/rail:opacity-100 focus:opacity-100
                     transition-opacity cursor-pointer"
          aria-label="Add a block here"
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  );
}

export default function PageBlocks({ blocks, pageId, onBlocksChange }: BlocksProps) {
  const { editMode } = useEditMode();
  const editing = Boolean(pageId) && editMode;

  /** Writes the whole block list back, re-reading first so edits cannot clobber. */
  const write = useCallback(async (mutate: (current: PageBlock[]) => PageBlock[]) => {
    if (!pageId) return;
    const { data } = await supabase.from('pages').select('blocks').eq('id', pageId).single();
    const next = mutate(((data?.blocks as PageBlock[]) ?? []));
    const { error } = await supabase.from('pages').update({ blocks: next }).eq('id', pageId);
    if (error) throw error;
    onBlocksChange?.(next);
  }, [pageId, onBlocksChange]);

  const makePersist = useCallback(
    (blockId: string) => (field: string) => async (value: string) => {
      await write(cur => cur.map(b => b.id === blockId ? { ...b, [field]: value } : b));
    },
    [write],
  );

  const setStyle = (blockId: string, style: BlockStyle) =>
    void write(cur => cur.map(b => b.id === blockId ? { ...b, style } : b));

  const move = (blockId: string, dir: -1 | 1) =>
    void write(cur => {
      const i = cur.findIndex(b => b.id === blockId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const out = cur.slice();
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });

  const duplicate = (blockId: string) =>
    void write(cur => {
      const i = cur.findIndex(b => b.id === blockId);
      if (i < 0) return cur;
      const copy = {
        ...structuredClone(cur[i]),
        id: (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
          ?? Math.random().toString(36).slice(2),
      };
      return [...cur.slice(0, i + 1), copy, ...cur.slice(i + 1)];
    });

  const remove = (blockId: string) => {
    if (!confirm('Delete this block? You can put it back from Change history.')) return;
    void write(cur => cur.filter(b => b.id !== blockId));
  };

  const toggleHidden = (blockId: string) =>
    void write(cur => cur.map(b => b.id === blockId ? { ...b, hidden: !b.hidden } : b));

  // Hidden blocks stay on the page while editing — greyed out — so she can put
  // them back. Visitors never see them.
  const shown = (blocks ?? []).filter(b => editing || !b.hidden);

  const add = (type: PageBlock['type'], afterId: string | null) =>
    void write(cur => {
      const block = newBlock(type);
      if (afterId === null) return [block, ...cur];
      const i = cur.findIndex(b => b.id === afterId);
      return i < 0 ? [...cur, block] : [...cur.slice(0, i + 1), block, ...cur.slice(i + 1)];
    });

  return (
    <>
      {editing && <AddBlockRail onAdd={t => add(t, null)} />}
      {shown.map((block, i) => {
        const edit = pageId ? (field: string) => makePersist(block.id)(field) : undefined;
        const all = blocks ?? [];
        const realIndex = all.findIndex(b => b.id === block.id);

        return (
          <section
            key={block.id}
            className={`group/block ${sectionClasses(block.style)} ${
              editing ? 'outline-1 outline-dashed outline-primary/25 hover:outline-primary/60 -outline-offset-1' : ''
            } ${block.hidden ? 'opacity-40' : ''}`}
          >
            {editing && (
              <BlockToolbar
                style={block.style}
                hidden={block.hidden}
                canUp={realIndex > 0}
                canDown={realIndex < all.length - 1}
                onStyle={s => setStyle(block.id, s)}
                onMove={d => move(block.id, d)}
                onDuplicate={() => duplicate(block.id)}
                onDelete={() => remove(block.id)}
                onToggleHidden={() => toggleHidden(block.id)}
              />
            )}

            <BlockReveal kind={block.style?.reveal} delay={Math.min(i, 4) * 0.05}>
              <div className={contentClasses(block.style)}>
                {block.type === 'text'    ? <TextBlock    block={block} edit={edit as any} />
               : block.type === 'image'   ? <ImageBlock   block={block} />
               : block.type === 'gallery' ? <GalleryBlock block={block} />
               : block.type === 'video'   ? <VideoBlock   block={block} />
               : block.type === 'buttons' ? <ButtonsBlock block={block} />
               : block.type === 'form'    ? <FormBlock    block={block} />
               /* Unknown type — a block saved by a newer version. Render
                  nothing rather than crash the whole page. */
               : null}
              </div>
            </BlockReveal>
          </section>
        );
      })}
      {editing && shown.length > 0 && (
        <AddBlockRail onAdd={t => add(t, shown[shown.length - 1].id)} />
      )}
    </>
  );
}
