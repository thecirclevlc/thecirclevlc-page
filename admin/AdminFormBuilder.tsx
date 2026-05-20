import React, { useEffect, useState } from 'react';
import {
  Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown,
  CheckCircle, AlertCircle, RotateCcw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/slugify';
import {
  FORM_SCHEMA_JOIN_KEY,
  type FormSchema, type FormFieldSchema, type FormFieldType,
} from '../lib/database.types';
import { DEFAULT_FORM_SCHEMA } from '../lib/formSchema';

interface ToastMsg { text: string; type: 'success' | 'error' }

const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors';
const TEXTAREA = INPUT + ' min-h-[80px] resize-y';
const SECTION = 'bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4';

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text',     label: 'Text' },
  { value: 'email',    label: 'Email' },
  { value: 'tel',      label: 'Phone' },
  { value: 'url',      label: 'URL' },
  { value: 'number',   label: 'Number' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select',   label: 'Select (dropdown)' },
];

function uuid() {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function FieldEditor({
  field, onChange, onMoveUp, onMoveDown, onDelete, canUp, canDown,
}: {
  field: FormFieldSchema;
  onChange: (next: FormFieldSchema) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const setLabel = (label: string) => {
    // Auto-sync name slug only if the current name looks auto-derived
    const autoName = slugify(field.label).replace(/-/g, '_');
    const newName = field.name === autoName || field.name === '' ? slugify(label).replace(/-/g, '_') : field.name;
    onChange({ ...field, label, name: newName });
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start">
        <div className="space-y-3">
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Label (shown to user)</label>
            <input className={INPUT} value={field.label} onChange={e => setLabel(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Name (key)</label>
              <input
                className={INPUT + ' font-mono'}
                value={field.name}
                onChange={e => onChange({ ...field, name: slugify(e.target.value).replace(/-/g, '_') })}
              />
            </div>
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Type</label>
              <select
                value={field.type}
                onChange={e => onChange({ ...field, type: e.target.value as FormFieldType })}
                className={INPUT}
              >
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-[#ccc] py-2.5">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={e => onChange({ ...field, required: e.target.checked })}
                  className="w-4 h-4 accent-[#059669]"
                />
                Required
              </label>
            </div>
          </div>

          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Placeholder</label>
            <input className={INPUT} value={field.placeholder ?? ''} onChange={e => onChange({ ...field, placeholder: e.target.value })} />
          </div>

          {field.type === 'textarea' && (
            <div className="max-w-[160px]">
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Rows</label>
              <input
                type="number"
                min={1} max={20}
                value={field.rows ?? 3}
                onChange={e => onChange({ ...field, rows: Math.max(1, Number(e.target.value) || 3) })}
                className={INPUT}
              />
            </div>
          )}

          {field.type === 'select' && (
            <div>
              <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Options (one per line)</label>
              <textarea
                value={(field.options ?? []).join('\n')}
                onChange={e => onChange({ ...field, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                rows={4}
                className={TEXTAREA + ' font-mono'}
                placeholder={'Option A\nOption B\nOption C'}
              />
            </div>
          )}
        </div>

        <div className="flex md:flex-col gap-1 items-end md:items-stretch justify-end">
          <button onClick={onMoveUp} disabled={!canUp}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
            aria-label="Move up"><ArrowUp size={14} /></button>
          <button onClick={onMoveDown} disabled={!canDown}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
            aria-label="Move down"><ArrowDown size={14} /></button>
          <button onClick={onDelete}
            className="w-8 h-8 flex items-center justify-center rounded text-[#666] hover:text-red-400 hover:bg-red-950/30 transition-colors"
            aria-label="Delete"><Trash2 size={14} /></button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFormBuilder() {
  const [schema, setSchema] = useState<FormSchema>(DEFAULT_FORM_SCHEMA);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toasts, setToasts] = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  useEffect(() => {
    supabase.from('site_settings').select('value').eq('id', FORM_SCHEMA_JOIN_KEY).single()
      .then(({ data }) => {
        if (data?.value) setSchema({ ...DEFAULT_FORM_SCHEMA, ...(data.value as FormSchema) });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const update = (patch: Partial<FormSchema>) => { setSchema(prev => ({ ...prev, ...patch })); setDirty(true); };
  const setFields = (fields: FormFieldSchema[]) =>
    update({ fields: fields.map((f, i) => ({ ...f, sort_order: i })) });

  const addField = () => setFields([
    ...schema.fields,
    {
      id: uuid(),
      name: `field_${schema.fields.length + 1}`,
      label: 'New field',
      type: 'text',
      required: false,
      sort_order: schema.fields.length,
    },
  ]);

  const editField = (idx: number, next: FormFieldSchema) =>
    setFields(schema.fields.map((f, i) => i === idx ? next : f));

  const moveField = (idx: number, dir: -1 | 1) => {
    const arr = schema.fields.slice();
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setFields(arr);
  };

  const removeField = (idx: number) =>
    setFields(schema.fields.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const sorted = [...schema.fields].sort((a, b) => a.sort_order - b.sort_order).map((f, i) => ({ ...f, sort_order: i }));
      const toSave = { ...schema, fields: sorted };
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: FORM_SCHEMA_JOIN_KEY, value: toSave, updated_at: new Date().toISOString() });
      if (error) throw error;
      setSchema(toSave);
      setDirty(false);
      addToast({ text: 'Form schema saved', type: 'success' });
    } catch (err: any) {
      addToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally { setSaving(false); }
  };

  const resetDefaults = () => {
    if (!confirm('Reset all settings to defaults? Unsaved changes will be lost.')) return;
    setSchema(DEFAULT_FORM_SCHEMA);
    setDirty(true);
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Form Builder</h1>
          <p className="text-[#555] text-sm mt-1">
            Edit the "Join The Circle" application form: title, fields, validation, captcha, and labels.
          </p>
        </div>
        <button
          onClick={resetDefaults}
          className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#999] transition-colors"
          title="Reset to defaults"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Page text</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Title</label>
            <input className={INPUT} value={schema.title} onChange={e => update({ title: e.target.value })} />
            <p className="text-[#333] text-xs mt-1 font-mono">Big animated title. Spaces split into lines.</p>
          </div>
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Subtitle</label>
            <input className={INPUT} value={schema.subtitle} onChange={e => update({ subtitle: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Event Info</label>
            <input className={INPUT} value={schema.event_info} onChange={e => update({ event_info: e.target.value })} />
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Success screen</p>
        <div>
          <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Success Title</label>
          <input className={INPUT} value={schema.success_title} onChange={e => update({ success_title: e.target.value })} />
        </div>
        <div>
          <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Success Subtitle</label>
          <textarea className={TEXTAREA} rows={2} value={schema.success_subtitle} onChange={e => update({ success_subtitle: e.target.value })} />
        </div>
      </section>

      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Submit button labels</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Idle</label>
            <input className={INPUT} value={schema.submit_label_idle} onChange={e => update({ submit_label_idle: e.target.value })} />
          </div>
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Sending</label>
            <input className={INPUT} value={schema.submit_label_sending} onChange={e => update({ submit_label_sending: e.target.value })} />
          </div>
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Error</label>
            <input className={INPUT} value={schema.submit_label_error} onChange={e => update({ submit_label_error: e.target.value })} />
          </div>
          <div>
            <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Return</label>
            <input className={INPUT} value={schema.return_label} onChange={e => update({ return_label: e.target.value })} />
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Terms checkbox + CAPTCHA</p>
        <div>
          <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Terms text</label>
          <textarea
            className={TEXTAREA}
            rows={2}
            value={schema.terms_text_html}
            onChange={e => update({ terms_text_html: e.target.value })}
          />
          <p className="text-[#333] text-xs mt-1 font-mono">
            Use <code className="text-amber-400">{'{terms_link:LABEL}'}</code> and <code className="text-amber-400">{'{privacy_link:LABEL}'}</code> as link placeholders.
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-[#ccc]">
          <input
            type="checkbox"
            checked={schema.captcha_required}
            onChange={e => update({ captcha_required: e.target.checked })}
            className="w-4 h-4 accent-[#059669]"
          />
          Require Google reCAPTCHA verification
        </label>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-medium">Fields ({schema.fields.length})</p>
          <p className="text-[#555] text-xs font-mono">Reorder with ↑ ↓ — name is the JSON key in submissions.</p>
        </div>

        {[...schema.fields].sort((a, b) => a.sort_order - b.sort_order).map((field, idx, arr) => (
          <FieldEditor
            key={field.id}
            field={field}
            onChange={next => editField(schema.fields.findIndex(f => f.id === field.id), next)}
            onMoveUp={() => moveField(schema.fields.findIndex(f => f.id === field.id), -1)}
            onMoveDown={() => moveField(schema.fields.findIndex(f => f.id === field.id), 1)}
            onDelete={() => removeField(schema.fields.findIndex(f => f.id === field.id))}
            canUp={idx > 0}
            canDown={idx < arr.length - 1}
          />
        ))}

        <button
          onClick={addField}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-sm text-[#ccc] transition-colors"
        >
          <Plus size={13} /> Add field
        </button>
      </section>

      <div className="flex justify-end sticky bottom-4 z-20">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors shadow-lg"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : dirty ? 'Save form schema' : 'Saved'}
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
