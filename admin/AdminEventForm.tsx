import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadImage, uploadVideo, deleteVideo } from '../lib/imageUpload';
import { slugify } from '../lib/slugify';
import type { EventInsert } from '../lib/database.types';
import { ArrowLeft, Upload, X, Loader2, Plus, Check, Film } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}

const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#C42121]/40 transition-colors';
const TEXTAREA = INPUT + ' resize-none';

// ── initial state ─────────────────────────────────────────────────

const BLANK: EventInsert = {
  title: '', slug: '', event_number: null, date: null, time: null,
  venue: null, description: null, short_description: null, cover_image_url: null, hero_video_url: null,
  gallery_images: [], ticket_url: null, lineup: [], tags: [],
  attendees: null, status: 'draft', featured: false,
};

// ── component ────────────────────────────────────────────────────

export default function AdminEventForm() {
  const { id }      = useParams<{ id: string }>();
  const navigate    = useNavigate();
  const isEdit      = !!id;

  const [form, setForm]               = useState<EventInsert>(BLANK);
  const [loading, setLoading]         = useState(isEdit);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const [uploadingCover, setUCover]   = useState(false);
  const [uploadingGallery, setUGallery] = useState(false);
  const [uploadingVideo, setUVideo]   = useState(false);
  const [lineupInput, setLineupInput] = useState('');
  const [tagInput, setTagInput]       = useState('');

  const coverRef   = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLInputElement>(null);

  // ── load existing event ──────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    supabase.from('events').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const { id: _, created_at, updated_at, ...rest } = data;
        setForm({ ...BLANK, ...rest });
      }
      setLoading(false);
    });
  }, [id]);

  // ── field setter ─────────────────────────────────────────────
  function set<K extends keyof EventInsert>(field: K, value: EventInsert[K]) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'title' && !isEdit) next.slug = slugify(value as string);
      return next;
    });
  }

  // ── toast helper ─────────────────────────────────────────────
  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── cover image upload ───────────────────────────────────────
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUCover(true);
    try {
      const url = await uploadImage(file, 'events/covers');
      set('cover_image_url', url);
    } catch (err: any) {
      showToast('Cover upload failed: ' + err.message, 'err');
    } finally { setUCover(false); }
  }

  // ── hero video upload ────────────────────────────────────────
  async function handleVideoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUVideo(true);
    try {
      if (form.hero_video_url) await deleteVideo(form.hero_video_url).catch(() => {});
      const url = await uploadVideo(file, 'events/hero-videos');
      set('hero_video_url', url);
    } catch (err: any) {
      showToast('Video upload failed: ' + err.message, 'err');
    } finally {
      setUVideo(false);
      if (videoRef.current) videoRef.current.value = '';
    }
  }

  // ── gallery upload ───────────────────────────────────────────
  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUGallery(true);
    try {
      const urls = await Promise.all(files.map(f => uploadImage(f, 'events/gallery')));
      set('gallery_images', [...(form.gallery_images ?? []), ...urls]);
    } catch (err: any) {
      showToast('Gallery upload failed: ' + err.message, 'err');
    } finally { setUGallery(false); }
  }

  // ── lineup / tags helpers ────────────────────────────────────
  function addLineup() {
    if (!lineupInput.trim()) return;
    set('lineup', [...(form.lineup ?? []), lineupInput.trim()]);
    setLineupInput('');
  }
  function removeLineup(i: number) {
    set('lineup', (form.lineup ?? []).filter((_, idx) => idx !== i));
  }
  function addTag() {
    if (!tagInput.trim()) return;
    set('tags', [...(form.tags ?? []), tagInput.trim()]);
    setTagInput('');
  }
  function removeTag(i: number) {
    set('tags', (form.tags ?? []).filter((_, idx) => idx !== i));
  }
  function removeGallery(i: number) {
    set('gallery_images', (form.gallery_images ?? []).filter((_, idx) => idx !== i));
  }

  // ── save ─────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { showToast('Title is required.', 'err'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        const { error } = await supabase.from('events').update(form).eq('id', id!);
        if (error) throw error;
        showToast('Event saved!', 'ok');
      } else {
        const { error } = await supabase.from('events').insert(form);
        if (error) throw error;
        showToast('Event created!', 'ok');
        setTimeout(() => navigate('/admin/events'), 1200);
      }
    } catch (err: any) {
      showToast(err.message ?? 'Save failed.', 'err');
    } finally { setSaving(false); }
  }

  // ── loading skeleton ─────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="text-[#C42121] animate-spin" />
      </div>
    );
  }

  // ── render ───────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium transition-all ${
          toast.type === 'ok'
            ? 'bg-green-950 border border-green-800 text-green-400'
            : 'bg-red-950 border border-red-800 text-red-400'
        }`}>
          {toast.type === 'ok' ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/events')} className="text-[#444] hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white text-2xl font-bold">{isEdit ? 'Edit Event' : 'New Event'}</h1>
          <p className="text-[#444] text-sm mt-0.5">{isEdit ? 'Update event details' : 'Fill in the details below'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── BASIC INFO ─────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
          <p className="text-[#333] text-xs tracking-[0.2em] uppercase">Basic Info</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Title *">
              <input
                type="text" required value={form.title}
                onChange={e => set('title', e.target.value)}
                className={INPUT} placeholder="VOL. III"
              />
            </Field>
            <Field label="Slug">
              <input
                type="text" value={form.slug ?? ''}
                onChange={e => set('slug', e.target.value)}
                className={INPUT + ' font-mono'} placeholder="vol-iii"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Event Number">
              <input
                type="text" value={form.event_number ?? ''}
                onChange={e => set('event_number', e.target.value || null)}
                className={INPUT} placeholder="VOL. III"
              />
            </Field>
            <Field label="Venue">
              <input
                type="text" value={form.venue ?? ''}
                onChange={e => set('venue', e.target.value || null)}
                className={INPUT} placeholder="Secret Location, Valencia"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label="Date">
              <input
                type="date" value={form.date ?? ''}
                onChange={e => set('date', e.target.value || null)}
                className={INPUT}
              />
            </Field>
            <Field label="Time">
              <input
                type="text" value={form.time ?? ''}
                onChange={e => set('time', e.target.value || null)}
                className={INPUT} placeholder="23:00"
              />
            </Field>
            <Field label="Attendees">
              <input
                type="number" min="0" value={form.attendees ?? ''}
                onChange={e => set('attendees', e.target.value ? Number(e.target.value) : null)}
                className={INPUT} placeholder="150"
              />
            </Field>
          </div>

          <Field label="Ticket URL">
            <input
              type="url" value={form.ticket_url ?? ''}
              onChange={e => set('ticket_url', e.target.value || null)}
              className={INPUT} placeholder="https://…"
            />
          </Field>

          <Field label="Short Description (preview — shown in event list cards)">
            <textarea
              rows={2} value={form.short_description ?? ''}
              onChange={e => set('short_description', e.target.value || null)}
              className={TEXTAREA} placeholder="One or two sentences. Shown as teaser in the events list and as intro in the event page."
            />
          </Field>
          <Field label="Full Description (shown inside the event detail page)">
            <textarea
              rows={6} value={form.description ?? ''}
              onChange={e => set('description', e.target.value || null)}
              className={TEXTAREA} placeholder="Full narrative. Use line breaks to separate paragraphs."
            />
          </Field>
        </section>

        {/* ── IMAGES ─────────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-5">
          <p className="text-[#333] text-xs tracking-[0.2em] uppercase">Images</p>

          {/* Cover */}
          <Field label="Cover Image">
            {form.cover_image_url ? (
              <div className="relative group w-full">
                <img src={form.cover_image_url} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => set('cover_image_url', null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => coverRef.current?.click()}
                  disabled={uploadingCover}
                  className="flex items-center gap-2.5 border border-dashed border-[#222] hover:border-[#333] rounded-lg px-4 py-3 text-[#444] hover:text-[#888] text-sm transition-all"
                >
                  {uploadingCover ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {uploadingCover ? 'Uploading…' : 'Upload cover image'}
                </button>
                <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
              </>
            )}
          </Field>

          {/* Hero Video */}
          <Field label="Hero Video (optional)">
            <p className="text-[#333] text-xs mb-3 font-mono">
              If set, replaces the cover image as the hero background on the event page. MP4 / WebM, max ~50MB.
            </p>
            {form.hero_video_url ? (
              <div className="relative group w-full">
                <video
                  src={form.hero_video_url}
                  autoPlay loop muted playsInline
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => { deleteVideo(form.hero_video_url!).catch(() => {}); set('hero_video_url', null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => videoRef.current?.click()}
                  disabled={uploadingVideo}
                  className="flex items-center gap-2.5 border border-dashed border-[#222] hover:border-purple-500/30 rounded-lg px-4 py-3 text-[#444] hover:text-purple-400 text-sm transition-all"
                >
                  {uploadingVideo ? <Loader2 size={15} className="animate-spin" /> : <Film size={15} />}
                  {uploadingVideo ? 'Uploading video…' : 'Upload hero video'}
                </button>
                <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/*" onChange={handleVideoUpload} className="hidden" />
              </>
            )}
          </Field>

          {/* Gallery */}
          <Field label="Gallery">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {(form.gallery_images ?? []).map((url, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removeGallery(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/80 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={uploadingGallery}
                className="aspect-square border border-dashed border-[#222] hover:border-[#333] rounded-lg flex items-center justify-center text-[#444] hover:text-[#888] transition-all"
              >
                {uploadingGallery ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </div>
            <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
          </Field>
        </section>

        {/* ── LINEUP & TAGS ────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-5">
          <p className="text-[#333] text-xs tracking-[0.2em] uppercase">Lineup & Tags</p>

          {/* Lineup */}
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Lineup</label>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {(form.lineup ?? []).map((item, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-[#1a1a1a] border border-[#222] rounded-full px-3 py-1 text-sm text-white">
                  {item}
                  <button type="button" onClick={() => removeLineup(i)} className="text-[#444] hover:text-red-400 transition-colors ml-0.5">
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text" value={lineupInput}
                onChange={e => setLineupInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLineup(); }}}
                className={INPUT + ' flex-1'} placeholder="DJ name or act…"
              />
              <button type="button" onClick={addLineup}
                className="px-3 py-2.5 bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg text-[#666] hover:text-white text-sm transition-colors">
                Add
              </button>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2.5">
              {(form.tags ?? []).map((tag, i) => (
                <span key={i} className="flex items-center gap-1.5 bg-[#C42121]/10 border border-[#C42121]/20 rounded-full px-3 py-1 text-xs text-[#C42121]">
                  {tag}
                  <button type="button" onClick={() => removeTag(i)} className="hover:text-red-300 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text" value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); }}}
                className={INPUT + ' flex-1'} placeholder="Electronic, Immersive…"
              />
              <button type="button" onClick={addTag}
                className="px-3 py-2.5 bg-[#1a1a1a] border border-[#1e1e1e] rounded-lg text-[#666] hover:text-white text-sm transition-colors">
                Add
              </button>
            </div>
          </div>
        </section>

        {/* ── SETTINGS ─────────────────────────────────────── */}
        <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
          <p className="text-[#333] text-xs tracking-[0.2em] uppercase">Settings</p>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Status</p>
              <p className="text-[#444] text-xs mt-0.5">Published events are visible on the site</p>
            </div>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value as 'draft' | 'published')}
              className="bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm">Featured</p>
              <p className="text-[#444] text-xs mt-0.5">Highlight this event on the homepage</p>
            </div>
            <button
              type="button"
              onClick={() => set('featured', !form.featured)}
              className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 ${form.featured ? 'bg-[#C42121]' : 'bg-[#1e1e1e] border border-[#2a2a2a]'}`}
              style={{ height: '22px', width: '40px' }}
            >
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${form.featured ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} />
            </button>
          </div>
        </section>

        {/* ── SUBMIT ───────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="px-5 py-3 border border-[#1e1e1e] rounded-lg text-[#555] hover:text-white hover:border-[#2a2a2a] text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[#C42121] hover:bg-[#a81c1c] disabled:opacity-40 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
          </button>
        </div>

      </form>
    </div>
  );
}
