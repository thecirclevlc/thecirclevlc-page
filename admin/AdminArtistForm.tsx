import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/imageUpload';
import { slugify } from '../lib/slugify';
import type { ArtistInsert, ArtistCategory } from '../lib/database.types';
import { ArrowLeft, Upload, X, Loader2, Check, Clock, Plus } from 'lucide-react';
import AdminHistory from './AdminHistory';
import { VideosEditor, LinksEditor, FactsEditor, SocialsEditor } from './ProfileExtras';

const INPUT    = 'w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-4 py-2.5 text-[var(--fg)] text-sm placeholder-[var(--fg-faint)] focus:outline-none focus:border-[var(--accent-line)] transition-colors';
const TEXTAREA = INPUT + ' resize-none';

const BLANK: ArtistInsert = {
  name: '', slug: '', bio: null, photo_url: null,
  based_in: null, press_kit_url: null, gallery_images: [], photo_position: 'center',
  genres: [], social_links: {}, featured: false, category_id: null,
  videos: [], links: [], facts: [], sort_order: 0,
};

export default function AdminArtistForm() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit   = !!id;

  const [form, setForm]               = useState<ArtistInsert>(BLANK);
  const [loading, setLoading]         = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [uploading, setUploading]     = useState(false);
  const [genreInput, setGenreInput]   = useState('');
  const [categories, setCategories]   = useState<ArtistCategory[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploadingGallery, setUGallery] = useState(false);

  const photoRef   = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Same gallery handlers as the DJ form — artists were missing them for
  // no reason other than the two forms having drifted apart.
  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUGallery(true);
    try {
      const urls = await Promise.all(Array.from(files).map(file => uploadImage(file, 'artists')));
      set('gallery_images', [...(form.gallery_images ?? []), ...urls]);
    } catch (err: any) {
      showToast('Gallery upload failed: ' + err.message, 'err');
    } finally { setUGallery(false); }
  }

  function removeGalleryImage(i: number) {
    set('gallery_images', (form.gallery_images ?? []).filter((_, j) => j !== i));
  }

  // Load categories on mount
  useEffect(() => {
    supabase
      .from('artist_categories')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setCategories(data as ArtistCategory[]);
      });
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('artists').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const { id: _, created_at, updated_at, ...rest } = data;
        setForm({ ...BLANK, ...rest });
      }
      setLoading(false);
    });
  }, [id]);

  function set<K extends keyof ArtistInsert>(field: K, value: ArtistInsert[K]) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'name' && !isEdit) next.slug = slugify(value as string);
      return next;
    });
  }

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'artists');
      set('photo_url', url);
    } catch (err: any) {
      showToast('Upload failed: ' + err.message, 'err');
    } finally { setUploading(false); }
  }

  function addGenre() {
    if (!genreInput.trim()) return;
    set('genres', [...(form.genres ?? []), genreInput.trim()]);
    setGenreInput('');
  }
  function removeGenre(i: number) {
    set('genres', (form.genres ?? []).filter((_, idx) => idx !== i));
  }
  function setSocial(key: string, val: string) {
    set('social_links', { ...(form.social_links ?? {}), [key]: val || undefined });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Name is required.', 'err'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from('artists').update(form).eq('id', id!);
        if (error) throw error;
        showToast('Artist saved!', 'ok');
      } else {
        const { error } = await supabase.from('artists').insert(form);
        if (error) throw error;
        showToast('Artist created!', 'ok');
        setTimeout(() => navigate('/admin/artists'), 1200);
      }
    } catch (err: any) {
      showToast(err.message ?? 'Save failed.', 'err');
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="text-[var(--tc-brand-ink)] animate-spin" /></div>;
  }

  const socials = form.social_links as Record<string, string>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium ${
          toast.type === 'ok' ? 'bg-[var(--surface-3)] border border-[var(--line-strong)] text-[var(--fg-muted)]' : 'bg-[var(--danger-soft)] border border-[var(--danger-line)] text-[var(--danger)]'
        }`}>
          {toast.type === 'ok' ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/artists')} className="text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-[var(--fg)] text-2xl font-bold">{isEdit ? 'Edit Artist' : 'New Artist'}</h1>
          <p className="text-[var(--fg-faint)] text-sm mt-0.5">{isEdit ? 'Update artist profile' : 'Add a new artist'}</p>
        </div>
        {isEdit && id && (
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-2 px-3 py-2 border border-[var(--line)] hover:border-[var(--line-strong)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] text-xs transition-colors"
            title="View change history"
          >
            <Clock size={13} />
            <span className="hidden sm:inline">History</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── PROFILE ─────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-4">
          <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Profile</p>

          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[var(--surface-3)] border border-[var(--line-strong)] flex items-center justify-center">
                {form.photo_url
                  ? <img src={form.photo_url} alt="Photo" className="w-full h-full object-cover" />
                  : <span className="text-[var(--fg-faint)] text-xl font-bold">{form.name?.slice(0,2).toUpperCase() || 'AR'}</span>
                }
              </div>
            </div>
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex gap-2">
                <button type="button" onClick={() => photoRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 border border-dashed border-[var(--line-strong)] hover:border-[var(--line-strong)] rounded-lg px-3 py-2 text-[var(--fg-faint)] hover:text-[var(--fg-muted)] text-sm transition-all">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Uploading…' : 'Upload photo'}
                </button>
                {form.photo_url && (
                  <button type="button" onClick={() => set('photo_url', null)}
                    className="p-2 text-[var(--fg-faint)] hover:text-[var(--danger)] transition-colors"><X size={14} /></button>
                )}
              </div>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <p className="text-[var(--fg-faint)] text-xs">Square image recommended. Max 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-2">Name *</label>
              <input type="text" required value={form.name}
                onChange={e => set('name', e.target.value)}
                className={INPUT} placeholder="Artist Name" />
            </div>
            <div>
              <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-2">Slug</label>
              <input type="text" value={form.slug ?? ''}
                onChange={e => set('slug', e.target.value)}
                className={INPUT + ' font-mono'} placeholder="artist-name" />
            </div>
          </div>

          <div>
            <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-2">Bio</label>
            <textarea rows={3} value={form.bio ?? ''}
              onChange={e => set('bio', e.target.value || null)}
              className={TEXTAREA} placeholder="Short bio…" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-2">Based in</label>
              <input type="text" value={form.based_in ?? ''}
                onChange={e => set('based_in', e.target.value || null)}
                className={INPUT} placeholder="Valencia, Spain" />
            </div>
            <div>
              <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-2">Press Kit URL</label>
              <input type="url" value={form.press_kit_url ?? ''}
                onChange={e => set('press_kit_url', e.target.value || null)}
                className={INPUT} placeholder="https://…" />
            </div>
          </div>
        </section>

        {/* ── GALLERY ──────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-3">
          <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Photo Gallery</p>
          <p className="text-[var(--fg-faint)] text-xs font-mono">Additional photos shown in the artist profile.</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {(form.gallery_images ?? []).map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                <button type="button" onClick={() => removeGalleryImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-[var(--scrim)] rounded-full flex items-center justify-center text-[var(--on-accent)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--danger)] hover:text-[var(--on-danger)]">
                  <X size={10} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => galleryRef.current?.click()} disabled={uploadingGallery}
              className="aspect-square border border-dashed border-[var(--line-strong)] hover:border-[var(--line-strong)] rounded-lg flex items-center justify-center text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-all">
              {uploadingGallery ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
          <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
        </section>

        {/* ── CATEGORY ────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-3">
          <div>
            <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Discipline Category</p>
            <p className="text-[var(--fg-faint)] text-xs mt-1 font-mono">
              Groups this artist in the public Artists page. Manage categories in Site Settings → Artist Categories.
            </p>
          </div>

          {categories.length === 0 ? (
            <p className="text-[var(--fg-faint)] text-sm italic">
              No categories yet.{' '}
              <a
                href="/admin/settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--tc-brand-ink)] hover:underline"
              >
                Create categories in Site Settings →
              </a>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {/* "None" option */}
              <button
                type="button"
                onClick={() => set('category_id', null)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                  form.category_id === null
                    ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--tc-brand-ink)]'
                    : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:border-[var(--line-strong)] hover:text-[var(--fg-muted)]'
                }`}
              >
                None
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => set('category_id', cat.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    form.category_id === cat.id
                      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--tc-brand-ink)]'
                      : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:border-[var(--line-strong)] hover:text-[var(--fg-muted)]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── GENRES ──────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-3">
          <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Genres / Disciplines</p>
          <div className="flex flex-wrap gap-2">
            {(form.genres ?? []).map((g, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-[var(--accent-soft)] border border-[var(--accent-line)] rounded-full px-3 py-1 text-xs text-[var(--tc-brand-ink)]">
                {g}
                <button type="button" onClick={() => removeGenre(i)} className="hover:text-[var(--fg)] transition-colors"><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={genreInput}
              onChange={e => setGenreInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGenre(); }}}
              className={INPUT + ' flex-1'} placeholder="Photography, Painting…" />
            <button type="button" onClick={addGenre}
              className="px-3 py-2.5 bg-[var(--surface-3)] border border-[var(--line)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm transition-colors">
              Add
            </button>
          </div>
        </section>

        <SocialsEditor socials={form.social_links ?? {}} onChange={v => set('social_links', v)} />

        <VideosEditor videos={form.videos ?? []} onChange={v => set('videos', v)} />

        <LinksEditor links={form.links ?? []} onChange={v => set('links', v)} />

        <FactsEditor facts={form.facts ?? []} onChange={v => set('facts', v)} />

        {/* ── SETTINGS ─────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--fg)] text-sm">Featured</p>
              <p className="text-[var(--fg-faint)] text-xs mt-0.5">Show in featured artist sections</p>
            </div>
            <button type="button" onClick={() => set('featured', !form.featured)}
              className={`relative rounded-full transition-colors flex-shrink-0 ${form.featured ? 'bg-[var(--tc-brand)]' : 'bg-[var(--surface-3)] border border-[var(--line-strong)]'}`}
              style={{ height: '22px', width: '40px' }}>
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-[var(--fg)] shadow transition-transform ${form.featured ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} />
            </button>
          </div>
        </section>

        {/* ── SUBMIT ───────────────────────────────────────── */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/admin/artists')}
            className="px-5 py-3 border border-[var(--line)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--line-strong)] text-sm transition-all">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[var(--tc-brand)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[var(--on-accent)] px-6 py-3 rounded-lg text-sm font-medium transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Artist'}
          </button>
        </div>

      </form>

      {isEdit && id && (
        <AdminHistory
          tableName="artists"
          rowId={id}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onRestored={() => window.location.reload()}
        />
      )}
    </div>
  );
}
