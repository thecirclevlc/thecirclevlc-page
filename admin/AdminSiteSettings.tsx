import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Image, Film, Ban, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadImage, uploadVideo, deleteImage } from '../lib/imageUpload';
import type { PageBackground, PageKey } from '../lib/database.types';

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

  // Load current setting
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

  // Save to Supabase
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

  // Upload image
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

  // Upload video
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

  // Remove media
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
      {/* Header */}
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
        {/* Preview */}
        {bg.bg_url && bg.bg_type !== 'none' ? (
          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            {bg.bg_type === 'video' ? (
              <video
                src={bg.bg_url}
                autoPlay loop muted playsInline
                className="w-full h-full object-cover opacity-80"
              />
            ) : (
              <img
                src={bg.bg_url}
                alt="Background preview"
                className="w-full h-full object-cover opacity-80"
              />
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

        {/* Upload buttons */}
        <div className="flex gap-3">
          {/* Image upload */}
          <button
            onClick={() => imgRef.current?.click()}
            disabled={uploading || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#C42121]/30 rounded-lg text-sm text-[#888] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Image size={14} />
            )}
            <span>Image</span>
          </button>

          {/* Video upload */}
          <button
            onClick={() => videoRef.current?.click()}
            disabled={uploading || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-purple-500/30 rounded-lg text-sm text-[#888] hover:text-purple-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Film size={14} />
            )}
            <span>Video</span>
          </button>

          {/* Remove */}
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

      {/* Hidden inputs */}
      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm,video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────

export default function AdminSiteSettings() {
  const [toasts, setToasts] = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Site Settings</h1>
        <p className="text-[#555] text-sm mt-1">
          Configure hero backgrounds for public pages. Images are auto-optimised to WebP.
        </p>
      </div>

      {/* SQL reminder */}
      <div className="bg-amber-950/20 border border-amber-500/20 rounded-xl px-5 py-4 flex gap-3">
        <AlertCircle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-400 text-sm font-medium">SQL required</p>
          <p className="text-amber-500/70 text-xs mt-0.5 font-mono">
            Run the <span className="text-amber-400">supabase-schema.sql</span> additions in your Supabase SQL Editor if you haven't yet (ALTER TABLE events ADD COLUMN hero_video_url + CREATE TABLE site_settings).
          </p>
        </div>
      </div>

      {/* Page sections */}
      <div className="grid gap-6 lg:grid-cols-1">
        {PAGES.map(p => (
          <PageSection key={p.key} config={p} onToast={addToast} />
        ))}
      </div>

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
            {t.type === 'success'
              ? <CheckCircle size={15} />
              : <AlertCircle size={15} />
            }
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
