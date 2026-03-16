import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/imageUpload';
import { slugify } from '../lib/slugify';
import type { DJInsert } from '../lib/database.types';
import { ArrowLeft, Upload, X, Loader2, Check, Instagram, Globe, Plus } from 'lucide-react';
import { useAutosave } from '../lib/useAutosave';

const INPUT    = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#7c3aed]/40 transition-colors';
const TEXTAREA = INPUT + ' resize-none';

const BLANK: DJInsert = {
  name: '', slug: '', bio: null, photo_url: null, based_in: null,
  press_kit_url: null, gallery_images: [], photo_position: 'center',
  genres: [], social_links: {}, featured: false,
};

export default function AdminDJForm() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit   = !!id;
  const [dbId, setDbId] = useState<string | null>(id ?? null);

  const [form, setForm]           = useState<DJInsert>(BLANK);
  const [loading, setLoading]     = useState(isEdit);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [genreInput, setGenreInput] = useState('');

  const photoRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploadingGallery, setUGallery] = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    supabase.from('djs').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const { id: _, created_at, updated_at, ...rest } = data;
        setForm({ ...BLANK, ...rest });
      }
      setLoading(false);
    });
  }, [id]);

  function set<K extends keyof DJInsert>(field: K, value: DJInsert[K]) {
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

  const autoSaveToDb = React.useCallback(async (data: DJInsert) => {
    if (!dbId) return;
    await supabase.from('djs').update(data).eq('id', dbId);
  }, [dbId]);

  const { status: autosaveStatus } = useAutosave({
    data: form,
    onSave: autoSaveToDb,
    delay: 3000,
    enabled: !!dbId,
  });

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file, 'djs');
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

  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUGallery(true);
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f, 'djs/gallery')));
      set('gallery_images', [...(form.gallery_images ?? []), ...urls]);
    } catch (err: any) {
      showToast('Gallery upload failed: ' + err.message, 'err');
    } finally { setUGallery(false); }
  }

  function removeGalleryImage(i: number) {
    set('gallery_images', (form.gallery_images ?? []).filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { showToast('Name is required.', 'err'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from('djs').update(form).eq('id', id!);
        if (error) throw error;
        showToast('DJ saved!', 'ok');
      } else {
        const { data, error } = await supabase.from('djs').insert(form).select('id').single();
        if (error) throw error;
        setDbId(data.id);
        showToast('DJ created!', 'ok');
        setTimeout(() => navigate('/admin/djs'), 1200);
      }
    } catch (err: any) {
      showToast(err.message ?? 'Save failed.', 'err');
    } finally { setSaving(false); }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="text-[#7c3aed] animate-spin" /></div>;
  }

  const socials = form.social_links as Record<string, string>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">

      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium ${
          toast.type === 'ok' ? 'bg-green-950 border border-green-800 text-green-400' : 'bg-red-950 border border-red-800 text-red-400'
        }`}>
          {toast.type === 'ok' ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/djs')} className="text-[#444] hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white text-2xl font-bold">{isEdit ? 'Edit DJ' : 'New DJ'}</h1>
          <p className="text-[#444] text-sm mt-0.5">{isEdit ? 'Update DJ profile' : 'Add a new DJ'}</p>
            {dbId && autosaveStatus !== 'idle' && (
              <span className={`text-xs font-mono tracking-wider mt-1 ${
                autosaveStatus === 'saving' ? 'text-yellow-500' :
                autosaveStatus === 'saved' ? 'text-green-500' :
                autosaveStatus === 'error' ? 'text-red-500' : 'text-[#444]'
              }`}>
                {autosaveStatus === 'saving' ? 'Saving...' :
                 autosaveStatus === 'saved' ? 'Saved' :
                 autosaveStatus === 'error' ? 'Save failed' : ''}
              </span>
            )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── PROFILE ─────────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
          <p className="text-[#333] text-xs tracking-[0.2em] uppercase">Profile</p>

          {/* Photo */}
          <div className="flex items-start gap-5">
            <div className="flex-shrink-0">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-[#1a1a1a] border border-[#222] flex items-center justify-center">
                {form.photo_url
                  ? <img src={form.photo_url} alt="Photo" className="w-full h-full object-cover" />
                  : <span className="text-[#333] text-xl font-bold">{form.name?.slice(0,2).toUpperCase() || 'DJ'}</span>
                }
              </div>
            </div>
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex gap-2">
                <button type="button" onClick={() => photoRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-2 border border-dashed border-[#222] hover:border-[#333] rounded-lg px-3 py-2 text-[#444] hover:text-[#888] text-sm transition-all">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploading ? 'Uploading…' : 'Upload photo'}
                </button>
                {form.photo_url && (
                  <button type="button" onClick={() => set('photo_url', null)}
                    className="p-2 text-[#444] hover:text-red-400 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
              <input ref={photoRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <p className="text-[#333] text-xs">Square image recommended. Max 5MB.</p>
            </div>
          </div>

          {form.photo_url && (
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Photo Focus</label>
              <div className="flex gap-1.5">
                {['top', 'center', 'bottom'].map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => set('photo_position', pos)}
                    className={`px-3 py-1.5 text-xs font-mono rounded border transition-all ${
                      form.photo_position === pos
                        ? 'border-[#7c3aed]/50 bg-[#7c3aed]/10 text-white'
                        : 'border-[#1e1e1e] text-[#555] hover:border-[#2a2a2a] hover:text-[#888]'
                    }`}
                  >
                    {pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
              <div className="mt-3 w-20 h-28 rounded overflow-hidden border border-[#222]">
                <img src={form.photo_url} alt="Preview" className="w-full h-full object-cover"
                  style={{ objectPosition: form.photo_position ?? 'center' }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Name *</label>
              <input type="text" required value={form.name}
                onChange={e => set('name', e.target.value)}
                className={INPUT} placeholder="DJ Name" />
            </div>
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Slug</label>
              <input type="text" value={form.slug ?? ''}
                onChange={e => set('slug', e.target.value)}
                className={INPUT + ' font-mono'} placeholder="dj-name" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Based in</label>
              <input type="text" value={form.based_in ?? ''}
                onChange={e => set('based_in', e.target.value || null)}
                className={INPUT} placeholder="Valencia, Spain" />
            </div>
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Press Kit URL</label>
              <input type="url" value={form.press_kit_url ?? ''}
                onChange={e => set('press_kit_url', e.target.value || null)}
                className={INPUT} placeholder="https://drive.google.com/..." />
            </div>
          </div>

          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Bio</label>
            <textarea rows={3} value={form.bio ?? ''}
              onChange={e => set('bio', e.target.value || null)}
              className={TEXTAREA} placeholder="Short bio…" />
          </div>
        </section>

        {/* ── GENRES ──────────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-3">
          <p className="text-[#333] text-xs tracking-[0.2em] uppercase">Genres</p>
          <div className="flex flex-wrap gap-2">
            {(form.genres ?? []).map((g, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-[#7c3aed]/10 border border-[#7c3aed]/20 rounded-full px-3 py-1 text-xs text-[#a78bfa]">
                {g}
                <button type="button" onClick={() => removeGenre(i)} className="hover:text-white transition-colors"><X size={10} /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={genreInput}
              onChange={e => setGenreInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGenre(); }}}
              className={INPUT + ' flex-1'} placeholder="Techno, House, Ambient…" />
            <button type="button" onClick={addGenre}
              className="px-3 py-2.5 bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg text-[#666] hover:text-white text-sm transition-colors">
              Add
            </button>
          </div>
        </section>

        {/* ── SOCIAL LINKS ─────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
          <p className="text-[#333] text-xs tracking-[0.2em] uppercase">Social Links</p>
          {[
            { key: 'instagram',  label: 'Instagram',   placeholder: 'https://instagram.com/…' },
            { key: 'soundcloud', label: 'SoundCloud',  placeholder: 'https://soundcloud.com/…' },
            { key: 'spotify',    label: 'Spotify',     placeholder: 'https://open.spotify.com/…' },
            { key: 'website',    label: 'Website',     placeholder: 'https://…' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">{label}</label>
              <input type="url" value={socials[key] ?? ''}
                onChange={e => setSocial(key, e.target.value)}
                className={INPUT} placeholder={placeholder} />
            </div>
          ))}
        </section>

        {/* ── GALLERY ──────────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-3">
          <p className="text-[#333] text-xs tracking-[0.2em] uppercase">Photo Gallery</p>
          <p className="text-[#333] text-xs font-mono">Additional photos shown in the DJ profile.</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
            {(form.gallery_images ?? []).map((url, i) => (
              <div key={i} className="relative group aspect-square">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                <button type="button" onClick={() => removeGalleryImage(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900">
                  <X size={10} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => galleryRef.current?.click()} disabled={uploadingGallery}
              className="aspect-square border border-dashed border-[#222] hover:border-[#333] rounded-lg flex items-center justify-center text-[#444] hover:text-[#888] transition-all">
              {uploadingGallery ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            </button>
          </div>
          <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
        </section>

        {/* ── SETTINGS ─────────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Featured</p>
              <p className="text-[#444] text-xs mt-0.5">Show in featured DJ sections</p>
            </div>
            <button type="button" onClick={() => set('featured', !form.featured)}
              className={`relative rounded-full transition-colors flex-shrink-0 ${form.featured ? 'bg-[#7c3aed]' : 'bg-[#1e1e1e] border border-[#2a2a2a]'}`}
              style={{ height: '22px', width: '40px' }}>
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${form.featured ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} />
            </button>
          </div>
        </section>

        {/* ── SUBMIT ───────────────────────────────────────── */}
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/admin/djs')}
            className="px-5 py-3 border border-[#1e1e1e] rounded-lg text-[#555] hover:text-white hover:border-[#2a2a2a] text-sm transition-all">
            Cancel
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create DJ'}
          </button>
        </div>

      </form>
    </div>
  );
}
