import React, { useEffect, useState } from 'react';
import { Loader2, Save, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { mergeBlock } from '../lib/mergeBlock';
import { contrastRatio, wcagVerdict } from '../lib/contrast';
import {
  SITE_FONTS, SITE_THEME_KEY, applyTheme, fontStack, type SiteTheme,
} from '../hooks/useSiteTheme';

interface ToastMsg { text: string; type: 'success' | 'error' }

const SECTION = 'bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4';
const LABEL   = 'block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5';
const INPUT   = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#059669]/40 transition-colors';

const DEFAULTS: SiteTheme = { primary_color: '#C42121', bg_color: '#050000', font: 'poppins' };

/** Named starting points, so she is not left alone with a colour wheel. */
const PRESETS: { label: string; note: string; theme: Omit<SiteTheme, 'font'> }[] = [
  { label: 'Original red', note: 'What the site launched with',
    theme: { primary_color: '#C42121', bg_color: '#050000' } },
  { label: 'Readable red', note: 'Same red, light enough to pass accessibility',
    theme: { primary_color: '#E05A5A', bg_color: '#050000' } },
  { label: 'Off-white',    note: 'Quiet and very legible',
    theme: { primary_color: '#E0E0E0', bg_color: '#0A0A0A' } },
];

function ColorField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase())}
          className="w-12 h-10 rounded-lg bg-transparent border border-[#1e1e1e] cursor-pointer p-1"
          aria-label={label}
        />
        <input
          className={INPUT + ' font-mono'}
          value={value}
          onChange={e => onChange(e.target.value.toUpperCase())}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export default function AdminAppearance() {
  const [theme, setTheme]     = useState<SiteTheme>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [toasts, setToasts]   = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('id', SITE_THEME_KEY).maybeSingle()
      .then(({ data }) => {
        setTheme(mergeBlock(DEFAULTS, data?.value));
        setLoading(false);
      });
  }, []);

  // Preview on the admin's own page as she drags the picker. The public site
  // is unaffected until she saves — this only writes CSS variables locally.
  const update = (patch: Partial<SiteTheme>) => {
    const next = { ...theme, ...patch };
    setTheme(next);
    setDirty(true);
    applyTheme(next);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: SITE_THEME_KEY, value: theme, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    setDirty(false);
    addToast({ text: 'Appearance saved — the site is updated', type: 'success' });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16"><Loader2 size={20} className="text-[#444] animate-spin" /></div>;
  }

  const ratio   = contrastRatio(theme.primary_color, theme.bg_color);
  const verdict = wcagVerdict(ratio);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Appearance</h1>
          <p className="text-[#555] text-sm mt-1">
            Colour and typeface for the whole public site. Changes preview here instantly and go live when you save.
          </p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors">
          <ExternalLink size={13} /> View site
        </a>
      </div>

      {/* Presets */}
      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Start from a preset</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRESETS.map(p => {
            const r = contrastRatio(p.theme.primary_color, p.theme.bg_color);
            const active = theme.primary_color.toUpperCase() === p.theme.primary_color
                        && theme.bg_color.toUpperCase() === p.theme.bg_color;
            return (
              <button key={p.label} onClick={() => update(p.theme)}
                className={`text-left rounded-lg border p-4 transition-colors ${
                  active ? 'border-[#059669]/50 bg-[#059669]/5' : 'border-[#1e1e1e] hover:border-[#2a2a2a]'
                }`}>
                <div className="flex gap-1.5 mb-3">
                  <span className="w-6 h-6 rounded border border-white/10" style={{ background: p.theme.primary_color }} />
                  <span className="w-6 h-6 rounded border border-white/10" style={{ background: p.theme.bg_color }} />
                </div>
                <p className="text-[#ccc] text-sm">{p.label}</p>
                <p className="text-[#555] text-xs mt-0.5">{p.note}</p>
                <p className={`text-xs mt-1.5 ${wcagVerdict(r).pass ? 'text-emerald-400/80' : 'text-amber-500/80'}`}>
                  {r.toFixed(2)}:1 · {wcagVerdict(r).label}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Colours */}
      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Colours</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ColorField label="Main colour" value={theme.primary_color}
            onChange={v => update({ primary_color: v })} />
          <ColorField label="Background" value={theme.bg_color}
            onChange={v => update({ bg_color: v })} />
        </div>

        <div className={`rounded-lg border p-3 ${
          verdict.pass ? 'border-emerald-500/25 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'
        }`}>
          <p className={`text-sm ${verdict.pass ? 'text-emerald-300' : 'text-amber-300'}`}>
            Contrast {ratio.toFixed(2)}:1 — {verdict.label}
          </p>
          <p className="text-[#666] text-xs mt-1">
            {verdict.pass
              ? 'Comfortable to read at normal text sizes.'
              : 'Small text in this colour will be hard to read. Aim for at least 4.5:1 — try a lighter main colour or a darker background.'}
          </p>
        </div>

        {/* Live preview using the real tokens */}
        <div className="rounded-lg border border-[#1e1e1e] overflow-hidden">
          <div className="p-6 space-y-4" style={{ background: theme.bg_color, fontFamily: fontStack(theme.font) }}>
            <p className="text-3xl font-black uppercase tracking-tighter" style={{ color: theme.primary_color }}>
              The Circle
            </p>
            <p className="text-sm" style={{ color: theme.primary_color, opacity: 0.7 }}>
              Secret location · electronic music · bold art
            </p>
            <div className="flex gap-3 items-center flex-wrap">
              <span className="px-6 py-3 text-sm font-black uppercase tracking-widest"
                style={{ background: theme.primary_color, color: theme.bg_color }}>
                Apply
              </span>
              <span className="px-5 py-2.5 text-xs font-mono uppercase tracking-widest border"
                style={{ color: theme.primary_color, borderColor: theme.primary_color + '66' }}>
                Past events
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Typeface */}
      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Typeface</p>
        <div className="space-y-2">
          {SITE_FONTS.map(f => (
            <button key={f.id} onClick={() => update({ font: f.id })}
              className={`w-full text-left rounded-lg border p-4 transition-colors ${
                theme.font === f.id ? 'border-[#059669]/50 bg-[#059669]/5' : 'border-[#1e1e1e] hover:border-[#2a2a2a]'
              }`}>
              <p className="text-2xl text-white uppercase tracking-tight" style={{ fontFamily: f.stack, fontWeight: 900 }}>
                The Circle
              </p>
              <p className="text-[#ccc] text-sm mt-1">{f.label}</p>
              <p className="text-[#555] text-xs mt-0.5">{f.note}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-end sticky bottom-4 z-20">
        <button onClick={save} disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors shadow-lg">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : dirty ? 'Save appearance' : 'Saved'}
        </button>
      </div>

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
