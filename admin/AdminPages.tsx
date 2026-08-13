import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Loader2, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff,
  CheckCircle, AlertCircle, Copy, ExternalLink, FileText,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/slugify';
import { validatePageSlug, type Page } from '../lib/database.types';

interface ToastMsg { text: string; type: 'success' | 'error' }

export default function AdminPages() {
  const navigate = useNavigate();
  const [pages, setPages]     = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts]   = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .order('sort_order')
      .order('created_at');
    if (error) addToast({ text: error.message, type: 'error' });
    setPages((data as Page[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const create = async () => {
    const title = prompt('What is the page called?', 'Who We Are');
    if (!title?.trim()) return;

    const slug = slugify(title);
    const problem = validatePageSlug(slug, pages.map(p => p.slug));
    if (problem) { addToast({ text: problem, type: 'error' }); return; }

    const { data, error } = await supabase
      .from('pages')
      .insert({
        title: title.trim(),
        slug,
        status: 'draft',
        blocks: [],
        sort_order: pages.length,
      })
      .select('id')
      .single();

    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    navigate(`/admin/pages/${data.id}`);
  };

  const duplicate = async (page: Page) => {
    const title = `${page.title} copy`;
    let slug = slugify(title);
    for (let n = 2; pages.some(p => p.slug === slug); n++) slug = `${slugify(page.title)}-${n}`;

    const { error } = await supabase.from('pages').insert({
      title, slug,
      status: 'draft',                 // never publish a copy behind her back
      blocks: page.blocks,
      seo_title: page.seo_title,
      seo_description: page.seo_description,
      sort_order: pages.length,
      show_in_nav: false,
    });
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    addToast({ text: `"${title}" created as a draft`, type: 'success' });
    load();
  };

  const togglePublish = async (page: Page) => {
    const next = page.status === 'published' ? 'draft' : 'published';
    if (next === 'draft' && page.show_in_nav &&
        !confirm(`"${page.title}" is in the menu. Unpublishing it leaves a broken link.\n\nUnpublish anyway?`)) return;

    const { error } = await supabase.from('pages').update({ status: next }).eq('id', page.id);
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    setPages(prev => prev.map(p => p.id === page.id ? { ...p, status: next } : p));
    addToast({ text: next === 'published' ? 'Page is live' : 'Page hidden', type: 'success' });
  };

  const toggleNav = async (page: Page) => {
    if (!page.show_in_nav && page.status !== 'published') {
      addToast({ text: 'Publish the page first, or the menu link goes nowhere.', type: 'error' });
      return;
    }
    const { error } = await supabase.from('pages').update({ show_in_nav: !page.show_in_nav }).eq('id', page.id);
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    setPages(prev => prev.map(p => p.id === page.id ? { ...p, show_in_nav: !p.show_in_nav } : p));
  };

  // Arrows rather than drag-and-drop: HTML5 drag does not work on touch, and
  // she may well reorder from a phone. Ten lines, works everywhere.
  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= pages.length) return;
    const arr = pages.slice();
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    const reordered = arr.map((p, i) => ({ ...p, sort_order: i }));
    setPages(reordered);
    await Promise.all(reordered.map(p =>
      supabase.from('pages').update({ sort_order: p.sort_order }).eq('id', p.id)));
  };

  const remove = async (page: Page) => {
    if (!confirm(`Delete "${page.title}" permanently?\n\nIts address ${'/' + page.slug} will stop working.`)) return;
    const { error } = await supabase.from('pages').delete().eq('id', page.id);
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    setPages(prev => prev.filter(p => p.id !== page.id));
    addToast({ text: 'Page deleted', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Pages</h1>
          <p className="text-[#555] text-sm mt-1">
            Build a page from text, photos, videos and buttons. Give it an address, put it in the menu.
          </p>
        </div>
        <button onClick={create}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#059669] hover:bg-[#047857] text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={14} /> New page
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="text-[#444] animate-spin" />
        </div>
      ) : pages.length === 0 ? (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-12 text-center">
          <FileText size={28} className="mx-auto text-[#333] mb-3" />
          <p className="text-[#999] text-sm">No pages yet.</p>
          <p className="text-[#555] text-xs mt-2 max-w-sm mx-auto">
            Create one and it gets its own web address. Add it to the menu when you are happy with it.
          </p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
          {pages.map((page, idx) => (
            <div key={page.id}
              className="px-5 py-4 flex items-center gap-4 border-b border-[#1a1a1a] last:border-0 hover:bg-[#161616] transition-colors">

              <div className="flex flex-col">
                <button onClick={() => move(idx, -1)} disabled={idx === 0}
                  className="w-6 h-5 flex items-center justify-center rounded text-[#555] hover:text-white disabled:opacity-20 transition-colors"
                  aria-label="Move up"><ArrowUp size={12} /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === pages.length - 1}
                  className="w-6 h-5 flex items-center justify-center rounded text-[#555] hover:text-white disabled:opacity-20 transition-colors"
                  aria-label="Move down"><ArrowDown size={12} /></button>
              </div>

              <button onClick={() => navigate(`/admin/pages/${page.id}`)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-white text-sm font-medium truncate">{page.title}</p>
                  <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border ${
                    page.status === 'published'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  }`}>
                    {page.status === 'published' ? 'live' : 'draft'}
                  </span>
                  {page.show_in_nav && (
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#666]">in menu</span>
                  )}
                </div>
                <p className="text-[#555] text-xs font-mono mt-1">
                  /{page.slug} · {(page.blocks ?? []).length} block{(page.blocks ?? []).length === 1 ? '' : 's'}
                </p>
              </button>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleNav(page)}
                  className={`px-2.5 py-1.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                    page.show_in_nav ? 'text-emerald-400 hover:bg-[#1a1a1a]' : 'text-[#555] hover:text-[#999] hover:bg-[#1a1a1a]'
                  }`}
                  title={page.show_in_nav ? 'Remove from menu' : 'Add to menu'}>
                  Menu
                </button>
                <button onClick={() => togglePublish(page)}
                  className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                  title={page.status === 'published' ? 'Unpublish' : 'Publish'}>
                  {page.status === 'published' ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <a href={`/${page.slug}`} target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                  title="View page"><ExternalLink size={14} /></a>
                <button onClick={() => duplicate(page)}
                  className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] transition-colors"
                  title="Duplicate"><Copy size={14} /></button>
                <button onClick={() => remove(page)}
                  className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-red-400 hover:bg-red-950/30 transition-colors"
                  title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

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
