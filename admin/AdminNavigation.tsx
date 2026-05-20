import React, { useEffect, useState } from 'react';
import {
  Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff,
  CheckCircle, AlertCircle, Instagram, Music, Youtube, Facebook,
  Linkedin, Mail, Globe, Twitter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AVAILABLE_ROUTES } from '../lib/routes';
import {
  DEFAULT_FOOTER, DEFAULT_HAMBURGER, FOOTER_CONFIG_KEY, NAV_HAMBURGER_KEY,
  type FooterConfig, type HamburgerNavConfig, type NavItem,
  type SocialLink, type SocialPlatform,
} from '../lib/database.types';

// ── Shared ────────────────────────────────────────────────────────
interface ToastMsg { text: string; type: 'success' | 'error' }

const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors';
const SECTION = 'bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4';

const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string; icon: React.ElementType }[] = [
  { value: 'instagram',  label: 'Instagram',  icon: Instagram },
  { value: 'tiktok',     label: 'TikTok',     icon: Music },
  { value: 'spotify',    label: 'Spotify',    icon: Music },
  { value: 'soundcloud', label: 'SoundCloud', icon: Music },
  { value: 'youtube',    label: 'YouTube',    icon: Youtube },
  { value: 'x',          label: 'X / Twitter', icon: Twitter },
  { value: 'facebook',   label: 'Facebook',   icon: Facebook },
  { value: 'linkedin',   label: 'LinkedIn',   icon: Linkedin },
  { value: 'email',      label: 'Email',      icon: Mail },
  { value: 'website',    label: 'Website',    icon: Globe },
];

function uuid() {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ── NavItem editor (shared by Menu + Footer tabs) ─────────────────
function NavItemEditor({
  item, onChange, onMoveUp, onMoveDown, onDelete, canUp, canDown,
}: {
  item:       NavItem;
  onChange:   (next: NavItem) => void;
  onMoveUp:   () => void;
  onMoveDown: () => void;
  onDelete:   () => void;
  canUp:      boolean;
  canDown:    boolean;
}) {
  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr_auto] gap-3">
        <div>
          <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Label</label>
          <input
            type="text"
            value={item.label}
            onChange={e => onChange({ ...item, label: e.target.value })}
            className={INPUT}
            placeholder="HOME"
          />
        </div>

        <div>
          <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Target</label>
          <div className="flex gap-2">
            <select
              value={item.mode}
              onChange={e => onChange({ ...item, mode: e.target.value as 'route' | 'external' })}
              className={INPUT + ' max-w-[110px]'}
            >
              <option value="route">Page</option>
              <option value="external">URL</option>
            </select>
            {item.mode === 'route' ? (
              <select
                value={item.route ?? '/'}
                onChange={e => onChange({ ...item, route: e.target.value })}
                className={INPUT}
              >
                {AVAILABLE_ROUTES.map(r => (
                  <option key={r.path} value={r.path}>{r.label} — {r.path}</option>
                ))}
              </select>
            ) : (
              <input
                type="url"
                value={item.external_url ?? ''}
                onChange={e => onChange({ ...item, external_url: e.target.value })}
                placeholder="https://..."
                className={INPUT}
              />
            )}
          </div>
        </div>

        <div className="flex md:flex-col gap-1 items-end md:items-stretch justify-end">
          <button
            onClick={onMoveUp}
            disabled={!canUp}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
            aria-label="Move up"
          ><ArrowUp size={14} /></button>
          <button
            onClick={onMoveDown}
            disabled={!canDown}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
            aria-label="Move down"
          ><ArrowDown size={14} /></button>
          <button
            onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-red-400 hover:bg-red-950/30 transition-colors"
            aria-label="Delete"
          ><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ── Menu tab ──────────────────────────────────────────────────────
function MenuTab({ onToast }: { onToast: (t: ToastMsg) => void }) {
  const [cfg, setCfg] = useState<HamburgerNavConfig>(DEFAULT_HAMBURGER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('id', NAV_HAMBURGER_KEY).single()
      .then(({ data }) => {
        if (data?.value) setCfg(data.value as HamburgerNavConfig);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const update = (next: HamburgerNavConfig) => { setCfg(next); setDirty(true); };
  const updateItem = (idx: number, item: NavItem) => {
    update({ items: cfg.items.map((it, i) => i === idx ? item : it) });
  };
  const move = (idx: number, dir: -1 | 1) => {
    const arr = cfg.items.slice();
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    update({ items: arr });
  };
  const add = () => update({
    items: [...cfg.items, { id: uuid(), label: 'NEW', mode: 'route', route: '/' }],
  });
  const remove = (idx: number) => update({ items: cfg.items.filter((_, i) => i !== idx) });

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: NAV_HAMBURGER_KEY, value: cfg, updated_at: new Date().toISOString() });
      if (error) throw error;
      setDirty(false);
      onToast({ text: 'Menu saved', type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-white text-lg font-semibold">Hamburger Menu</h2>
        <p className="text-[#555] text-sm mt-1">
          Items in the full-screen menu overlay. The "Target" picker only shows pages that exist in the app.
        </p>
      </div>

      <div className="space-y-3">
        {cfg.items.map((item, idx) => (
          <NavItemEditor
            key={item.id}
            item={item}
            onChange={next => updateItem(idx, next)}
            onMoveUp={() => move(idx, -1)}
            onMoveDown={() => move(idx, 1)}
            onDelete={() => remove(idx)}
            canUp={idx > 0}
            canDown={idx < cfg.items.length - 1}
          />
        ))}
        {cfg.items.length === 0 && (
          <p className="text-[#555] text-sm text-center py-6">No menu items yet.</p>
        )}
      </div>

      <div className="flex justify-between items-center pt-2">
        <button
          onClick={add}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-sm text-[#ccc] transition-colors"
        >
          <Plus size={13} /> Add item
        </button>
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : dirty ? 'Save menu' : 'Saved'}
        </button>
      </div>
    </div>
  );
}

// ── Footer tab ────────────────────────────────────────────────────
function FooterTab({ onToast }: { onToast: (t: ToastMsg) => void }) {
  const [cfg, setCfg] = useState<FooterConfig>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('id', FOOTER_CONFIG_KEY).single()
      .then(({ data }) => {
        if (data?.value) setCfg({ ...DEFAULT_FOOTER, ...(data.value as FooterConfig) });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const update = (patch: Partial<FooterConfig>) => { setCfg(prev => ({ ...prev, ...patch })); setDirty(true); };
  const setLinks = (links: NavItem[]) => update({ links });

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: FOOTER_CONFIG_KEY, value: cfg, updated_at: new Date().toISOString() });
      if (error) throw error;
      setDirty(false);
      onToast({ text: 'Footer saved', type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-lg font-semibold">Footer</h2>
        <p className="text-[#555] text-sm mt-1">
          Brand text and links. "By Alia Studio" is fixed by contract — not editable.
        </p>
      </div>

      <section className={SECTION}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Brand Name</label>
            <input className={INPUT} value={cfg.brand_name} onChange={e => update({ brand_name: e.target.value })} />
          </div>
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Tagline / Location</label>
            <input className={INPUT} value={cfg.tagline} onChange={e => update({ tagline: e.target.value })} />
          </div>
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Contact Email</label>
            <input className={INPUT} type="email" value={cfg.contact_email} onChange={e => update({ contact_email: e.target.value })} />
          </div>
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Copyright Year</label>
            <input className={INPUT} value={cfg.copyright_year} onChange={e => update({ copyright_year: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-white text-sm font-medium">Footer Links</p>
        {cfg.links.map((item, idx) => (
          <NavItemEditor
            key={item.id}
            item={item}
            onChange={next => setLinks(cfg.links.map((l, i) => i === idx ? next : l))}
            onMoveUp={() => {
              const arr = cfg.links.slice();
              if (idx === 0) return;
              [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
              setLinks(arr);
            }}
            onMoveDown={() => {
              const arr = cfg.links.slice();
              if (idx === arr.length - 1) return;
              [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
              setLinks(arr);
            }}
            onDelete={() => setLinks(cfg.links.filter((_, i) => i !== idx))}
            canUp={idx > 0}
            canDown={idx < cfg.links.length - 1}
          />
        ))}
        <button
          onClick={() => setLinks([...cfg.links, { id: uuid(), label: 'New link', mode: 'route', route: '/' }])}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-sm text-[#ccc] transition-colors"
        >
          <Plus size={13} /> Add link
        </button>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : dirty ? 'Save footer' : 'Saved'}
        </button>
      </div>
    </div>
  );
}

// ── Social Links tab ──────────────────────────────────────────────
function SocialLinksTab({ onToast }: { onToast: (t: ToastMsg) => void }) {
  const [rows, setRows] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>('instagram');
  const [newUrl, setNewUrl] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const { data } = await supabase.from('social_links').select('*').order('sort_order');
    if (data) setRows(data as SocialLink[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newUrl.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.from('social_links').insert({
        platform: newPlatform,
        url: newUrl.trim(),
        sort_order: rows.length,
        visible: true,
      });
      if (error) throw error;
      setNewUrl('');
      await load();
      onToast({ text: 'Social link added', type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Add failed', type: 'error' });
    } finally { setAdding(false); }
  };

  const updateRow = async (id: string, patch: Partial<SocialLink>) => {
    const { error } = await supabase.from('social_links').update(patch).eq('id', id);
    if (!error) setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } as SocialLink : r));
    else onToast({ text: error.message, type: 'error' });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('social_links').delete().eq('id', id);
    if (!error) setRows(prev => prev.filter(r => r.id !== id));
    else onToast({ text: error.message, type: 'error' });
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= rows.length) return;
    const a = rows[idx], b = rows[j];
    await Promise.all([
      supabase.from('social_links').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('social_links').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    await load();
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-white text-lg font-semibold">Social Links</h2>
        <p className="text-[#555] text-sm mt-1">
          Icons rendered in the footer and inside the open hamburger menu overlay.
        </p>
      </div>

      <section className={SECTION + ' space-y-3'}>
        <p className="text-white text-sm font-medium">Add link</p>
        <div className="flex flex-col md:flex-row gap-2">
          <select
            value={newPlatform}
            onChange={e => setNewPlatform(e.target.value as SocialPlatform)}
            className={INPUT + ' md:max-w-[180px]'}
          >
            {SOCIAL_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <input
            value={newUrl}
            onChange={e => setNewUrl(e.target.value)}
            placeholder={newPlatform === 'email' ? 'you@example.com' : 'https://...'}
            className={INPUT}
          />
          <button
            onClick={add}
            disabled={adding || !newUrl.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Add
          </button>
        </div>
      </section>

      <div className="space-y-2">
        {rows.map((s, idx) => {
          const Icon = SOCIAL_PLATFORMS.find(p => p.value === s.platform)?.icon ?? Globe;
          return (
            <div key={s.id} className="flex items-center gap-3 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-3">
              <Icon size={16} className="text-[#C42121] flex-shrink-0" />
              <select
                value={s.platform}
                onChange={e => updateRow(s.id, { platform: e.target.value as SocialPlatform })}
                className={INPUT + ' max-w-[160px]'}
              >
                {SOCIAL_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <input
                value={s.url}
                onChange={e => updateRow(s.id, { url: e.target.value })}
                onBlur={e => updateRow(s.id, { url: e.target.value.trim() })}
                className={INPUT}
              />
              <button
                onClick={() => updateRow(s.id, { visible: !s.visible })}
                className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white transition-colors"
                title={s.visible ? 'Visible' : 'Hidden'}
              >
                {s.visible ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button onClick={() => move(idx, -1)} disabled={idx === 0}
                className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white disabled:opacity-30 transition-colors">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => move(idx, 1)} disabled={idx === rows.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white disabled:opacity-30 transition-colors">
                <ArrowDown size={14} />
              </button>
              <button onClick={() => remove(s.id)}
                className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className="text-[#555] text-sm text-center py-6">No social links yet.</p>
        )}
      </div>
    </div>
  );
}

// ── Misc ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="text-[#444] animate-spin" />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
type Tab = 'menu' | 'footer' | 'social';

export default function AdminNavigation() {
  const [tab, setTab] = useState<Tab>('menu');
  const [toasts, setToasts] = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'menu',   label: 'Menu' },
    { id: 'footer', label: 'Footer' },
    { id: 'social', label: 'Social Links' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Navigation</h1>
        <p className="text-[#555] text-sm mt-1">
          Menu, footer and social-media icons used across the public site.
        </p>
      </div>

      <div className="flex gap-1 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-[#1a1a1a] text-white border border-[#2a2a2a]'
                : 'text-[#555] hover:text-[#888]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'menu'   && <MenuTab   onToast={addToast} />}
      {tab === 'footer' && <FooterTab onToast={addToast} />}
      {tab === 'social' && <SocialLinksTab onToast={addToast} />}

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
