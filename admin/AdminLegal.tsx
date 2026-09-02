import React, { useEffect, useState } from 'react';
import {
  Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown,
  CheckCircle, AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  LEGAL_PRIVACY_KEY, LEGAL_TERMS_KEY, FOOTER_CONFIG_KEY, DEFAULT_FOOTER,
  type LegalPage, type LegalSection, type FooterConfig,
} from '../lib/database.types';
import { PRIVACY_DEFAULT, TERMS_DEFAULT } from '../lib/legal-defaults';

interface ToastMsg { text: string; type: 'success' | 'error' }

const INPUT = 'w-full bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm placeholder-[var(--fg-faint)] focus:outline-none focus:border-[var(--accent-line)] transition-colors disabled:opacity-35 disabled:cursor-not-allowed';
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
  const [footer, setFooter] = useState<FooterConfig>(DEFAULT_FOOTER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('id', storageKey).single()
      .then(({ data }) => {
        if (data?.value) setPage(data.value as LegalPage);
        setLoading(false);
      }, () => setLoading(false));
  }, [storageKey]);

  // Read-only: the address shown next to "Contact Email" is the footer's.
  useEffect(() => {
    supabase.from('site_settings').select('value').eq('id', FOOTER_CONFIG_KEY).maybeSingle()
      .then(({ data }) => { if (data?.value) setFooter(data.value as FooterConfig); }, () => {});
  }, []);

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
        <Loader2 size={20} className="text-[var(--fg-faint)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-5 space-y-4">
        <p className="text-[var(--fg)] text-sm font-medium">Page metadata</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-1.5">Last Updated</label>
            <input
              type="date"
              value={page.last_updated}
              onChange={e => update({ last_updated: e.target.value })}
              className={INPUT}
            />
          </div>
          {/* Was an editable input. It wrote a third copy of the address —
              footer, terms and privacy each had one — so changing it here left
              the footer quoting the old one. Now it only shows where to go. */}
          <div>
            <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-1.5">Contact Email</label>
            <div className="flex items-center gap-2 min-h-[42px] px-3 rounded border border-[var(--line)] bg-[var(--fg)]/[0.02]">
              <span className="text-[var(--fg-muted)] text-sm truncate">{footer.contact_email || '—'}</span>
              <Link
                to="/admin/navigation?tab=footer"
                className="ml-auto flex-shrink-0 text-[11px] uppercase tracking-wider text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors"
              >
                Change in Footer
              </Link>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-1.5">Intro (optional)</label>
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
          <p className="text-[var(--fg)] text-sm font-medium">Sections ({page.sections.length})</p>
          <p className="text-[var(--fg-muted)] text-xs font-mono">
            Body supports paragraph breaks (blank line), "- " bullet lists and **bold**.
          </p>
        </div>

        {page.sections.map((s, idx) => (
          <div key={s.id} className="bg-[var(--surface-2)] border border-[var(--line)] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                value={s.heading}
                onChange={e => editSection(idx, { heading: e.target.value })}
                className={INPUT + ' font-medium'}
                placeholder="Section heading"
              />
              <button onClick={() => moveSection(idx, -1)} disabled={idx === 0}
                className="w-8 h-8 flex items-center justify-center rounded text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-30 transition-colors">
                <ArrowUp size={14} />
              </button>
              <button onClick={() => moveSection(idx, 1)} disabled={idx === page.sections.length - 1}
                className="w-8 h-8 flex items-center justify-center rounded text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-30 transition-colors">
                <ArrowDown size={14} />
              </button>
              <button onClick={() => removeSection(idx)}
                className="w-8 h-8 flex items-center justify-center rounded text-[var(--fg-muted)] hover:text-[var(--danger)] transition-colors">
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
          className="flex items-center gap-2 px-4 py-2 bg-[var(--surface-3)] hover:bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-lg text-sm text-[var(--fg)] transition-colors"
        >
          <Plus size={13} /> Add section
        </button>
      </section>

      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[var(--tc-brand)] hover:bg-[var(--accent-hover)] disabled:opacity-40 text-[var(--on-accent)] rounded-lg text-sm font-medium transition-colors"
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
        <h1 className="text-2xl font-bold text-[var(--fg)] tracking-tight">Legal Pages</h1>
        <p className="text-[var(--fg-muted)] text-sm mt-1">
          Edit the Privacy Policy and Terms &amp; Conditions content shown on the public site.
        </p>
      </div>

      <div className="flex gap-1 bg-[var(--surface-2)] border border-[var(--line)] rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              tab === t.id
                ? 'bg-[var(--surface-3)] text-[var(--fg)] border border-[var(--line-strong)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg-muted)]'
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
              ? 'bg-[var(--surface-3)] border border-[var(--line-strong)] text-[var(--fg-muted)]'
              : 'bg-[var(--danger-soft)] border border-[var(--danger-line)] text-[var(--danger)]'
          }`}>
            {t.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
