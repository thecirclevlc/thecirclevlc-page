import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Trash2, Image, Film, Ban, Loader2, CheckCircle, AlertCircle,
  Plus, GripVertical, Pencil, Check, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, uploadVideo, deleteImage } from '../lib/imageUpload';
import { slugify } from '../lib/slugify';
import type { PageBackground, PageKey, ArtistCategory, ArtistCategoryInsert } from '../lib/database.types';

// ── Types ─────────────────────────────────────────────────────────

interface PageConfig {
  key:   PageKey;
  label: string;
  desc:  string;
}

const PAGES: PageConfig[] = [
  { key: 'page_events',  label: 'Events Page',  desc: 'Hero background on /past-events' },
  { key: 'page_djs',     label: 'DJs Page',     desc: 'Hero background on /djs' },
  { key: 'page_artists', label: 'Artists Page', desc: 'Hero background on /artists' },
];

// ── Toast ─────────────────────────────────────────────────────────

interface ToastMsg { text: string; type: 'success' | 'error' }

// ── Page Section ──────────────────────────────────────────────────

interface PageSectionProps {
  config:    PageConfig;
  onToast:   (t: ToastMsg) => void;
}

function PageSection({ config, onToast }: PageSectionProps) {
  const [bg, setBg]             = useState<PageBackground>({ bg_url: null, bg_type: 'none' });
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);

  const imgRef   = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('id', config.key)
      .single()
      .then(({ data }) => {
        if (data?.value) setBg(data.value as PageBackground);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [config.key]);

  const save = async (newBg: PageBackground) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: config.key, value: newBg, updated_at: new Date().toISOString() });
      if (error) throw error;
      setBg(newBg);
      onToast({ text: `${config.label} saved`, type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'page-backgrounds');
      if (bg.bg_url) await deleteImage(bg.bg_url).catch(() => {});
      await save({ bg_url: url, bg_type: 'image' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
      if (imgRef.current) imgRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadVideo(file, 'page-backgrounds/videos');
      if (bg.bg_url) await deleteImage(bg.bg_url).catch(() => {});
      await save({ bg_url: url, bg_type: 'video' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Upload failed', type: 'error' });
    } finally {
      setUploading(false);
      if (videoRef.current) videoRef.current.value = '';
    }
  };

  const handleRemove = async () => {
    if (bg.bg_url) await deleteImage(bg.bg_url).catch(() => {});
    await save({ bg_url: null, bg_type: 'none' });
  };

  if (loading) {
    return (
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-[#444]" />
        <span className="text-[#444] text-sm">Loading {config.label}…</span>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-sm tracking-wide">{config.label}</h3>
          <p className="text-[#444] text-xs mt-0.5">{config.desc}</p>
        </div>
        {bg.bg_type !== 'none' && (
          <span className={`text-[10px] font-mono px-2 py-1 rounded border uppercase tracking-widest ${
            bg.bg_type === 'video'
              ? 'border-purple-500/30 text-purple-400 bg-purple-500/10'
              : 'border-blue-500/30 text-blue-400 bg-blue-500/10'
          }`}>
            {bg.bg_type}
          </span>
        )}
      </div>

      <div className="p-6 space-y-5">
        {bg.bg_url && bg.bg_type !== 'none' ? (
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            {bg.bg_type === 'video' ? (
              <video src={bg.bg_url} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80" />
            ) : (
              <img src={bg.bg_url} alt="Background preview" className="w-full h-full object-cover opacity-80" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <button
              onClick={handleRemove}
              disabled={saving || uploading}
              className="absolute top-3 right-3 p-1.5 bg-red-600 hover:bg-red-500 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} className="text-white" />
            </button>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-[#222] aspect-video flex items-center justify-center">
            <div className="text-center">
              <Ban size={28} className="mx-auto text-[#333] mb-2" />
              <p className="text-[#444] text-xs font-mono">NO BACKGROUND SET</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => imgRef.current?.click()}
            disabled={uploading || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#C42121]/30 rounded-lg text-sm text-[#888] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
            <span>Image</span>
          </button>
          <button
            onClick={() => videoRef.current?.click()}
            disabled={uploading || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-purple-500/30 rounded-lg text-sm text-[#888] hover:text-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
            <span>Video</span>
          </button>
          {bg.bg_url && (
            <button
              onClick={handleRemove}
              disabled={uploading || saving}
              className="px-4 py-2.5 bg-[#1a1a1a] hover:bg-red-950/30 border border-[#2a2a2a] hover:border-red-500/30 rounded-lg text-[#666] hover:text-red-400 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
        <p className="text-[#333] text-xs font-mono">
          Image: JPG, PNG, WebP · Video: MP4, WebM · Images auto-converted to WebP
        </p>
      </div>

      <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
      <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/*" className="hidden" onChange={handleVideoUpload} />
    </div>
  );
}

// ── Artist Categories CRUD ────────────────────────────────────────

interface CategoryRowProps {
  cat: ArtistCategory;
  onSave:   (id: string, name: string, slug: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function CategoryRow({ cat, onSave, onDelete }: CategoryRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(cat.name);
  const [saving, setSaving]   = useState(false);

  async function commitEdit() {
    if (!name.trim() || name === cat.name) { setEditing(false); setName(cat.name); return; }
    setSaving(true);
    await onSave(cat.id, name.trim(), slugify(name.trim()));
    setSaving(false);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-[#1a1a1a] last:border-0 group">
      <GripVertical size={14} className="text-[#333] flex-shrink-0" />

      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') { setEditing(false); setName(cat.name); }
          }}
          className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#059669]/40"
        />
      ) : (
        <span className="flex-1 text-white text-sm">{cat.name}</span>
      )}

      <span className="text-[#333] text-xs font-mono hidden sm:block">{cat.slug}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <>
            <button
              onClick={commitEdit}
              disabled={saving}
              className="w-6 h-6 flex items-center justify-center rounded text-[#059669] hover:bg-[#059669]/10 transition-colors"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              onClick={() => { setEditing(false); setName(cat.name); }}
              className="w-6 h-6 flex items-center justify-center rounded text-[#444] hover:text-white transition-colors"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="w-6 h-6 flex items-center justify-center rounded text-[#444] hover:text-white transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(cat.id)}
              className="w-6 h-6 flex items-center justify-center rounded text-[#444] hover:text-red-400 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ArtistCategoriesTab({ onToast }: { onToast: (t: ToastMsg) => void }) {
  const [categories, setCategories] = useState<ArtistCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [newName, setNewName]       = useState('');
  const [adding, setAdding]         = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    const { data } = await supabase
      .from('artist_categories')
      .select('*')
      .order('sort_order');
    if (data) setCategories(data as ArtistCategory[]);
    setLoading(false);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      const toInsert: ArtistCategoryInsert = {
        name: newName.trim(),
        slug: slugify(newName.trim()),
        sort_order: categories.length,
      };
      const { error } = await supabase.from('artist_categories').insert(toInsert);
      if (error) throw error;
      setNewName('');
      await loadCategories();
      onToast({ text: 'Category created', type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Create failed', type: 'error' });
    } finally {
      setAdding(false);
    }
  }

  async function handleSave(id: string, name: string, slug: string) {
    try {
      const { error } = await supabase
        .from('artist_categories')
        .update({ name, slug })
        .eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name, slug } : c));
      onToast({ text: 'Category updated', type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Update failed', type: 'error' });
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase
        .from('artist_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
      onToast({ text: 'Category deleted', type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Delete failed', type: 'error' });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-12 justify-center">
        <Loader2 size={18} className="animate-spin text-[#444]" />
        <span className="text-[#444] text-sm">Loading categories…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-lg font-semibold">Artist Categories</h2>
        <p className="text-[#555] text-sm mt-1">
          Define discipline groups for the public Artists page (e.g. Painters, Photographers, Graphic Designers).
        </p>
      </div>

      {/* Categories list */}
      <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="text-[#333] text-xs tracking-[0.2em] uppercase">Categories</span>
          <span className="text-[#333] text-xs font-mono">{categories.length} total</span>
        </div>

        <div className="px-5">
          {categories.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[#444] text-sm">No categories yet.</p>
              <p className="text-[#333] text-xs mt-1">Add your first category below.</p>
            </div>
          ) : (
            categories.map(cat => (
              <CategoryRow
                key={cat.id}
                cat={cat}
                onSave={handleSave}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* Add new */}
        <div className="px-5 py-4 border-t border-[#1a1a1a]">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }}}
              placeholder="New category name…"
              className="flex-1 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
          </div>
          <p className="text-[#333] text-xs mt-2 font-mono">
            Slug is auto-generated from the name. Click the pencil icon to edit existing categories.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

type Tab = 'backgrounds' | 'categories';

export default function AdminSiteSettings() {
  const [activeTab, setActiveTab]   = useState<Tab>('backgrounds');
  const [toasts, setToasts]         = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'backgrounds', label: 'Page Backgrounds' },
    { id: 'categories',  label: 'Artist Categories' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Site Settings</h1>
        <p className="text-[#555] text-sm mt-1">
          Configure hero backgrounds, artist categories, and global site options.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#1a1a1a] text-white border border-[#2a2a2a]'
                : 'text-[#555] hover:text-[#888]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Backgrounds */}
      {activeTab === 'backgrounds' && (
        <div className="space-y-8">
          <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl px-5 py-4 flex gap-3">
            <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-400 text-sm font-medium">SQL required</p>
              <p className="text-amber-500/70 text-xs mt-0.5 font-mono">
                Run the <span className="text-amber-400">supabase-schema.sql</span> additions in your Supabase SQL Editor if you haven't yet.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-1">
            {PAGES.map(p => (
              <PageSection key={p.key} config={p} onToast={addToast} />
            ))}
          </div>
        </div>
      )}

      {/* Tab: Artist Categories */}
      {activeTab === 'categories' && (
        <ArtistCategoriesTab onToast={addToast} />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
              t.type === 'success'
                ? 'bg-emerald-900 border border-emerald-500/30 text-emerald-300'
                : 'bg-red-900 border border-red-500/30 text-red-300'
            }`}
          >
            {t.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {t.text}
          </div>
        ))}
      </div>

    </div>
  );
}
