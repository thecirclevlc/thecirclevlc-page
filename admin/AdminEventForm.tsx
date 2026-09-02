import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { uploadImage, uploadVideo, deleteVideo } from '../lib/imageUpload';
import { slugify } from '../lib/slugify';
import { useAutosave } from '../lib/useAutosave';
import type { EventInsert, EntityOption } from '../lib/database.types';
import { ArrowLeft, Upload, X, Loader2, Plus, Check, Film, Clock } from 'lucide-react';
import EntitySelector from './EntitySelector';
import AdminHistory from './AdminHistory';

// ── helpers ──────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}

const INPUT = 'w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-4 py-2.5 text-[var(--fg)] text-sm placeholder-[var(--fg-faint)] focus:outline-none focus:border-[var(--accent-line)] transition-colors';
const TEXTAREA = INPUT + ' resize-none';

// ── initial state ─────────────────────────────────────────────────

const BLANK: EventInsert = {
  title: '', slug: '', event_number: null, date: null, time: null,
  venue: null, description: null, short_description: null, cover_image_url: null, hero_video_url: null,
  gallery_images: [], gallery_style: 'default', ticket_url: null, lineup: [], tags: [],
  attendees: null, partnerships: [], status: 'draft', featured: false,
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
  const [tagInput, setTagInput]       = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerUrl, setPartnerUrl] = useState('');
  const [dbId, setDbId] = useState<string | null>(id ?? null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Entity selectors
  const [selectedDJs, setSelectedDJs]         = useState<EntityOption[]>([]);
  const [selectedArtists, setSelectedArtists] = useState<EntityOption[]>([]);

  const coverRef   = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLInputElement>(null);

  // ── load existing event ──────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    const fetchEvent = async () => {
      // Load event base data
      const { data: eventData } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventData) {
        const { id: _, created_at, updated_at, ...rest } = eventData;
        setForm({ ...BLANK, ...rest });
      }

      // Load existing DJ joins
      const { data: djRows } = await supabase
        .from('event_djs')
        .select('dj_id, sort_order, djs(id, name, photo_url)')
        .eq('event_id', id)
        .order('sort_order');

      if (djRows) {
        const djs = djRows
          .map((r: any) => r.djs)
          .filter(Boolean) as EntityOption[];
        setSelectedDJs(djs);
      }

      // Load existing Artist joins
      const { data: artistRows } = await supabase
        .from('event_artists')
        .select('artist_id, sort_order, artists(id, name, photo_url)')
        .eq('event_id', id)
        .order('sort_order');

      if (artistRows) {
        const artists = artistRows
          .map((r: any) => r.artists)
          .filter(Boolean) as EntityOption[];
        setSelectedArtists(artists);
      }

      setLoading(false);
    };

    fetchEvent();
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

  const autoSaveToDb = React.useCallback(async (data: EventInsert) => {
    if (!dbId) return;
    await supabase.from('events').update(data).eq('id', dbId);
  }, [dbId]);

  const { status: autosaveStatus } = useAutosave({
    data: form,
    onSave: autoSaveToDb,
    delay: 3000,
    enabled: !!dbId,
  });

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

  // ── tags helpers ─────────────────────────────────────────────
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

  function addPartnership() {
    if (!partnerName.trim()) return;
    const partnerships = [...((form.partnerships as any[]) ?? []), {
      name: partnerName.trim(),
      url: partnerUrl.trim() || undefined,
    }];
    set('partnerships', partnerships as any);
    setPartnerName('');
    setPartnerUrl('');
  }

  // The event page has always rendered `p.logo_url` (EventDetail.tsx:493);
  // the form simply never offered a way to set it, so every partner showed
  // as plain text.
  async function uploadPartnerLogo(i: number, file?: File) {
    if (!file) return;
    try {
      const url = await uploadImage(file, 'general');
      const partnerships = ((form.partnerships as any[]) ?? []).map(
        (p: any, idx: number) => idx === i ? { ...p, logo_url: url } : p);
      set('partnerships', partnerships as any);
    } catch (err: any) {
      showToast('Logo upload failed: ' + err.message, 'err');
    }
  }

  function removePartnership(i: number) {
    const partnerships = ((form.partnerships as any[]) ?? []).filter((_: any, idx: number) => idx !== i);
    set('partnerships', partnerships as any);
  }

  // ── sync join tables ──────────────────────────────────────────
  async function syncJoins(eventId: string) {
    // DJs: delete all then insert selected in order
    await supabase.from('event_djs').delete().eq('event_id', eventId);
    if (selectedDJs.length > 0) {
      const djRows = selectedDJs.map((dj, idx) => ({
        event_id: eventId,
        dj_id: dj.id,
        sort_order: idx,
      }));
      const { error } = await supabase.from('event_djs').insert(djRows);
      if (error) throw error;
    }

    // Artists: delete all then insert selected in order
    await supabase.from('event_artists').delete().eq('event_id', eventId);
    if (selectedArtists.length > 0) {
      const artistRows = selectedArtists.map((artist, idx) => ({
        event_id: eventId,
        artist_id: artist.id,
        sort_order: idx,
      }));
      const { error } = await supabase.from('event_artists').insert(artistRows);
      if (error) throw error;
    }
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
        await syncJoins(id!);
        showToast('Event saved!', 'ok');
      } else {
        const { data, error } = await supabase.from('events').insert(form).select('id').single();
        if (error) throw error;
        setDbId(data.id);
        await syncJoins(data.id);
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
        <Loader2 size={24} className="text-[var(--tc-brand-ink)] animate-spin" />
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
            ? 'bg-[var(--surface-3)] border border-[var(--line-strong)] text-[var(--fg-muted)]'
            : 'bg-[var(--danger-soft)] border border-[var(--danger-line)] text-[var(--danger)]'
        }`}>
          {toast.type === 'ok' ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/events')} className="text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-[var(--fg)] text-2xl font-bold">{isEdit ? 'Edit Event' : 'New Event'}</h1>
          <p className="text-[var(--fg-faint)] text-sm mt-0.5">{isEdit ? 'Update event details' : 'Fill in the details below'}</p>
            {dbId && autosaveStatus !== 'idle' && (
              <span className={`text-xs font-mono tracking-wider mt-1 ${
                autosaveStatus === 'saving' ? 'text-[var(--fg-muted)]' :
                autosaveStatus === 'saved' ? 'text-[var(--fg-muted)]' :
                autosaveStatus === 'error' ? 'text-[var(--danger)]' : 'text-[var(--fg-faint)]'
              }`}>
                {autosaveStatus === 'saving' ? 'Saving...' :
                 autosaveStatus === 'saved' ? 'Saved' :
                 autosaveStatus === 'error' ? 'Save failed' : ''}
              </span>
            )}
        </div>
        {dbId && (
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

        {/* ── BASIC INFO ─────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-4">
          <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Basic Info</p>

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

        {/* ── LINEUP ──────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-5">
          <div>
            <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Lineup</p>
            <p className="text-[var(--fg-faint)] text-xs mt-1 font-mono">
              Select DJs and Artists from the database. They'll appear with full profiles on the event page.
            </p>
          </div>

          {/* DJs Selector */}
          <div>
            <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-2">DJs</label>
            <EntitySelector
              table="djs"
              selected={selectedDJs}
              onChange={setSelectedDJs}
              createLink="/admin/djs/new"
              label="DJs"
            />
          </div>

          {/* Artists Selector */}
          <div>
            <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-2">Artists</label>
            <EntitySelector
              table="artists"
              selected={selectedArtists}
              onChange={setSelectedArtists}
              createLink="/admin/artists/new"
              label="Artists"
            />
          </div>
        </section>

        {/* ── IMAGES ─────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-5">
          <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Images</p>

          {/* Cover */}
          <Field label="Cover Image">
            {form.cover_image_url ? (
              <div className="relative group w-full">
                <img src={form.cover_image_url} alt="Cover" className="w-full h-48 object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => set('cover_image_url', null)}
                  className="absolute top-2 right-2 w-7 h-7 bg-[var(--scrim)] rounded-full flex items-center justify-center text-[var(--on-accent)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--danger)] hover:text-[var(--on-danger)]"
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
                  className="flex items-center gap-2.5 border border-dashed border-[var(--line-strong)] hover:border-[var(--line-strong)] rounded-lg px-4 py-3 text-[var(--fg-faint)] hover:text-[var(--fg-muted)] text-sm transition-all"
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
            <p className="text-[var(--fg-faint)] text-xs mb-3 font-mono">
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
                  className="absolute top-2 right-2 w-7 h-7 bg-[var(--scrim)] rounded-full flex items-center justify-center text-[var(--on-accent)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--danger)] hover:text-[var(--on-danger)]"
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
                  className="flex items-center gap-2.5 border border-dashed border-[var(--line-strong)] hover:border-[var(--line-strong)] rounded-lg px-4 py-3 text-[var(--fg-faint)] hover:text-[var(--fg-muted)] text-sm transition-all"
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
                    className="absolute top-1 right-1 w-5 h-5 bg-[var(--scrim)] rounded-full flex items-center justify-center text-[var(--on-accent)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--danger)] hover:text-[var(--on-danger)]"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={uploadingGallery}
                className="aspect-square border border-dashed border-[var(--line-strong)] hover:border-[var(--line-strong)] rounded-lg flex items-center justify-center text-[var(--fg-faint)] hover:text-[var(--fg-muted)] transition-all"
              >
                {uploadingGallery ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              </button>
            </div>
            <input ref={galleryRef} type="file" accept="image/*" multiple onChange={handleGalleryUpload} className="hidden" />
          </Field>

          {/* Gallery Style Toggle */}
          <Field label="Gallery Style">
            <div className="flex gap-3">
              {([
                { value: 'default',    label: 'Default Grid',        desc: 'Standard photo grid' },
                { value: 'horizontal', label: 'Horizontal Parallax', desc: '2-row scroll effect' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('gallery_style', opt.value)}
                  className={`flex-1 text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                    form.gallery_style === opt.value
                      ? 'border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--fg)]'
                      : 'border-[var(--line)] bg-[var(--surface-2)] text-[var(--fg-muted)] hover:border-[var(--line-strong)] hover:text-[var(--fg-muted)]'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs mt-0.5 text-[var(--fg-faint)]">{opt.desc}</div>
                </button>
              ))}
            </div>
          </Field>
        </section>

        {/* ── TAGS ─────────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-3">
          <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Tags</p>

          <div className="flex flex-wrap gap-2 mb-2.5">
            {(form.tags ?? []).map((tag, i) => (
              <span key={i} className="flex items-center gap-1.5 bg-[var(--accent-soft)] border border-[var(--accent-line)] rounded-full px-3 py-1 text-xs text-[var(--tc-brand-ink)]">
                {tag}
                <button type="button" onClick={() => removeTag(i)} className="hover:text-[var(--danger)] transition-colors">
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
              className="px-3 py-2.5 bg-[var(--surface-3)] border border-[var(--line)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm transition-colors">
              Add
            </button>
          </div>
        </section>

        {/* ── PARTNERSHIPS ───────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-3">
          <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Collaborations & Partners</p>
          <p className="text-[var(--fg-faint)] text-xs font-mono">Brands, venues, or collectives involved in this event.</p>

          <div className="space-y-2">
            {((form.partnerships as any[]) ?? []).map((p: any, i: number) => (
              <div key={i} className="flex items-center gap-3 bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2">
                {p.logo_url
                  ? <img src={p.logo_url} alt="" className="h-7 w-auto max-w-[80px] object-contain flex-shrink-0" />
                  : <span className="h-7 w-10 flex-shrink-0 rounded border border-dashed border-[var(--line-strong)]" />}
                <span className="text-sm text-[var(--fg)] flex-1 truncate">{p.name}</span>
                {p.url && <span className="text-xs text-[var(--fg-faint)] font-mono truncate max-w-[130px]">{p.url}</span>}
                <label className="px-2 py-1 text-xs text-[var(--fg-muted)] hover:text-[var(--fg)] border border-[var(--line)] rounded cursor-pointer transition-colors flex-shrink-0">
                  {p.logo_url ? 'Replace' : 'Logo'}
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => uploadPartnerLogo(i, e.target.files?.[0])} />
                </label>
                <button type="button" onClick={() => removePartnership(i)} className="text-[var(--fg-faint)] hover:text-[var(--danger)] transition-colors flex-shrink-0">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input type="text" value={partnerName}
              onChange={e => setPartnerName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPartnership(); }}}
              className={INPUT + ' flex-1'} placeholder="Partner name" />
            <input type="url" value={partnerUrl}
              onChange={e => setPartnerUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPartnership(); }}}
              className={INPUT + ' flex-1'} placeholder="https://... (optional)" />
            <button type="button" onClick={addPartnership}
              className="px-3 py-2.5 bg-[var(--surface-3)] border border-[var(--line)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] text-sm transition-colors">
              Add
            </button>
          </div>
        </section>

        {/* ── SETTINGS ─────────────────────────────────────── */}
        <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-4">
          <p className="text-[var(--fg-faint)] text-xs tracking-[0.2em] uppercase">Settings</p>

          {/* Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--fg)] text-sm">Status</p>
              <p className="text-[var(--fg-faint)] text-xs mt-0.5">Published events are visible on the site</p>
            </div>
            <select
              value={form.status}
              onChange={e => set('status', e.target.value as 'draft' | 'published')}
              className="bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm focus:outline-none"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Featured toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[var(--fg)] text-sm">Featured</p>
              <p className="text-[var(--fg-faint)] text-xs mt-0.5">Highlight this event on the homepage</p>
            </div>
            <button
              type="button"
              onClick={() => set('featured', !form.featured)}
              className={`relative rounded-full transition-colors flex-shrink-0 ${form.featured ? 'bg-[var(--tc-brand)]' : 'bg-[var(--surface-3)] border border-[var(--line-strong)]'}`}
              style={{ height: '22px', width: '40px' }}
            >
              <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-[var(--fg)] shadow transition-transform ${form.featured ? 'translate-x-[20px]' : 'translate-x-[3px]'}`} />
            </button>
          </div>
        </section>

        {/* ── SUBMIT ───────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="px-5 py-3 border border-[var(--line)] rounded-lg text-[var(--fg-muted)] hover:text-[var(--fg)] hover:border-[var(--line-strong)] text-sm transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-[var(--tc-brand)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[var(--on-accent)] px-6 py-3 rounded-lg text-sm font-medium transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Event'}
          </button>
        </div>

      </form>

      {/* History drawer */}
      {dbId && (
        <AdminHistory
          tableName="events"
          rowId={dbId}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          onRestored={() => window.location.reload()}
        />
      )}
    </div>
  );
}
