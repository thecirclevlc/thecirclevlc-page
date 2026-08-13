import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LegalBody from './LegalBody';
import ImageLightbox from './ImageLightbox';
import ProfileGallery from './ProfileGallery';
import GSAPReveal from './GSAPReveal';
import EditableText from './EditableText';
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

function BlockHeading({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-primary mb-8">
      {text}
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
              <LegalBody body={block.body} />
            </EditableText>
          ) : (
            /* Reuses the renderer the legal pages already use: paragraphs,
               `- ` bullets and **bold**. One formatting dialect site-wide. */
            <LegalBody body={block.body} />
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
        <BlockHeading text={block.heading} />
        <a href={block.url} target="_blank" rel="noopener noreferrer"
           className="text-primary underline underline-offset-4 hover:text-fg transition-colors break-all">
          {block.url}
        </a>
      </>
    ) : null;
  }
  return (
    <>
      <BlockHeading text={block.heading} />
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
      <BlockHeading text={block.heading} />
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
      <BlockHeading text={block.heading} />
      <button
        onClick={() => { window.scrollTo(0, 0); navigate(formPath(block.form_slug)); }}
        className="bg-primary text-black font-black text-lg md:text-xl py-5 px-12 uppercase tracking-widest hover:opacity-80 transition-opacity cursor-pointer"
      >
        Open form
      </button>
    </>
  );
}

export default function PageBlocks({ blocks, pageId, onBlocksChange }: BlocksProps) {
  /**
   * Writes one field of one block straight back to the `pages` row.
   *
   * Re-reads before writing so two quick edits in different blocks cannot
   * clobber each other — the whole `blocks` array is one JSONB column.
   */
  const makePersist = useCallback(
    (blockId: string) => (field: string) => async (value: string) => {
      if (!pageId) return;
      const { data } = await supabase.from('pages').select('blocks').eq('id', pageId).single();
      const current = ((data?.blocks as PageBlock[]) ?? []);
      const next = current.map(b => b.id === blockId ? { ...b, [field]: value } : b);
      const { error } = await supabase.from('pages').update({ blocks: next }).eq('id', pageId);
      if (error) throw error;
      onBlocksChange?.(next);
    },
    [pageId, onBlocksChange],
  );

  return (
    <>
      {(blocks ?? []).filter(b => !b.hidden).map((block, i) => {
        const edit = pageId
          ? (field: string) => makePersist(block.id)(field)
          : undefined;
        return (
          <GSAPReveal key={block.id} delay={Math.min(i, 4) * 0.05}>
            <section className="px-5 md:px-20 py-12 md:py-20">
              <div className="max-w-6xl mx-auto">
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
            </section>
          </GSAPReveal>
        );
      })}
    </>
  );
}
