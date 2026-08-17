import React, { useEffect, useState } from 'react';
import {
  Loader2, Save, ArrowUp, ArrowDown, Eye, EyeOff, Trash2,
  CheckCircle, AlertCircle, ExternalLink, Lock, GripVertical,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDragList, reorder } from '../hooks/useDragList';
import {
  HOME_LAYOUT_KEY, DEFAULT_HOME_LAYOUT, HOME_SECTIONS, resolveHomeOrder,
  densityOf, DENSITY_OPTIONS,
  type HomeLayout, type PageBlock, type PageBlockType, type HomeDensity,
} from '../lib/database.types';
import { listForms, type FormListItem } from '../lib/formSchema';
import { BlockEditor, BLOCK_TYPES } from './AdminPageForm';
import { BLOCK_PRESETS } from '../lib/pageBlock';
import { insertBlocks } from '../lib/blockStyle';

/**
 * The home page, as something she arranges rather than something she receives.
 *
 * Until now its six sections were hard-coded siblings in App.tsx: the order was
 * the order of the file, nothing could be switched off for a week, and nothing
 * new could go between them. She asked for event cards and a newsletter on the
 * home page and both had to be built in by hand, in a fixed spot.
 *
 * The six built-in sections can be moved and hidden but not deleted — they are
 * the page's structure, and a bin next to "Opening circle" is an invitation to
 * an accident she cannot undo from here. Hiding does the same job and comes
 * back.
 */

interface ToastMsg { text: string; type: 'success' | 'error' }

const SECTION = 'bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4';
const LABEL   = 'block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5';

const BUILT_IN = new Map(HOME_SECTIONS.map(s => [s.id, s]));

export default function AdminHome() {
  const [layout, setLayout]   = useState<HomeLayout>(DEFAULT_HOME_LAYOUT);
  const [forms, setForms]     = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [toast, setToast]     = useState<ToastMsg | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from('site_settings').select('value').eq('id', HOME_LAYOUT_KEY).maybeSingle(),
      listForms(),
    ])
      .then(([{ data }, formList]) => {
        if (data?.value) setLayout({ ...DEFAULT_HOME_LAYOUT, ...(data.value as HomeLayout) });
        setForms(formList);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Always work from the resolved order, never from the raw saved one: a
  // section added to the code after her last save is not in it, and editing
  // from the raw list would write that omission back permanently.
  const order  = resolveHomeOrder(layout);
  const hidden = new Set(layout.hidden ?? []);

  const patch = (next: Partial<HomeLayout>) => {
    setLayout(prev => ({ ...prev, order, ...next }));
    setDirty(true);
  };

  const move = (idx: number, dir: -1 | 1) => {
    const arr = order.slice();
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    patch({ order: arr });
  };

  const drag = useDragList((fromId, toId) =>
    patch({ order: reorder(order, order.indexOf(fromId), order.indexOf(toId)) }),
  );

  const setDensity = (id: string, value: HomeDensity) =>
    patch({ density: { ...(layout.density ?? {}), [id]: value } });

  const toggleHidden = (id: string) => {
    const next = new Set(hidden);
    next.has(id) ? next.delete(id) : next.add(id);
    patch({ hidden: [...next] });
  };

  // A preset can be more than one block ("Photo + text" is two, already side by
  // side), so both the block list and the order take all of them.
  const addPreset = (blocks: PageBlock[]) => {
    // The home page renders by `order`, not by the `blocks` array, so the row
    // packing has to be reasoned about in display order — otherwise "Photo +
    // text" was still split apart here even though the page editor got it right.
    const ordered = order
      .map(id => layout.blocks.find(b => b.id === id))
      .filter((b): b is PageBlock => Boolean(b));
    const last = ordered.length ? ordered[ordered.length - 1].id : null;
    const next = insertBlocks(ordered, blocks, last);
    patch({ blocks: next, order: [...order, ...blocks.map(b => b.id)] });
  };

  const editBlock = (id: string, next: PageBlock) =>
    patch({ blocks: layout.blocks.map(b => (b.id === id ? next : b)) });

  const removeBlock = (id: string) =>
    patch({
      blocks: layout.blocks.filter(b => b.id !== id),
      order:  order.filter(x => x !== id),
      hidden: (layout.hidden ?? []).filter(x => x !== id),
    });

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('site_settings').upsert({
        id: HOME_LAYOUT_KEY,
        value: { ...layout, order },
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      setDirty(false);
      setToast({ text: 'Home page saved', type: 'success' });
    } catch (err: any) {
      setToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-[#444] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-white text-lg font-semibold">Home page</h1>
          <p className="text-[#555] text-sm mt-1">
            Drag a section by its handle to move it, switch one off with the eye, and
            add anything else underneath. Nothing here is deleted by hiding it.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 flex items-center gap-1.5 text-[#666] hover:text-white text-xs transition-colors"
        >
          <ExternalLink size={13} /> View
        </a>
      </div>

      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Order on the page</p>
        <div className="space-y-2">
          {order.map((id, idx) => {
            const built = BUILT_IN.get(id);
            const block = layout.blocks.find(b => b.id === id);
            const isHidden = hidden.has(id);
            const meta = built ?? null;
            const blockMeta = block ? BLOCK_TYPES.find(t => t.type === block.type) : null;

            return (
              <div
                key={id}
                data-drag-item
                {...drag.targetProps(id)}
                className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                  isHidden ? 'bg-[#0b0b0b] opacity-50' : 'bg-[#0d0d0d]'
                } ${drag.dragId === id ? 'opacity-30' : ''} ${
                  drag.overId === id ? 'border-[#059669]'
                  : isHidden ? 'border-[#141414]' : 'border-[#1e1e1e]'
                }`}
              >
                <span
                  {...drag.handleProps(id)}
                  title="Drag to move this section"
                  aria-label="Drag to move this section"
                  className="-ml-1 w-5 flex-shrink-0 flex items-center justify-center text-[#3a3a3a] hover:text-white transition-colors cursor-grab active:cursor-grabbing"
                >
                  <GripVertical size={14} />
                </span>
                <span className="text-[#333] text-xs font-mono w-5 flex-shrink-0">{idx + 1}</span>

                <div className="min-w-0 flex-1">
                  <p className="text-[#ddd] text-sm truncate">
                    {meta?.label ?? blockMeta?.label ?? 'Block'}
                    {!meta && <span className="text-[#555]"> · yours</span>}
                  </p>
                  <p className="text-[#555] text-xs truncate">
                    {meta?.hint ?? blockMeta?.hint ?? ''}
                  </p>
                  {/* How much empty space sits around this section. The gaps
                      she pointed at were mostly here.
                      Built-in sections only: these chips set --home-pad, and
                      only the hard-coded sections read it. On one of her own
                      blocks they did nothing at all — its air comes from its
                      own Spacing control, below. */}
                  {!isHidden && meta && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-[#3a3a3a] text-[10px] uppercase tracking-[0.14em] mr-1">Space</span>
                      {DENSITY_OPTIONS.map(o => (
                        <button
                          key={o.value}
                          onClick={() => setDensity(id, o.value)}
                          title={o.hint}
                          className={`px-2 py-0.5 rounded text-[10px] leading-none transition-colors ${
                            densityOf(layout, id) === o.value
                              ? 'bg-white text-black font-medium'
                              : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0}
                    aria-label="Move up" title="Move up"
                    className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-25 transition-colors">
                    <ArrowUp size={14} />
                  </button>
                  <button onClick={() => move(idx, 1)} disabled={idx === order.length - 1}
                    aria-label="Move down" title="Move down"
                    className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-25 transition-colors">
                    <ArrowDown size={14} />
                  </button>
                  <button onClick={() => toggleHidden(id)}
                    aria-label={isHidden ? 'Show on the page' : 'Hide without deleting'}
                    title={isHidden ? 'Hidden — click to show' : 'Visible — click to hide'}
                    className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors">
                    {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  {meta ? (
                    <span
                      title="Built-in section — hide it instead of deleting"
                      className="w-8 h-8 flex items-center justify-center text-[#2a2a2a]"
                    >
                      <Lock size={13} />
                    </span>
                  ) : (
                    <button onClick={() => { if (confirm('Delete this block?')) removeBlock(id); }}
                      aria-label="Delete" title="Delete"
                      className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-red-400 hover:bg-red-950/30 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {layout.blocks.length > 0 && (
        <section className="space-y-3">
          <p className="text-white text-sm font-medium">Your blocks</p>
          {layout.blocks.map((block, idx) => (
            <BlockEditor
              key={block.id}
              block={block}
              forms={forms}
              onChange={next => editBlock(block.id, next)}
              onMoveUp={() => move(order.indexOf(block.id), -1)}
              onMoveDown={() => move(order.indexOf(block.id), 1)}
              onDelete={() => { if (confirm('Delete this block?')) removeBlock(block.id); }}
              canUp={order.indexOf(block.id) > 0}
              canDown={order.indexOf(block.id) < order.length - 1}
            />
          ))}
        </section>
      )}

      <section className={SECTION}>
        <p className={LABEL}>Add to the home page</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {BLOCK_PRESETS.map(p => {
            const Icon = BLOCK_TYPES.find(t => t.type === p.icon)?.icon;
            const pairs = p.build().length > 1;
            return (
              <button key={p.id} onClick={() => addPreset(p.build())}
                className="flex items-start gap-2 px-3 py-2.5 bg-[#0d0d0d] hover:bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg text-left transition-colors">
                {Icon && <Icon size={14} className="text-[#666] mt-0.5 flex-shrink-0" />}
                <span className="min-w-0">
                  <span className="block text-[#ccc] text-sm">
                    {p.label}
                    {pairs && <span className="text-[#059669] text-[10px] ml-1.5 uppercase tracking-widest">row</span>}
                  </span>
                  <span className="block text-[#555] text-xs">{p.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm shadow-2xl ${
          toast.type === 'success'
            ? 'bg-[#064e3b] text-emerald-100 border border-emerald-500/30'
            : 'bg-[#4c0519] text-red-100 border border-red-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
