import React, { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Save, Plus, Trash2, ArrowUp, ArrowDown,
  CheckCircle, AlertCircle, AlertTriangle, Copy, ExternalLink, FilePlus2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { slugify } from '../lib/slugify';
import { mergeBlock } from '../lib/mergeBlock';
import {
  DEFAULT_FORM_SLUG, formKeyForSlug, formPath, CTA_BLOCKS, BOOLEAN_FIELD_TYPES,
  type FormSchema, type FormFieldSchema, type FormFieldType,
  type CtaBlock, type CtaKey,
} from '../lib/database.types';
import {
  DEFAULT_FORM_SCHEMA, blankFormSchema, listForms, uniqueFormSlug,
  type FormListItem,
} from '../lib/formSchema';

interface ToastMsg { text: string; type: 'success' | 'error' }

const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors disabled:opacity-35 disabled:cursor-not-allowed';
const TEXTAREA = INPUT + ' min-h-[80px] resize-y';
const SECTION = 'bg-[#111] border border-[#1a1a1a] rounded-xl p-5 space-y-4';
const LABEL = 'block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5';

const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: 'text',     label: 'Text' },
  { value: 'email',    label: 'Email' },
  { value: 'tel',      label: 'Phone' },
  { value: 'url',      label: 'URL' },
  { value: 'number',   label: 'Number' },
  { value: 'date',     label: 'Date' },
  { value: 'textarea', label: 'Long text' },
  { value: 'select',   label: 'Dropdown' },
  // These two names were the whole problem. "Yes / No" sat on the single tick
  // box, so a yes/no QUESTION got a lone "Yes" to tick — and made required it
  // could not be answered "no" at all. She picked the right-sounding one and
  // got the wrong control; the label was lying, not her.
  { value: 'radio',    label: 'Yes / No — they choose' },
  { value: 'checkbox', label: 'Tick box to agree' },
];

/** Field names the submission row uses for its own bookkeeping. */
const RESERVED_NAMES = ['id', 'status', 'notes', 'created_at', 'form_key', 'data', 'ip_hash', 'user_agent'];

function uuid() {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.()
    ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const toKey = (s: string) => slugify(s).replace(/-/g, '_');

function FieldEditor({
  field, siblings, onChange, onMoveUp, onMoveDown, onDelete, canUp, canDown,
}: {
  field: FormFieldSchema;
  siblings: FormFieldSchema[];
  onChange: (next: FormFieldSchema) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  canUp: boolean;
  canDown: boolean;
}) {
  const setLabel = (label: string) => {
    // Auto-sync the key only while it still looks auto-derived, so renaming a
    // question never silently orphans the answers already collected under it.
    const autoName = toKey(field.label);
    const newName = field.name === autoName || field.name === '' ? toKey(label) : field.name;
    onChange({ ...field, label, name: newName });
  };

  const nameClash = siblings.some(f => f.id !== field.id && f.name === field.name);
  const nameReserved = RESERVED_NAMES.includes(field.name);
  const needsOptions = field.type === 'select' || field.type === 'radio';

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-start">
        <div className="space-y-3">
          <div>
            <label className={LABEL}>Question (shown to visitor)</label>
            <input className={INPUT} value={field.label} onChange={e => setLabel(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className={LABEL}>Type</label>
              <select
                value={field.type}
                onChange={e => {
                  const type = e.target.value as FormFieldType;
                  onChange({
                    ...field,
                    type,
                    // Never leave a choice with an empty list. Yes/No for the
                    // radio because that is what it is for here — anything
                    // else she types over in two seconds.
                    options: (type === 'select' || type === 'radio') && !field.options?.length
                      ? (type === 'radio' ? ['Yes', 'No'] : ['Option A', 'Option B'])
                      : field.options,
                  });
                }}
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
            <div className="flex items-end">
              {field.type === 'textarea' && (
                <div className="w-full">
                  <label className={LABEL}>Rows</label>
                  <input
                    type="number" min={1} max={20}
                    value={field.rows ?? 3}
                    onChange={e => onChange({ ...field, rows: Math.max(1, Number(e.target.value) || 3) })}
                    className={INPUT}
                  />
                </div>
              )}
            </div>
          </div>

          {/* The trap that lost applications: a required tick box cannot be
              answered "no" — it can only be ticked or left, and leaving it
              blocks the send. Fine for "I accept the terms", wrong for any
              real question. */}
          {field.type === 'checkbox' && field.required && (
            <p className="flex items-start gap-2 text-amber-300/80 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <span>
                A required tick box can only be answered <strong className="font-medium">yes</strong> —
                anyone who would say no cannot send the form at all. Keep this only for things they must
                agree to. For a real question use <strong className="font-medium">Yes / No — they choose</strong>.
              </span>
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>
                {field.type === 'checkbox' ? 'Text next to the box' : 'Placeholder'}
              </label>
              <input
                className={INPUT}
                value={field.placeholder ?? ''}
                onChange={e => onChange({ ...field, placeholder: e.target.value })}
                placeholder={field.type === 'checkbox' ? 'Yes' : ''}
              />
            </div>
            <div>
              <label className={LABEL}>Help text (optional)</label>
              <input
                className={INPUT}
                value={field.help_text ?? ''}
                onChange={e => onChange({ ...field, help_text: e.target.value })}
                placeholder="Small print under the field"
              />
            </div>
          </div>

          {needsOptions && (
            <div>
              <label className={LABEL}>Options (one per line)</label>
              <textarea
                value={(field.options ?? []).join('\n')}
                onChange={e => onChange({ ...field, options: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                rows={4}
                className={TEXTAREA + ' font-mono'}
                placeholder={'Option A\nOption B\nOption C'}
              />
              {(field.options ?? []).length === 0 && (
                <p className="text-amber-500/80 text-xs mt-1">Add at least one option or this question renders empty.</p>
              )}
            </div>
          )}

          <details className="group">
            <summary className="text-[#444] text-xs cursor-pointer hover:text-[#666] select-none">Advanced</summary>
            <div className="mt-2">
              <label className={LABEL}>Answer key</label>
              <input
                className={INPUT + ' font-mono'}
                value={field.name}
                onChange={e => onChange({ ...field, name: toKey(e.target.value) })}
              />
              <p className="text-[#444] text-xs mt-1">
                The column name in your CSV export. Changing it means older answers no longer line up under this question.
              </p>
              {nameClash && (
                <p className="text-red-400 text-xs mt-1">Another question already uses this key — one will overwrite the other.</p>
              )}
              {nameReserved && (
                <p className="text-red-400 text-xs mt-1">"{field.name}" is reserved. Pick another key.</p>
              )}
            </div>
          </details>
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
  const [forms, setForms]     = useState<FormListItem[]>([]);
  const [slug, setSlug]       = useState<string>(DEFAULT_FORM_SLUG);
  const [schema, setSchema]   = useState<FormSchema>(DEFAULT_FORM_SCHEMA);
  const [ctas, setCtas]       = useState<Record<CtaKey, CtaBlock | null>>({
    content_cta_events: null, content_cta_djs: null, content_cta_artists: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [toasts, setToasts]   = useState<(ToastMsg & { id: number })[]>([]);

  const addToast = (t: ToastMsg) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  // ── Load the form list + the CTA rows once ──────────────────────
  const refreshForms = useCallback(async () => {
    const list = await listForms();
    setForms(list);
    return list;
  }, []);

  useEffect(() => {
    (async () => {
      await refreshForms();
      const { data } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', CTA_BLOCKS.map(c => c.key));
      const next = { ...ctas };
      (data ?? []).forEach(r => { next[r.id as CtaKey] = r.value as CtaBlock; });
      setCtas(next);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Load the selected form ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    supabase.from('site_settings').select('value').eq('id', formKeyForSlug(slug)).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSchema(mergeBlock(DEFAULT_FORM_SCHEMA, data?.value));
        setDirty(false);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [slug]);

  const update = (patch: Partial<FormSchema>) => { setSchema(prev => ({ ...prev, ...patch })); setDirty(true); };

  // Only a tick-box can carry consent. Offering a text answer here would let
  // her wire the mailing list to something that is never 'yes'.
  const consentCandidates = schema.fields.filter(f => BOOLEAN_FIELD_TYPES.includes(f.type));

  const setFields = (fields: FormFieldSchema[]) =>
    update({ fields: fields.map((f, i) => ({ ...f, sort_order: i })) });

  const addField = () => setFields([
    ...schema.fields,
    {
      id: uuid(),
      name: `field_${schema.fields.length + 1}`,
      label: 'New question',
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

  const removeField = (idx: number) => setFields(schema.fields.filter((_, i) => i !== idx));

  // ── Save ────────────────────────────────────────────────────────
  const save = async () => {
    setSaving(true);
    try {
      const sorted = [...schema.fields]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((f, i) => ({ ...f, sort_order: i }));
      const toSave = { ...schema, fields: sorted };

      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: formKeyForSlug(slug), value: toSave, updated_at: new Date().toISOString() });
      if (error) throw error;

      setSchema(toSave);
      setDirty(false);
      await refreshForms();
      addToast({ text: 'Form saved', type: 'success' });
    } catch (err: any) {
      addToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally { setSaving(false); }
  };

  // ── Create / duplicate / delete ─────────────────────────────────
  const createForm = async (source?: FormSchema) => {
    const name = prompt(source ? 'Name for the copy:' : 'Name for the new form:',
      source ? `${source.name} copy` : 'Artists application');
    if (!name?.trim()) return;

    const newSlug = uniqueFormSlug(name, forms.map(f => f.slug));
    const value: FormSchema = source
      ? { ...source, name: name.trim() }
      : blankFormSchema(name.trim());

    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: formKeyForSlug(newSlug), value, updated_at: new Date().toISOString() });
    if (error) { addToast({ text: error.message, type: 'error' }); return; }

    await refreshForms();
    setSlug(newSlug);
    addToast({ text: `"${name.trim()}" created`, type: 'success' });
  };

  const deleteForm = async () => {
    if (slug === DEFAULT_FORM_SLUG) {
      addToast({ text: 'The main form cannot be deleted', type: 'error' });
      return;
    }
    const usedBy = CTA_BLOCKS.filter(c => ctas[c.key]?.form_slug === slug).map(c => c.label);
    const warning = usedBy.length
      ? `\n\nIt is currently used by: ${usedBy.join(', ')}. Those buttons will fall back to the main form.`
      : '';
    if (!confirm(`Delete "${schema.name}" permanently?${warning}\n\nAnswers already received are kept.`)) return;

    const { error } = await supabase.from('site_settings').delete().eq('id', formKeyForSlug(slug));
    if (error) { addToast({ text: error.message, type: 'error' }); return; }

    await refreshForms();
    setSlug(DEFAULT_FORM_SLUG);
    addToast({ text: 'Form deleted', type: 'success' });
  };

  // ── "Appears in": point a page's CTA button at this form ─────────
  const toggleCta = async (key: CtaKey, on: boolean) => {
    const current = ctas[key] ?? { title: '', subtitle: '', form_slug: '', cta_label: '' };
    const next: CtaBlock = { ...current, form_slug: on ? slug : '' };
    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: key, value: next, updated_at: new Date().toISOString() });
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    setCtas(prev => ({ ...prev, [key]: next }));
    addToast({ text: on ? 'Button now opens this form' : 'Button reset to the main form', type: 'success' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-[#444] animate-spin" />
      </div>
    );
  }

  const publicPath = formPath(slug);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Forms</h1>
          <p className="text-[#555] text-sm mt-1">
            Build any number of forms — one for the public, one for artists, one for DJs — and choose where each appears.
          </p>
        </div>
      </div>

      {/* Form picker */}
      <section className={SECTION}>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className={LABEL}>Editing</label>
            <select
              className={INPUT}
              value={slug}
              onChange={e => {
                if (dirty && !confirm('Switch form and discard unsaved changes?')) return;
                setSlug(e.target.value);
              }}
            >
              {forms.map(f => (
                <option key={f.slug} value={f.slug}>
                  {f.name}{f.is_default ? ' — main form' : ''}
                </option>
              ))}
            </select>
          </div>

          <button onClick={() => createForm()}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors">
            <FilePlus2 size={13} /> New form
          </button>
          <button onClick={() => createForm(schema)}
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors">
            <Copy size={13} /> Duplicate
          </button>
          <a href={publicPath} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors">
            <ExternalLink size={13} /> View
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Form name (admin only)</label>
            <input className={INPUT} value={schema.name} onChange={e => update({ name: e.target.value })} />
          </div>
          <div>
            <label className={LABEL}>Web address</label>
            <input className={INPUT + ' font-mono text-[#666]'} value={publicPath} readOnly />
          </div>
        </div>
      </section>

      {/* Appears in */}
      <section className={SECTION}>
        <div>
          <p className="text-white text-sm font-medium">Appears in</p>
          <p className="text-[#555] text-xs mt-1">
            Tick a page and its button opens this form instead of the main one.
          </p>
        </div>
        <div className="space-y-2">
          {CTA_BLOCKS.map(c => {
            const assigned = ctas[c.key]?.form_slug === slug;
            const takenBy  = ctas[c.key]?.form_slug;
            const other    = takenBy && takenBy !== slug
              ? forms.find(f => f.slug === takenBy)?.name ?? takenBy
              : null;
            return (
              <label key={c.key} className="flex items-center gap-3 cursor-pointer text-sm text-[#ccc] py-1">
                <input
                  type="checkbox"
                  checked={assigned}
                  onChange={e => toggleCta(c.key, e.target.checked)}
                  className="w-4 h-4 accent-[#059669]"
                />
                <span>{c.label}</span>
                {other && <span className="text-[#555] text-xs">— currently opens "{other}"</span>}
              </label>
            );
          })}
        </div>
      </section>

      {/* Page text */}
      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Page text</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Title</label>
            <input className={INPUT} value={schema.title} onChange={e => update({ title: e.target.value })} />
            <p className="text-[#333] text-xs mt-1">Big animated title. Spaces split it into lines.</p>
          </div>
          <div>
            <label className={LABEL}>Subtitle</label>
            <input className={INPUT} value={schema.subtitle} onChange={e => update({ subtitle: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className={LABEL}>Event info</label>
            <input className={INPUT} value={schema.event_info} onChange={e => update({ event_info: e.target.value })} />
          </div>
        </div>
      </section>

      {/* Fields */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-medium">Questions ({schema.fields.length})</p>
          <p className="text-[#555] text-xs">Reorder with ↑ ↓</p>
        </div>

        {[...schema.fields].sort((a, b) => a.sort_order - b.sort_order).map((field, idx, arr) => (
          <FieldEditor
            key={field.id}
            field={field}
            siblings={schema.fields}
            onChange={next => editField(schema.fields.findIndex(f => f.id === field.id), next)}
            onMoveUp={() => moveField(schema.fields.findIndex(f => f.id === field.id), -1)}
            onMoveDown={() => moveField(schema.fields.findIndex(f => f.id === field.id), 1)}
            onDelete={() => removeField(schema.fields.findIndex(f => f.id === field.id))}
            canUp={idx > 0}
            canDown={idx < arr.length - 1}
          />
        ))}

        <button onClick={addField}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-sm text-[#ccc] transition-colors">
          <Plus size={13} /> Add question
        </button>
      </section>

      {/* Mailing list */}
      <section className={SECTION}>
        <div>
          <p className="text-white text-sm font-medium">Send to your mailing list</p>
          <p className="text-[#555] text-xs mt-1">
            In Mailchimp open <span className="text-[#888]">Audience → Signup forms → Embedded form</span> and copy the
            address inside <code className="text-amber-400/80">form action="…"</code>. Paste it here.
            Brevo, MailerLite and ConvertKit work the same way — you can change provider yourself, any time.
          </p>
        </div>
        <div>
          <label className={LABEL}>Mailing list address</label>
          <input
            className={INPUT + ' font-mono text-xs'}
            value={schema.crm_post_url}
            onChange={e => update({ crm_post_url: e.target.value.trim() })}
            placeholder="https://your-account.us1.list-manage.com/subscribe/post?u=…&id=…"
          />
        </div>
        <div className="max-w-xs">
          <label className={LABEL}>Which question holds the email</label>
          <select
            className={INPUT}
            value={schema.crm_email_field}
            onChange={e => update({ crm_email_field: e.target.value })}
          >
            {schema.fields.map(f => <option key={f.id} value={f.name}>{f.label}</option>)}
          </select>
        </div>
        <div className="max-w-xs">
          <label className={LABEL}>Mailchimp tag</label>
          <input
            className={INPUT + ' font-mono text-xs'}
            value={schema.crm_tags}
            onChange={e => update({ crm_tags: e.target.value })}
            placeholder="3313342"
          />
          <p className="text-[#555] text-xs mt-1.5">
            Optional. Everyone from this form gets this tag, so you can write to just
            this group later. In Mailchimp open <span className="text-[#888]">Audience → Tags</span>,
            create the tag, then <span className="text-[#888]">Signup forms → Embedded form</span> and
            copy the number in <code className="text-amber-400/80">name="tags"</code>.
            Separate several with commas.
          </p>
          {/* Verified against her own audience: Mailchimp accepts a signup with
              an unknown tag ID and simply does not tag it — no error, here or
              anywhere. Nothing in code can catch that, so the only defence is
              telling her the one check that does. */}
          {schema.crm_tags && (
            <p className="text-[#555] text-xs mt-1.5 border-l border-[#2a2a2a] pl-2.5">
              It must be the <em className="text-[#777] not-italic">number</em>, not the name. A wrong
              number gives no error anywhere — the person is added without the tag. After saving, send
              yourself one test and check it appears under that tag in Mailchimp.
            </p>
          )}
        </div>

        <div className="max-w-xs">
          <label className={LABEL}>Only if they tick</label>
          <select
            className={INPUT}
            value={schema.crm_consent_field}
            onChange={e => update({ crm_consent_field: e.target.value })}
          >
            <option value="">Everyone who sends the form</option>
            {consentCandidates.map(f => (
              <option key={f.id} value={f.name}>{f.label}</option>
            ))}
          </select>
          <p className="text-[#555] text-xs mt-1.5">
            Filling in a form is not the same as asking for a newsletter. Pick the
            tick-box that asks for it, and only those people go to your mailing list —
            everyone else still arrives in Applications.
          </p>
        </div>

        {/* Sending applicants to a mailing list on the strength of a terms
            checkbox is the mistake this catches. It is a legal one, not a
            visual one, so it says what to do rather than just going red. */}
        {schema.crm_post_url && !schema.crm_consent_field && (
          <p className="flex items-start gap-2 text-amber-300/80 text-xs bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2.5">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span>
              Everyone who sends this form is added to your mailing list, whether they
              asked for it or not.{' '}
              {consentCandidates.length === 0
                ? 'Add a tick-box question like "I would like to receive news about future events" and choose it above.'
                : 'Choose the tick-box above so only the people who ask for it are added.'}
            </span>
          </p>
        )}

        <p className="text-[#444] text-xs">
          Every answer is stored here first, so nothing is lost if the mailing list is down or the address is wrong.
        </p>
      </section>

      {/* Terms + captcha */}
      <section className={SECTION}>
        <p className="text-white text-sm font-medium">Terms &amp; anti-spam</p>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-[#ccc]">
          <input
            type="checkbox"
            checked={schema.terms_required}
            onChange={e => update({ terms_required: e.target.checked })}
            className="w-4 h-4 accent-[#059669]"
          />
          Ask visitors to accept the terms before sending
        </label>
        {schema.terms_required && (
          <div>
            <label className={LABEL}>Terms text</label>
            <textarea
              className={TEXTAREA} rows={2}
              value={schema.terms_text_html}
              onChange={e => update({ terms_text_html: e.target.value })}
            />
            <p className="text-[#333] text-xs mt-1">
              Use <code className="text-amber-400">{'{terms_link:LABEL}'}</code> and <code className="text-amber-400">{'{privacy_link:LABEL}'}</code> to insert links.
              The exact wording is stored with every answer as proof of consent.
            </p>
          </div>
        )}
        <label className="flex items-center gap-2 cursor-pointer text-sm text-[#ccc]">
          <input
            type="checkbox"
            checked={schema.captcha_required}
            onChange={e => update({ captcha_required: e.target.checked })}
            className="w-4 h-4 accent-[#059669]"
          />
          Require the "I'm not a robot" check
        </label>
        {/* The key lives in the hosting environment, not in the database, so
            this switch can be on while the widget has nothing to render. It
            used to fail silently. */}
        {schema.captcha_required && !import.meta.env.VITE_RECAPTCHA_SITE_KEY && (
          <p className="flex items-start gap-2 text-amber-300/90 text-xs leading-relaxed
                        bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5">
            <AlertCircle size={14} className="flex-shrink-0 mt-px" />
            <span>
              The robot check is switched on but this site has no reCAPTCHA key,
              so it will not appear and the form will send without it. Nothing is
              broken — ask your developer to add the key when you want it active.
            </span>
          </p>
        )}
      </section>

      {/* Success + buttons */}
      <section className={SECTION}>
        <p className="text-white text-sm font-medium">After sending</p>
        <div>
          <label className={LABEL}>Thank-you title</label>
          <input className={INPUT} value={schema.success_title} onChange={e => update({ success_title: e.target.value })} />
        </div>
        <div>
          <label className={LABEL}>Thank-you message</label>
          <textarea className={TEXTAREA} rows={2} value={schema.success_subtitle} onChange={e => update({ success_subtitle: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            ['submit_label_idle',    'Send button'],
            ['submit_label_sending', 'While sending'],
            ['submit_label_error',   'On error'],
            ['return_label',         'Back button'],
          ] as const).map(([key, label]) => (
            <div key={key}>
              <label className={LABEL}>{label}</label>
              <input className={INPUT} value={schema[key]} onChange={e => update({ [key]: e.target.value } as Partial<FormSchema>)} />
            </div>
          ))}
        </div>
      </section>

      {/* Danger zone */}
      {slug !== DEFAULT_FORM_SLUG && (
        <section className="bg-[#140b0b] border border-red-900/30 rounded-xl p-5">
          <p className="text-red-300/90 text-sm font-medium">Delete this form</p>
          <p className="text-[#666] text-xs mt-1 mb-3">
            The form and its page disappear. Answers already received stay in the inbox.
          </p>
          <button onClick={deleteForm}
            className="flex items-center gap-2 px-3 py-2 bg-red-950/40 hover:bg-red-950/70 border border-red-900/40 rounded-lg text-xs text-red-300 transition-colors">
            <Trash2 size={13} /> Delete "{schema.name}"
          </button>
        </section>
      )}

      <div className="flex justify-end sticky bottom-4 z-20">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors shadow-lg"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : dirty ? 'Save form' : 'Saved'}
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
