import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadImage } from '../lib/imageUpload';
import { slugify } from '../lib/slugify';
import type { DJInsert } from '../lib/database.types';
import { ArrowLeft, Upload, X, Loader2, Check, Instagram, Globe } from 'lucide-react';

const INPUT    = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#7c3aed]/40 transition-colors';
const TEXTAREA = INPUT + ' resize-none';

const BLANK: DJInsert = {
  name: '', slug: '', bio: null, photo_url: null,
  genres: [], social_links: {}, featured: false,
};

export default function AdminDJForm() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit   = !!id;

  const [form, setForm]           = useState<DJInsert>(BLANK);
  const [loading, setLoading]     = useState(isEdit);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [genreInput, setGenreInput] = useState('');

  const photoRef = useRef<HTMLInputElement>(null);

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
        const { error } = await supabase.from('djs').insert(form);
        if (error) throw error;
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
