import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Trash2, Image, Image as ImageIcon, Film, Ban, Loader2, CheckCircle, AlertCircle,
  Plus, GripVertical, Pencil, Check, X, Eye, Save,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, uploadVideo, deleteImage } from '../lib/imageUpload';
import { slugify } from '../lib/slugify';
import type {
  PageBackground,
  PageKey,
  ArtistCategory,
  ArtistCategoryInsert,
  MetaSeo,
} from '../lib/database.types';
import { META_SEO_DEFAULTS, META_SEO_KEY } from '../lib/database.types';
import { useSearchParams } from 'react-router-dom';

// ── Types ─────────────────────────────────────────────────────────

interface PageConfig {
  key:   PageKey;
  label: string;
  desc:  string;
}

const PAGES: PageConfig[] = [
  { key: 'page_home',    label: 'Home Page',    desc: 'Behind the spinning circle on /' },
  { key: 'page_events',  label: 'Events Page',  desc: 'Hero background on /past-events' },
  { key: 'page_djs',     label: 'DJs Page',     desc: 'Hero background on /djs' },
  { key: 'page_artists', label: 'Artists Page', desc: 'Hero background on /artists' },
  { key: 'page_form',    label: 'Form Page',    desc: 'Behind the application form on /form' },
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
      }, () => setLoading(false));
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
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-6 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-[var(--fg-faint)]" />
        <span className="text-[var(--fg-faint)] text-sm">Loading {config.label}…</span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--line)] flex items-center justify-between">
        <div>
          <h3 className="text-[var(--fg)] font-semibold text-sm tracking-wide">{config.label}</h3>
          <p className="text-[var(--fg-faint)] text-xs mt-0.5">{config.desc}</p>
        </div>
        {bg.bg_type !== 'none' && (
          <span className={`text-[10px] font-mono px-2 py-1 rounded border uppercase tracking-widest ${
            bg.bg_type === 'video'
              ? 'border-[var(--line-strong)] text-[var(--fg-muted)] bg-[var(--surface-3)]'
              : 'border-[var(--line-strong)] text-[var(--fg-muted)] bg-[var(--surface-3)]'
          }`}>
            {bg.bg_type}
          </span>
        )}
      </div>

      <div className="p-6 space-y-5">
        {bg.bg_url && bg.bg_type !== 'none' ? (
          <div className="relative rounded-lg overflow-hidden bg-[var(--scrim)] aspect-video">
            {bg.bg_type === 'video' ? (
              <video src={bg.bg_url} autoPlay loop muted playsInline className="w-full h-full object-cover opacity-80" />
            ) : (
              <img src={bg.bg_url} alt="Background preview" className="w-full h-full object-cover opacity-80" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--img-shade)] to-transparent" />
            <button
              onClick={handleRemove}
              disabled={saving || uploading}
              className="absolute top-3 right-3 p-1.5 bg-[var(--danger)] hover:opacity-90 rounded-lg transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} className="text-[var(--on-danger)]" />
            </button>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-[var(--line-strong)] aspect-video flex items-center justify-center">
            <div className="text-center">
              <Ban size={28} className="mx-auto text-[var(--fg-faint)] mb-2" />
              <p className="text-[var(--fg-faint)] text-xs font-mono">NO BACKGROUND SET</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => imgRef.current?.click()}
            disabled={uploading || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--surface-3)] hover:bg-[var(--surface-3)] border border-[var(--line-strong)] hover:border-[var(--accent-line)] rounded-lg text-sm text-[var(--fg-muted)] hover:text-[var(--fg)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
            <span>Image</span>
          </button>
          <button
            onClick={() => videoRef.current?.click()}
            disabled={uploading || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--surface-3)] hover:bg-[var(--surface-3)] border border-[var(--line-strong)] hover:border-[var(--line-strong)] rounded-lg text-sm text-[var(--fg-muted)] hover:text-[var(--fg-muted)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Film size={14} />}
            <span>Video</span>
          </button>
          {bg.bg_url && (
            <button
              onClick={handleRemove}
              disabled={uploading || saving}
              className="px-4 py-2.5 bg-[var(--surface-3)] hover:bg-[var(--danger-soft)] border border-[var(--line-strong)] hover:border-[var(--danger-line)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--danger)] transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          )}
        </div>
        <p className="text-[var(--fg-faint)] text-xs font-mono">
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
    <div className="flex items-center gap-3 py-2.5 border-b border-[var(--line)] last:border-0 group">
      <GripVertical size={14} className="text-[var(--fg-faint)] flex-shrink-0" />

      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') { setEditing(false); setName(cat.name); }
          }}
          className="flex-1 bg-[var(--surface-2)] border border-[var(--line-strong)] rounded-lg px-3 py-1.5 text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--accent-line)]"
        />
      ) : (
        <span className="flex-1 text-[var(--fg)] text-sm">{cat.name}</span>
      )}

      <span className="text-[var(--fg-faint)] text-xs font-mono hidden sm:block">{cat.slug}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <>
            <button
              onClick={commitEdit}
              disabled={saving}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--tc-brand-ink)] hover:bg-[var(--accent-soft)] transition-colors"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            </button>
            <button
              onClick={() => { setEditing(false); setName(cat.name); }}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors"
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(cat.id)}
              className="w-6 h-6 flex items-center justify-center rounded text-[var(--fg-faint)] hover:text-[var(--danger)] transition-colors"
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
        <Loader2 size={18} className="animate-spin text-[var(--fg-faint)]" />
        <span className="text-[var(--fg-faint)] text-sm">Loading categories…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[var(--fg)] text-lg font-semibold">Artist Categories</h2>
        <p className="text-[var(--fg-muted)] text-sm mt-1">
          Define discipline groups for the public Artists page (e.g. Painters, Photographers, Graphic Designers).
        </p>
      </div>

      {/* Categories list */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--line)] flex items-center justify-between">
          <span className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Categories</span>
          <span className="text-[var(--fg-faint)] text-xs font-mono">{categories.length} total</span>
        </div>

        <div className="px-5">
          {categories.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[var(--fg-faint)] text-sm">No categories yet.</p>
              <p className="text-[var(--fg-faint)] text-xs mt-1">Add your first category below.</p>
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
        <div className="px-5 py-4 border-t border-[var(--line)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }}}
              placeholder="New category name…"
              className="flex-1 bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm placeholder-[var(--fg-faint)] focus:outline-none focus:border-[var(--accent-line)] transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !newName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-[var(--tc-brand)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[var(--on-accent)] rounded-lg text-sm font-medium transition-colors"
            >
              {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Add
            </button>
          </div>
          <p className="text-[var(--fg-faint)] text-xs mt-2 font-mono">
            Slug is auto-generated from the name. Click the pencil icon to edit existing categories.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── SEO / Link Preview Section ────────────────────────────────────

interface SeoSectionProps {
  onToast: (t: ToastMsg) => void;
}

function SeoSection({ onToast }: SeoSectionProps) {
  const [values, setValues]   = useState<MetaSeo>(META_SEO_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [busy, setBusy]       = useState<'og_image' | 'favicon_url' | null>(null);

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('id', META_SEO_KEY)
      .single()
      .then(({ data, error }) => {
        if (!error && data?.value) setValues({ ...META_SEO_DEFAULTS, ...(data.value as MetaSeo) });
        setLoading(false);
      }, () => setLoading(false));
  }, []);

  const update = (field: keyof MetaSeo, v: string) => {
    setValues(prev => ({ ...prev, [field]: v }));
    setDirty(true);
  };

  const pickImage = (field: 'og_image' | 'favicon_url') =>
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setBusy(field);
      try {
        update(field, await uploadImage(file, 'site'));
      } catch (err: any) {
        onToast({ text: err.message ?? 'Upload failed', type: 'error' });
      } finally {
        setBusy(null);
        e.target.value = '';
      }
    };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id:         META_SEO_KEY,
          value:      values,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
      setDirty(false);
      onToast({ text: 'SEO metadata saved', type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-6 flex items-center gap-3">
        <Loader2 size={16} className="animate-spin text-[var(--fg-faint)]" />
        <span className="text-[var(--fg-faint)] text-sm">Loading SEO settings…</span>
      </div>
    );
  }

  const fields: { key: keyof MetaSeo; label: string; hint: string }[] = [
    { key: 'title',               label: 'Browser Tab Title',  hint: 'The <title> tag — shown in browser tabs.' },
    { key: 'description',         label: 'Meta Description',   hint: 'Standard search-engine description.' },
    { key: 'og_title',            label: 'OG Title',           hint: 'Title shown by WhatsApp, Facebook, LinkedIn previews.' },
    { key: 'og_description',      label: 'OG Description',     hint: 'Subtitle shown by WhatsApp, Facebook, LinkedIn previews.' },
    { key: 'twitter_title',       label: 'Twitter Title',      hint: 'Title shown in X/Twitter previews.' },
    { key: 'twitter_description', label: 'Twitter Description',hint: 'Subtitle shown in X/Twitter previews.' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[var(--fg)] text-lg font-semibold">SEO / Link Preview</h2>
        <p className="text-[var(--fg-muted)] text-sm mt-1">
          Text shown when someone shares thecirclevlc.com on WhatsApp, Facebook, Twitter, or search engines.
        </p>
      </div>

      <div className="bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-xl px-5 py-4 flex gap-3">
        <AlertCircle size={16} className="text-[var(--fg-muted)] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-[var(--fg-muted)] text-sm font-medium">WhatsApp caches link previews</p>
          <p className="text-[var(--fg-muted)] text-xs mt-0.5 font-mono">
            After saving, new previews will show updated text — but WhatsApp may keep showing the old preview for messages already sent. Use a fresh URL or the Facebook Sharing Debugger to force a refresh.
          </p>
        </div>
      </div>

      {/* Live preview card */}
      <div className="bg-[var(--surface-2)] border border-[var(--line)] rounded-xl p-6">
        <div className="flex items-center gap-2 mb-3">
          <Eye size={14} className="text-[var(--fg-muted)]" />
          <span className="text-[var(--fg-muted)] text-xs tracking-[0.2em] uppercase">Preview</span>
        </div>
        <div className="max-w-md bg-[var(--surface-1)] rounded-lg overflow-hidden border border-[var(--line-strong)]">
          <div className="aspect-[1200/630] bg-gradient-to-br from-[var(--accent-soft)] to-[var(--surface-3)] flex items-center justify-center overflow-hidden">
            {values.og_image
              ? <img src={values.og_image} alt="" className="w-full h-full object-cover" />
              : <span className="text-[var(--tc-brand-ink)] font-bold text-2xl tracking-widest">THECIRCLE</span>}
          </div>
          <div className="p-4 space-y-1">
            <p className="text-[var(--fg)] font-semibold text-sm leading-tight">
              {values.og_title || '\u2014'}
            </p>
            <p className="text-[var(--fg-muted)] text-xs leading-snug">
              {values.og_description || '\u2014'}
            </p>
            <p className="text-[var(--fg-muted)] text-[11px] mt-2">thecirclevlc.com</p>
          </div>
        </div>
      </div>

      {/* Pictures */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {([
            { key: 'og_image',    label: 'Share picture',
              hint: 'Shown when the site is shared. 1200 × 630 works everywhere. Events and profiles use their own picture instead.',
              box: 'w-full aspect-[1200/630]' },
            { key: 'favicon_url', label: 'Browser tab icon',
              hint: 'The small icon in the tab. A square PNG of 64 px or more.',
              box: 'w-16 h-16' },
          ] as const).map(f => (
            <div key={f.key}>
              <label className="block text-[var(--fg)] text-xs font-medium tracking-wide mb-1.5">{f.label}</label>
              <div className="flex items-start gap-3">
                <div className={`${f.box} flex-shrink-0 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] overflow-hidden flex items-center justify-center`}>
                  {values[f.key]
                    ? <img src={values[f.key]} alt="" className="w-full h-full object-cover" />
                    : <ImageIcon size={16} className="text-[var(--fg-faint)]" />}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--surface-3)] hover:bg-[var(--surface-3)] text-[var(--fg)] text-xs cursor-pointer transition-colors w-fit">
                    {busy === f.key ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    {values[f.key] ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden"
                      disabled={busy !== null} onChange={pickImage(f.key)} />
                  </label>
                  {values[f.key] && (
                    <button onClick={() => update(f.key, '')}
                      className="text-[var(--fg-muted)] hover:text-[var(--danger)] text-xs text-left transition-colors">
                      Remove
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[var(--fg-faint)] text-xs mt-2 font-mono leading-relaxed">{f.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-6 space-y-5">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-[var(--fg)] text-xs font-medium tracking-wide mb-1.5">
              {f.label}
            </label>
            <input
              type="text"
              value={values[f.key]}
              onChange={e => update(f.key, e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm placeholder-[var(--fg-faint)] focus:outline-none focus:border-[var(--accent-line)] transition-colors"
            />
            <p className="text-[var(--fg-faint)] text-xs mt-1 font-mono">{f.hint}</p>
          </div>
        ))}

        <div className="flex justify-end pt-2 border-t border-[var(--line)]">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--tc-brand)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--on-accent)] rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving\u2026' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

type Tab = 'backgrounds' | 'categories' | 'seo';

export default function AdminSiteSettings() {
  const [params, setParams] = useSearchParams();
  const activeTab = (params.get('tab') as Tab) || 'backgrounds';
  const setActiveTab = (t: Tab) =>
    setParams(t === 'backgrounds' ? {} : { tab: t }, { replace: true });
  const [toasts, setToasts]         = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'backgrounds', label: 'Page Backgrounds' },
    { id: 'categories',  label: 'Artist Categories' },
    { id: 'seo',         label: 'SEO / Link Preview' },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--fg)] tracking-tight">Site Settings</h1>
        <p className="text-[var(--fg-muted)] text-sm mt-1">
          Configure hero backgrounds, artist categories, and global site options.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--line)] rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--surface-3)] text-[var(--fg)] border border-[var(--line-strong)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg-muted)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Backgrounds */}
      {activeTab === 'backgrounds' && (
        <div className="space-y-8">
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

      {/* Tab: SEO */}
      {activeTab === 'seo' && (
        <SeoSection onToast={addToast} />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-xl text-sm font-medium transition-all ${
              t.type === 'success'
                ? 'bg-[var(--surface-3)] border border-[var(--line-strong)] text-[var(--fg-muted)]'
                : 'bg-[var(--danger-soft)] border border-[var(--danger-line)] text-[var(--danger)]'
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
