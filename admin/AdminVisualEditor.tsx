import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, X, Loader2, Paintbrush, Type } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────

interface SiteTheme {
  primary_color: string;
  bg_color:      string;
}

interface PageContent {
  title:    string;
  subtitle: string;
}

type PageKey = 'content_home_hero' | 'content_events_hero' | 'content_djs_hero' | 'content_artists_hero';

interface PageTexts {
  content_home_hero:    PageContent;
  content_events_hero:  PageContent;
  content_djs_hero:     PageContent;
  content_artists_hero: PageContent;
}

const DEFAULT_THEME: SiteTheme = {
  primary_color: '#C42121',
  bg_color:      '#050000',
};

const DEFAULT_TEXTS: PageTexts = {
  content_home_hero:    { title: 'THE CIRCLE', subtitle: 'SECRET LOCATION · ELECTRONIC MUSIC · BOLD ART · PERFORMANCES' },
  content_events_hero:  { title: 'THE EVENTS', subtitle: 'Every event is ephemeral, immersive, and curated.' },
  content_djs_hero:     { title: 'THE DJS', subtitle: 'The selectors who define The Circle.' },
  content_artists_hero: { title: 'THE ARTISTS', subtitle: 'Visual creators at the heart of The Circle.' },
};

// ── Input helpers ──────────────────────────────────────────────────

const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors';

// ── Toast ──────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: 'ok' | 'err' }) {
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium ${
      type === 'ok'
        ? 'bg-green-950 border border-green-800 text-green-400'
        : 'bg-red-950 border border-red-800 text-red-400'
    }`}>
      {type === 'ok' ? <Check size={15} /> : <X size={15} />}
      {msg}
    </div>
  );
}

// ── Colors Tab ─────────────────────────────────────────────────────

function ColorsTab() {
  const [theme, setTheme]   = useState<SiteTheme>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'site_theme')
      .single()
      .then(({ data }) => {
        if (data?.value) setTheme(data.value as SiteTheme);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'site_theme', value: theme }, { onConflict: 'id' });
      if (error) throw error;

      // Apply immediately to the document
      document.documentElement.style.setProperty('--color-primary', theme.primary_color);
      document.documentElement.style.setProperty('--color-bg',      theme.bg_color);

      showToast('Colors saved!', 'ok');
    } catch (err: any) {
      showToast(err.message ?? 'Save failed.', 'err');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-[#059669] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} />}

      {/* Primary accent color */}
      <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
        <div>
          <p className="text-white text-sm font-medium">Primary / Accent Color</p>
          <p className="text-[#444] text-xs mt-1">Used for borders, text highlights, and interactive elements.</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={theme.primary_color}
            onChange={e => setTheme(prev => ({ ...prev, primary_color: e.target.value }))}
            className="w-12 h-10 rounded border border-[#2a2a2a] cursor-pointer bg-transparent"
            title="Primary color"
          />
          <input
            type="text"
            value={theme.primary_color}
            onChange={e => setTheme(prev => ({ ...prev, primary_color: e.target.value }))}
            className={INPUT + ' font-mono flex-1 max-w-xs'}
            placeholder="#C42121"
            maxLength={7}
          />
          {/* Live preview */}
          <div
            className="flex-1 h-10 rounded border border-[#2a2a2a] flex items-center justify-center text-xs font-mono font-bold"
            style={{ backgroundColor: theme.primary_color, color: '#000' }}
          >
            PREVIEW
          </div>
        </div>
      </section>

      {/* Background color */}
      <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
        <div>
          <p className="text-white text-sm font-medium">Background Color</p>
          <p className="text-[#444] text-xs mt-1">The base dark background used across all public pages.</p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={theme.bg_color}
            onChange={e => setTheme(prev => ({ ...prev, bg_color: e.target.value }))}
            className="w-12 h-10 rounded border border-[#2a2a2a] cursor-pointer bg-transparent"
            title="Background color"
          />
          <input
            type="text"
            value={theme.bg_color}
            onChange={e => setTheme(prev => ({ ...prev, bg_color: e.target.value }))}
            className={INPUT + ' font-mono flex-1 max-w-xs'}
            placeholder="#050000"
            maxLength={7}
          />
          {/* Live preview */}
          <div
            className="flex-1 h-10 rounded border border-[#2a2a2a] flex items-center justify-center text-xs font-mono"
            style={{ backgroundColor: theme.bg_color, color: theme.primary_color }}
          >
            BG PREVIEW
          </div>
        </div>
      </section>

      {/* Combined preview */}
      <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-3">
        <p className="text-[#555] text-xs tracking-[0.15em] uppercase">Combined Preview</p>
        <div
          className="rounded-lg p-6 border border-[#2a2a2a] flex flex-col gap-3"
          style={{ backgroundColor: theme.bg_color }}
        >
          <span className="text-3xl font-black tracking-tighter uppercase" style={{ color: theme.primary_color }}>THE CIRCLE</span>
          <span className="text-sm font-mono" style={{ color: theme.primary_color + '80' }}>Underground · Electronic · Art</span>
          <div className="h-px" style={{ backgroundColor: theme.primary_color + '30' }} />
          <div
            className="self-start px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest"
            style={{ backgroundColor: theme.primary_color, color: theme.bg_color }}
          >
            APPLY NOW
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save Colors'}
        </button>
      </div>
    </div>
  );
}

// ── Texts Tab ──────────────────────────────────────────────────────

const PAGE_LABELS: { key: PageKey; label: string; description: string }[] = [
  { key: 'content_home_hero',    label: 'Home Page',    description: 'Hero section of the main landing page' },
  { key: 'content_events_hero',  label: 'Events Page',  description: 'Hero section of the Past Events page' },
  { key: 'content_djs_hero',     label: 'DJs Page',     description: 'Hero section of the DJs page' },
  { key: 'content_artists_hero', label: 'Artists Page', description: 'Hero section of the Artists page' },
];

function TextsTab() {
  const [texts, setTexts]     = useState<PageTexts>(DEFAULT_TEXTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    const keys = PAGE_LABELS.map(p => p.key);
    supabase
      .from('site_settings')
      .select('id, value')
      .in('id', keys)
      .then(({ data }) => {
        if (data) {
          const merged = { ...DEFAULT_TEXTS };
          data.forEach((row: { id: string; value: unknown }) => {
            if (row.id in merged) {
              (merged as any)[row.id] = row.value as PageContent;
            }
          });
          setTexts(merged);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function setField(key: PageKey, field: 'title' | 'subtitle', value: string) {
    setTexts(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const rows = PAGE_LABELS.map(p => ({
        id:    p.key,
        value: texts[p.key],
      }));
      const { error } = await supabase
        .from('site_settings')
        .upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      showToast('Texts saved!', 'ok');
    } catch (err: any) {
      showToast(err.message ?? 'Save failed.', 'err');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="text-[#059669] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} />}

      {PAGE_LABELS.map(({ key, label, description }) => (
        <section key={key} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
          <div>
            <p className="text-white text-sm font-medium">{label}</p>
            <p className="text-[#444] text-xs mt-0.5">{description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Title</label>
              <input
                type="text"
                value={texts[key].title}
                onChange={e => setField(key, 'title', e.target.value)}
                className={INPUT}
                placeholder="Page title"
              />
            </div>
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-2">Subtitle</label>
              <input
                type="text"
                value={texts[key].subtitle}
                onChange={e => setField(key, 'subtitle', e.target.value)}
                className={INPUT}
                placeholder="Short description or tagline"
              />
            </div>
          </div>
          {/* Inline preview */}
          <div className="rounded bg-[#0a0a0a] border border-[#1a1a1a] p-4">
            <p className="text-xs font-mono text-[#333] tracking-widest uppercase mb-2">Preview</p>
            <p className="text-2xl font-black text-[#C42121] uppercase tracking-tight">{texts[key].title || '–'}</p>
            <p className="text-sm text-[#C42121]/50 mt-1">{texts[key].subtitle || '–'}</p>
          </div>
        </section>
      ))}

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white px-6 py-3 rounded-lg text-sm font-medium transition-colors"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save All Texts'}
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

type Tab = 'colors' | 'texts';

export default function AdminVisualEditor() {
  const [tab, setTab] = useState<Tab>('colors');

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'colors', label: 'Colors',     icon: Paintbrush },
    { key: 'texts',  label: 'Page Texts', icon: Type },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-white text-2xl font-bold">Visual Editor</h1>
        <p className="text-[#444] text-sm mt-1">Customize brand colors and hero text across all public pages.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#111] border border-[#1a1a1a] rounded-xl p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-[#1e1e1e] text-white border border-[#2a2a2a]'
                : 'text-[#555] hover:text-[#888]'
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'colors' && <ColorsTab />}
      {tab === 'texts'  && <TextsTab />}
    </div>
  );
}
