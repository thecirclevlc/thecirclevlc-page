import React, { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import LegalBody from './LegalBody';
import ImageLightbox from './ImageLightbox';
import ProfileGallery from './ProfileGallery';
import BlockReveal, { SplitWords } from './BlockReveal';
import BlockToolbar from './BlockToolbar';
import EditableText from './EditableText';
import { useEditMode } from '../contexts/EditModeContext';
import { useDragList, reorder } from '../hooks/useDragList';
import { packRows, rowLayout, isWordReveal, type BlockStyle } from '../lib/blockStyle';
import { linkTarget, type LinkTarget } from '../lib/blockLink';
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

/**
 * A destination the client typed, as a real link.
 *
 * A real `<a>` or router `<Link>` rather than an onClick: middle-click, "open
 * in new tab" and copying the address all have to work on a photo that leads
 * somewhere, and a button gives none of them. Where it points is decided by
 * `linkTarget`, which the admin panel also uses to describe it — one function,
 * so the panel cannot promise something the page does not do.
 */
function BlockLink({ target, className, label, children }: {
  target: LinkTarget; className?: string; label?: string; children: React.ReactNode;
}) {
  const { editMode } = useEditMode();
  // With edit mode on, following the link would throw her off the page she is
  // building. Same bargain EditableText makes: while editing, a click edits.
  const hold = editMode ? (e: React.MouseEvent) => e.preventDefault() : undefined;

  if (target.kind === 'external') {
    return (
      <a
        href={target.href}
        {...(target.newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        className={className}
        aria-label={label}
        onClick={hold}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={target.href} className={className} aria-label={label} onClick={hold}>
      {children}
    </Link>
  );
}

function ImageBlock({ block }: { block: Extract<PageBlock, { type: 'image' }> }) {
  const [open, setOpen] = useState(false);
  if (!block.url) return null;
  const fit   = block.display?.fit ?? 'cover';
  const shape = ratioClass(block.display?.ratio);
  // An address we refuse to turn into a link falls back to the lightbox rather
  // than leaving a photo that looks clickable and does nothing.
  const target = linkTarget(block.href ?? '');

  const img = (
    <img
      src={block.url}
      alt={block.alt ?? ''}
      loading="lazy"
      decoding="async"
      className={[
        shape ? `w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}` : 'w-full h-auto',
        // Only on a photo that leads somewhere, where it is the one signal that
        // there is anything to click. Photos without a link are left exactly as
        // they were rather than all quietly gaining a hover effect.
        target ? 'transition-transform duration-700 group-hover:scale-[1.03]' : '',
      ].filter(Boolean).join(' ')}
      style={{ objectPosition: objectPosition(block.display?.focus) }}
    />
  );
  const frame = `block w-full group overflow-hidden bg-black ${shape}`;

  return (
    <figure className="max-w-4xl">
      {target ? (
        // A photo that leads somewhere no longer opens the lightbox: two
        // different things on one click is how a visitor ends up at neither.
        //
        // A link whose only content is an image with an empty alt is announced
        // as just "link", so the label falls back through the caption.
        <BlockLink
          target={target}
          className={`${frame} cursor-pointer`}
          label={block.alt || block.caption || 'Open link'}
        >
          {img}
        </BlockLink>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`${frame} cursor-zoom-in`}
          aria-label={block.alt || 'Enlarge image'}
        >
          {img}
        </button>
      )}
      <span className="block border border-primary/15 -mt-px pointer-events-none" />
      {block.caption && (
        <figcaption className="mt-3 text-xs font-mono text-fg/40 tracking-wider uppercase">
          {block.caption}
        </figcaption>
      )}
      {!target && (
        <ImageLightbox images={[block.url]} initialIndex={0} isOpen={open} onClose={() => setOpen(false)} />
      )}
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

  // Same classifier as the photo links, on purpose. This block is where the
  // panel tells her to paste "your PayPal.me, Ko-fi or Stripe payment link" —
  // so it is the likeliest place of all for a bare `paypal.me/thecircle`, which
  // the old "does it start with http" test sent to a 404 on her own site.
  // Donation links are still just external URLs: no payment code anywhere.
  const go = (url: string) => {
    const target = linkTarget(url);
    if (!target) return;
    if (target.kind === 'internal') { navigate(target.href); return; }
    if (target.newTab) { window.open(target.href, '_blank', 'noopener,noreferrer'); return; }
    window.location.href = target.href;
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
        onClick={() => { navigate(formPath(block.form_slug)); }}
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

  // Dropping a block onto another puts it in that one's place. Which row a
  // block ends up in falls out of the order, so dragging a photo above a
  // paragraph and dragging it beside one are the same gesture.
  const drag = useDragList((fromId, toId) =>
    void write(cur => reorder(
      cur,
      cur.findIndex(b => b.id === fromId),
      cur.findIndex(b => b.id === toId),
    )),
  );

  // Rows are packed from what is on screen: a hidden block keeps its place in
  // the row while she is editing, and the row closes up the moment it goes
  // live. ponytail: pack the visible list, no separate preview of the public
  // layout — turning edit mode off is the preview.
  const rows = packRows(shown);
  let revealIndex = 0;

  // Which block's layout panel is open, held here rather than in each toolbar.
  // Changing a block's share of the row repacks the rows, which remounts the
  // block's section — and with the state inside the toolbar, the panel closed on
  // the very click that paired the photo with the text.
  const [openBlockId, setOpenBlockId] = useState<string | null>(null);

  return (
    <>
      {editing && <AddBlockRail onAdd={t => add(t, null)} />}

      {rows.map(row => {
        const layout = rowLayout(row);
        return (
          <React.Fragment key={row[0].id}>
            <div className={layout.band}>
              <div className={layout.grid}>
                {row.map((block, cell) => {
                  const edit = pageId ? (field: string) => makePersist(block.id)(field) : undefined;
                  const all = blocks ?? [];
                  const realIndex = all.findIndex(b => b.id === block.id);
                  const delay = Math.min(revealIndex++, 4) * 0.05;

                  return (
                    <section
                      key={block.id}
                      {...(editing ? drag.targetProps(block.id) : {})}
                      className={`group/block relative ${layout.cells[cell].outer} ${
                        editing ? 'outline-1 outline-dashed outline-primary/25 hover:outline-primary/60 -outline-offset-1' : ''
                      } ${block.hidden ? 'opacity-40' : ''} ${
                        drag.dragId === block.id ? 'opacity-30' : ''
                      } ${
                        drag.overId === block.id ? 'outline-2 outline-solid outline-primary' : ''
                      }`}
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
                          dragHandleProps={drag.handleProps(block.id)}
                          open={openBlockId === block.id}
                          onOpenChange={o => setOpenBlockId(o ? block.id : null)}
                        />
                      )}

                      {/* The reveal wrapper stays inside the cell. Put it around
                          the cells instead and they stop being grid items. */}
                      <BlockReveal kind={block.style?.reveal} delay={delay}>
                        <div className={layout.cells[cell].inner}>
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
              </div>
            </div>
            {/* A rail after every row, not just at the two ends: adding a
                section in the middle of a page used to mean adding it at the
                bottom and clicking ↑ until it arrived. */}
            {editing && <AddBlockRail onAdd={t => add(t, row[row.length - 1].id)} />}
          </React.Fragment>
        );
      })}
    </>
  );
}
