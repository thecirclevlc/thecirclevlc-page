import React, { useEffect, useState } from 'react';
import {
  Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  LEGAL_PRIVACY_KEY, LEGAL_TERMS_KEY,
  type LegalPage, type LegalSection,
} from '../lib/database.types';
import { PRIVACY_DEFAULT, TERMS_DEFAULT } from '../lib/legal-defaults';

interface ToastMsg { text: string; type: 'success' | 'error' }

const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors';
const TEXTAREA = INPUT + ' min-h-[100px] resize-y leading-relaxed';

function uuid() {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function LegalEditor({
  storageKey, fallback, label, onToast,
}: {
  storageKey: typeof LEGAL_PRIVACY_KEY | typeof LEGAL_TERMS_KEY;
  fallback:   LegalPage;
  label:      string;
  onToast:    (t: ToastMsg) => void;
}) {
  const [page, setPage] = useState<LegalPage>(fallback);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('id', storageKey).single()
      .then(({ data }) => {
        if (data?.value) setPage(data.value as LegalPage);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [storageKey]);

  const update = (patch: Partial<LegalPage>) => { setPage(prev => ({ ...prev, ...patch })); setDirty(true); };
  const setSections = (sections: LegalSection[]) => update({ sections });

  const editSection = (idx: number, patch: Partial<LegalSection>) => {
    setSections(page.sections.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };
  const moveSection = (idx: number, dir: -1 | 1) => {
    const arr = page.sections.slice();
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setSections(arr);
  };
  const addSection = () => setSections([
    ...page.sections, { id: uuid(), heading: 'New section', body: '' },
  ]);
  const removeSection = (idx: number) => setSections(page.sections.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: storageKey, value: page, updated_at: new Date().toISOString() });
      if (error) throw error;
      setDirty(false);
      onToast({ text: `${label} saved`, type: 'success' });
    } catch (err: any) {
      onToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-[#444] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4">
        <p className="text-white text-sm font-medium">Page metadata</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Last Updated</label>
            <input
              type="date"
              value={page.last_updated}
              onChange={e => update({ last_updated: e.target.value })}
              className={INPUT}
            />
          </div>
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Contact Email</label>
            <input
              type="email"
              value={page.contact_email}
              onChange={e => update({ contact_email: e.target.value })}
              className={INPUT}
            />
          </div>
        </div>
        <div>
          <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Intro (optional)</label>
          <textarea
            value={page.intro ?? ''}
            onChange={e => update({ intro: e.target.value })}
            rows={3}
            className={TEXTAREA}
            placeholder="Optional paragraph shown before the first section."
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-medium">Sections ({page.sections.length})</p>
          <p className="text-[#555] text-xs font-mono">
            Body supports paragraph breaks (blank line), "- " bullet lists and **bold**.
          </p>
        </div>

        {page.sections.map((s, idx) => (
          <div key={s.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={s.heading}
                onChange={e => editSection(idx, { heading: e.target.value })}
                className={INPUT + ' font-medium'}
                placeholder="Section heading"
              />
              <button onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white disabled:opacity-30 transition-colors">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => moveSection(idx, 1)} disabled={idx === page.sections.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white disabled:opacity-30 transition-colors">
                <ArrowDown size={14} />
              </button>
              <button onClick={() => removeSection(idx)}
                className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-red-400 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
            <textarea
              value={s.body}
              onChange={e => editSection(idx, { body: e.target.value })}
              rows={6}
              className={TEXTAREA}
              placeholder={`Body text…

- Bullet one
- Bullet two

A new paragraph with **bold** words.`}
            />
          </div>
        ))}

        <button
          onClick={addSection}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-sm text-[#ccc] transition-colors"
        >
          <Plus size={13} /> Add section
        </button>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : dirty ? `Save ${label}` : 'Saved'}
        </button>
      </div>
    </div>
  );
}

type Tab = 'privacy' | 'terms';

export default function AdminLegal() {
  const [tab, setTab] = useState<Tab>('privacy');
  const [toasts, setToasts] = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'privacy', label: 'Privacy Policy' },
    { id: 'terms',   label: 'Terms & Conditions' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Legal Pages</h1>
        <p className="text-[#555] text-sm mt-1">
          Edit the Privacy Policy and Terms &amp; Conditions content shown on the public site.
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

      {tab === 'privacy' && (
        <LegalEditor storageKey={LEGAL_PRIVACY_KEY} fallback={PRIVACY_DEFAULT} label="Privacy Policy" onToast={addToast} />
      )}
      {tab === 'terms' && (
        <LegalEditor storageKey={LEGAL_TERMS_KEY} fallback={TERMS_DEFAULT} label="Terms & Conditions" onToast={addToast} />
      )}

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
