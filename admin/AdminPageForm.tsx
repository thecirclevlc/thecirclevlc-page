import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff,
  CheckCircle, AlertCircle, ExternalLink, ArrowLeft, Clock,
  Type, Image as ImageIcon, Images, Film, MousePointerClick, FormInput,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/slugify';
import { uploadImage } from '../lib/imageUpload';
import { embedUrl } from '../lib/embedUrl';
import AdminHistory from './AdminHistory';
import {
  validatePageSlug, ratioClass,
  IMAGE_FIT_OPTIONS, IMAGE_FOCUS_OPTIONS, IMAGE_RATIO_OPTIONS,
  type Page, type PageBlock, type PageBlockType, type PageButton,
} from '../lib/database.types';
import { listForms, type FormListItem } from '../lib/formSchema';

interface ToastMsg { text: string; type: 'success' | 'error' }

const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors';
const TEXTAREA = INPUT + ' min-h-[120px] resize-y';
const SECTION = 'bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4';
const LABEL = 'block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5';

const BLOCK_TYPES: { type: PageBlockType; label: string; hint: string; icon: React.ElementType }[] = [
  { type: 'text',    label: 'Text',    hint: 'Paragraphs, bullets, bold',   icon: Type },
  { type: 'image',   label: 'Photo',   hint: 'One image with a caption',    icon: ImageIcon },
  { type: 'gallery', label: 'Gallery', hint: 'A grid of photos',            icon: Images },
  { type: 'video',   label: 'Video',   hint: 'YouTube, Vimeo, SoundCloud',  icon: Film },
  { type: 'buttons', label: 'Buttons', hint: 'Links, donations, downloads', icon: MousePointerClick },
  { type: 'form',    label: 'Form',    hint: 'Send people to one of your forms', icon: FormInput },
];

function uuid() {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function newBlock(type: PageBlockType): PageBlock {
  const id = uuid();
  switch (type) {
    case 'text':    return { id, type, heading: '', body: '' };
    case 'image':   return { id, type, url: '', alt: '', caption: '' };
    case 'gallery': return { id, type, heading: '', images: [] };
    case 'video':   return { id, type, heading: '', url: '', caption: '' };
    case 'buttons': return { id, type, heading: '', items: [{ id: uuid(), label: '', url: '', primary: true }] };
    case 'form':    return { id, type, heading: '', form_slug: '' };
  }
}

// ── One block's editor ────────────────────────────────────────────

function BlockEditor({
  block, forms, onChange, onMoveUp, onMoveDown, onDelete, canUp, canDown,
}: {
  block: PageBlock;
  forms: FormListItem[];
  onChange: (next: PageBlock) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const meta = BLOCK_TYPES.find(t => t.type === block.type);
  const Icon = meta?.icon ?? Type;

  const patch = (p: Partial<PageBlock>) => onChange({ ...block, ...p } as PageBlock);

  const doUpload = async (files: FileList | null, then: (urls: string[]) => void) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(Array.from(files).map(f => uploadImage(f, 'general')));
      then(urls);
    } catch (err: any) {
      alert(err?.message ?? 'Upload failed');
    } finally { setUploading(false); }
  };

  return (
    <div className={`bg-[#0d0d0d] border rounded-lg p-4 space-y-3 ${block.hidden ? 'border-[#1a1a1a] opacity-50' : 'border-[#1a1a1a]'}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-[#666] flex-shrink-0" />
        <span className="text-[#888] text-xs tracking-[0.12em] uppercase">{meta?.label}</span>
        {block.hidden && <span className="text-amber-500/70 text-[10px] uppercase tracking-widest">hidden</span>}
        <div className="ml-auto flex gap-1">
          <button onClick={() => patch({ hidden: !block.hidden } as Partial<PageBlock>)}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title={block.hidden ? 'Show on the page' : 'Hide without deleting'}>
            {block.hidden ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button onClick={onMoveUp} disabled={!canUp}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
            aria-label="Move up"><ArrowUp size={13} /></button>
          <button onClick={onMoveDown} disabled={!canDown}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
            aria-label="Move down"><ArrowDown size={13} /></button>
          <button onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-red-400 hover:bg-red-950/30 transition-colors"
            aria-label="Delete"><Trash2 size={13} /></button>
        </div>
      </div>

      {'heading' in block && (
        <div>
          <label className={LABEL}>Heading (optional)</label>
          <input className={INPUT} value={block.heading ?? ''}
            onChange={e => patch({ heading: e.target.value } as Partial<PageBlock>)} />
        </div>
      )}

      {block.type === 'text' && (
        <div>
          <label className={LABEL}>Text</label>
          <textarea className={TEXTAREA} value={block.body}
            onChange={e => patch({ body: e.target.value } as Partial<PageBlock>)}
            placeholder={'One blank line starts a new paragraph.\n- a line starting with a dash is a bullet\n**text between double stars** comes out bold'} />
        </div>
      )}

      {block.type === 'image' && (
        <div className="space-y-3">
          {block.url && (
            <img src={block.url} alt="" className="max-h-48 rounded border border-[#1e1e1e]" />
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <label className="px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] cursor-pointer transition-colors">
              {uploading ? 'Uploading…' : block.url ? 'Replace photo' : 'Upload photo'}
              <input type="file" accept="image/*" className="hidden"
                onChange={e => doUpload(e.target.files, urls => patch({ url: urls[0] } as Partial<PageBlock>))} />
            </label>
            {block.url && (
              <button onClick={() => patch({ url: '' } as Partial<PageBlock>)}
                className="px-3 py-2 text-xs text-[#666] hover:text-red-400 transition-colors">Remove</button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Caption (optional)</label>
              <input className={INPUT} value={block.caption ?? ''}
                onChange={e => patch({ caption: e.target.value } as Partial<PageBlock>)} />
            </div>
            <div>
              <label className={LABEL}>Description for screen readers</label>
              <input className={INPUT} value={block.alt ?? ''}
                onChange={e => patch({ alt: e.target.value } as Partial<PageBlock>)}
                placeholder="What the photo shows" />
            </div>
          </div>

          {/* How the photo sits in its frame. Without this, an upload either
              gets cropped somewhere unhelpful or has to be re-cropped outside
              the site and uploaded again. */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            <div>
              <label className={LABEL}>Frame shape</label>
              <select className={INPUT} value={block.display?.ratio ?? 'auto'}
                onChange={e => patch({ display: { ...block.display, ratio: e.target.value as any } } as Partial<PageBlock>)}>
                {IMAGE_RATIO_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>How it fits</label>
              <select className={INPUT} value={block.display?.fit ?? 'cover'}
                onChange={e => patch({ display: { ...block.display, fit: e.target.value as any } } as Partial<PageBlock>)}
                disabled={(block.display?.ratio ?? 'auto') === 'auto'}>
                {IMAGE_FIT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label} — {o.hint}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Keep in view</label>
              <select className={INPUT} value={block.display?.focus ?? 'center'}
                onChange={e => patch({ display: { ...block.display, focus: e.target.value as any } } as Partial<PageBlock>)}
                disabled={(block.display?.ratio ?? 'auto') === 'auto' || block.display?.fit === 'contain'}>
                {IMAGE_FOCUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {(block.display?.ratio ?? 'auto') === 'auto' && (
            <p className="text-[#444] text-xs">
              Pick a frame shape to control cropping. "Original shape" shows the photo exactly as uploaded.
            </p>
          )}

          {/* Preview at the chosen settings, so she is not guessing. */}
          {block.url && (block.display?.ratio ?? 'auto') !== 'auto' && (
            <div className={`max-w-xs overflow-hidden bg-black border border-[#1e1e1e] ${ratioClass(block.display?.ratio)}`}>
              <img src={block.url} alt=""
                className={`w-full h-full ${block.display?.fit === 'contain' ? 'object-contain' : 'object-cover'}`}
                style={{ objectPosition: block.display?.focus ?? 'center' }} />
            </div>
          )}
        </div>
      )}

      {block.type === 'gallery' && (
        <div className="space-y-3">
          {block.images.length > 0 && (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {block.images.map((url, i) => (
                <div key={`${url}-${i}`} className="relative group">
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded border border-[#1e1e1e]" />
                  <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                    <button onClick={() => {
                        const arr = block.images.slice();
                        if (i === 0) return;
                        [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
                        patch({ images: arr } as Partial<PageBlock>);
                      }}
                      disabled={i === 0}
                      className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1a1a] text-white disabled:opacity-30"
                      aria-label="Move left"><ArrowUp size={12} className="-rotate-90" /></button>
                    <button onClick={() => {
                        const arr = block.images.slice();
                        if (i === arr.length - 1) return;
                        [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                        patch({ images: arr } as Partial<PageBlock>);
                      }}
                      disabled={i === block.images.length - 1}
                      className="w-7 h-7 flex items-center justify-center rounded bg-[#1a1a1a] text-white disabled:opacity-30"
                      aria-label="Move right"><ArrowDown size={12} className="-rotate-90" /></button>
                    <button onClick={() => patch({ images: block.images.filter((_, j) => j !== i) } as Partial<PageBlock>)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-red-950/70 text-red-300"
                      aria-label="Remove"><Trash2 size={12} /></button>
                  </div>
                  <span className="absolute top-1 left-1 text-[10px] font-mono bg-black/70 text-white px-1.5 rounded">{i + 1}</span>
                </div>
              ))}
            </div>
          )}
          <label className="inline-block px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] cursor-pointer transition-colors">
            {uploading ? 'Uploading…' : 'Add photos'}
            <input type="file" accept="image/*" multiple className="hidden"
              onChange={e => doUpload(e.target.files, urls => patch({ images: [...block.images, ...urls] } as Partial<PageBlock>))} />
          </label>
        </div>
      )}

      {block.type === 'video' && (
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Link to the video</label>
            <input className={INPUT} value={block.url}
              onChange={e => patch({ url: e.target.value } as Partial<PageBlock>)}
              placeholder="https://www.youtube.com/watch?v=…" />
            <p className="text-[#444] text-xs mt-1">
              Paste the address straight from the browser bar. YouTube, Vimeo, SoundCloud and Mixcloud all work.
            </p>
            {block.url && !embedUrl(block.url) && (
              <p className="text-amber-500/80 text-xs mt-1">
                That link cannot be embedded — it will show as a plain link instead.
              </p>
            )}
          </div>
          <div>
            <label className={LABEL}>Caption (optional)</label>
            <input className={INPUT} value={block.caption ?? ''}
              onChange={e => patch({ caption: e.target.value } as Partial<PageBlock>)} />
          </div>
        </div>
      )}

      {block.type === 'buttons' && (
        <div className="space-y-2">
          {block.items.map((b, i) => (
            <div key={b.id} className="flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-[140px]">
                <label className={LABEL}>Button text</label>
                <input className={INPUT} value={b.label}
                  onChange={e => patch({ items: block.items.map(x => x.id === b.id ? { ...x, label: e.target.value } : x) } as Partial<PageBlock>)}
                  placeholder="Donate" />
              </div>
              <div className="flex-[2] min-w-[200px]">
                <label className={LABEL}>Where it goes</label>
                <input className={INPUT} value={b.url}
                  onChange={e => patch({ items: block.items.map(x => x.id === b.id ? { ...x, url: e.target.value } : x) } as Partial<PageBlock>)}
                  placeholder="https://paypal.me/… or /form" />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#ccc] py-2.5 cursor-pointer">
                <input type="checkbox" checked={b.primary ?? false}
                  onChange={e => patch({ items: block.items.map(x => x.id === b.id ? { ...x, primary: e.target.checked } : x) } as Partial<PageBlock>)}
                  className="w-4 h-4 accent-[#059669]" />
                Loud
              </label>
              <button onClick={() => patch({ items: block.items.filter(x => x.id !== b.id) } as Partial<PageBlock>)}
                className="w-9 h-9 flex items-center justify-center rounded text-[#666] hover:text-red-400 hover:bg-red-950/30 transition-colors"
                aria-label="Remove button"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={() => patch({ items: [...block.items, { id: uuid(), label: '', url: '' } as PageButton] } as Partial<PageBlock>)}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors">
            <Plus size={12} /> Add button
          </button>
          <p className="text-[#444] text-xs">
            For donations, paste your PayPal.me, Ko-fi or Stripe payment link here.
          </p>
        </div>
      )}

      {block.type === 'form' && (
        <div className="max-w-sm">
          <label className={LABEL}>Which form</label>
          <select className={INPUT} value={block.form_slug}
            onChange={e => patch({ form_slug: e.target.value } as Partial<PageBlock>)}>
            <option value="">— pick a form —</option>
            {forms.map(f => <option key={f.slug} value={f.slug}>{f.name}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Page editor ───────────────────────────────────────────────────

export default function AdminPageForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [page, setPage]       = useState<Page | null>(null);
  const [takenSlugs, setTaken] = useState<string[]>([]);
  const [forms, setForms]     = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toasts, setToasts]   = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const tid = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...t, id: tid }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== tid)), 3500);
  };

  useEffect(() => {
    (async () => {
      const [{ data: row }, { data: all }, formList] = await Promise.all([
        supabase.from('pages').select('*').eq('id', id).maybeSingle(),
        supabase.from('pages').select('slug').neq('id', id),
        listForms(),
      ]);
      setPage((row as Page) ?? null);
      setTaken(((all as { slug: string }[]) ?? []).map(p => p.slug));
      setForms(formList);
      setLoading(false);
    })();
  }, [id]);

  const update = (patch: Partial<Page>) => { setPage(prev => prev && { ...prev, ...patch }); setDirty(true); };
  const setBlocks = (blocks: PageBlock[]) => update({ blocks });

  const addBlock = (type: PageBlockType) => setBlocks([...(page?.blocks ?? []), newBlock(type)]);

  const moveBlock = (idx: number, dir: -1 | 1) => {
    const arr = (page?.blocks ?? []).slice();
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setBlocks(arr);
  };

  const slugProblem = page ? validatePageSlug(page.slug, takenSlugs) : null;

  const save = async () => {
    if (!page) return;
    if (slugProblem) { addToast({ text: slugProblem, type: 'error' }); return; }
    setSaving(true);
    const { error } = await supabase.from('pages').update({
      title: page.title,
      slug: page.slug,
      status: page.status,
      blocks: page.blocks,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      show_in_nav: page.show_in_nav,
    }).eq('id', page.id);
    setSaving(false);
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    setDirty(false);
    addToast({ text: 'Page saved', type: 'success' });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="text-[#444] animate-spin" /></div>;
  }
  if (!page) {
    return (
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-12 text-center">
        <p className="text-[#999] text-sm">That page no longer exists.</p>
        <button onClick={() => navigate('/admin/pages')} className="mt-4 text-[#059669] text-sm hover:underline">Back to Pages</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/admin/pages')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors mt-0.5"
            aria-label="Back"><ArrowLeft size={16} /></button>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{page.title || 'Untitled page'}</h1>
            <p className="text-[#555] text-sm mt-1 font-mono">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setHistoryOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
            title="Change history"><Clock size={15} /></button>
          <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors">
            <ExternalLink size={13} /> View
          </a>
        </div>
      </div>

      <section className={SECTION}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Page title</label>
            <input className={INPUT} value={page.title}
              onChange={e => update({ title: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Web address</label>
            <div className="flex items-center gap-1">
              <span className="text-[#555] text-sm font-mono">/</span>
              <input className={INPUT + ' font-mono'} value={page.slug}
                onChange={e => update({ slug: slugify(e.target.value) })}
                onBlur={() => { if (!page.slug) update({ slug: slugify(page.title) }); }} />
            </div>
            {slugProblem
              ? <p className="text-red-400 text-xs mt-1">{slugProblem}</p>
              : <p className="text-[#444] text-xs mt-1">The page will live at thecirclevlc.com/{page.slug}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-6 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#ccc]">
            <input type="checkbox" checked={page.status === 'published'}
              onChange={e => update({ status: e.target.checked ? 'published' : 'draft' })}
              className="w-4 h-4 accent-[#059669]" />
            Published — visible to everyone
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#ccc]">
            <input type="checkbox" checked={page.show_in_nav}
              onChange={e => update({ show_in_nav: e.target.checked })}
              className="w-4 h-4 accent-[#059669]" />
            Show in the menu
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-medium">Content ({(page.blocks ?? []).length})</p>
          <p className="text-[#555] text-xs">Reorder with ↑ ↓ · the eye hides a block without deleting it</p>
        </div>

        {(page.blocks ?? []).map((block, idx, arr) => (
          <BlockEditor
            key={block.id}
            block={block}
            forms={forms}
            onChange={next => setBlocks(arr.map((b, i) => i === idx ? next : b))}
            onMoveUp={() => moveBlock(idx, -1)}
            onMoveDown={() => moveBlock(idx, 1)}
            onDelete={() => { if (confirm('Delete this block?')) setBlocks(arr.filter((_, i) => i !== idx)); }}
            canUp={idx > 0}
            canDown={idx < arr.length - 1}
          />
        ))}

        <div className="bg-[#0d0d0d] border border-dashed border-[#222] rounded-lg p-4">
          <p className={LABEL}>Add content</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {BLOCK_TYPES.map(t => (
              <button key={t.type} onClick={() => addBlock(t.type)}
                className="flex items-start gap-2 px-3 py-2.5 bg-[#111] hover:bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg text-left transition-colors">
                <t.icon size={14} className="text-[#666] mt-0.5 flex-shrink-0" />
                <span>
                  <span className="block text-[#ccc] text-sm">{t.label}</span>
                  <span className="block text-[#555] text-xs">{t.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Google &amp; sharing</p>
        <div>
          <label className={LABEL}>Title in search results</label>
          <input className={INPUT} value={page.seo_title ?? ''}
            onChange={e => update({ seo_title: e.target.value })}
            placeholder={page.title} />
        </div>
        <div>
          <label className={LABEL}>Description in search results</label>
          <textarea className={INPUT + ' min-h-[70px] resize-y'} value={page.seo_description ?? ''}
            onChange={e => update({ seo_description: e.target.value })}
            placeholder="One or two sentences about this page." />
        </div>
      </section>

      <div className="flex justify-end sticky bottom-4 z-20">
        <button onClick={save} disabled={saving || !dirty || !!slugProblem}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors shadow-lg">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : dirty ? 'Save page' : 'Saved'}
        </button>
      </div>

      <AdminHistory
        tableName="pages"
        rowId={page.id}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onRestored={() => window.location.reload()}
      />

      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium ${
            t.type === 'success'
              ? 'bg-emerald-900 border border-emerald-500/30 text-emerald-300'
              : 'bg-red-900 border border-red-500/30 text-red-300'
          }`}>
            {t.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
