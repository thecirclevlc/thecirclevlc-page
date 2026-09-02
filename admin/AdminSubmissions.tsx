import React, { useEffect, useState, useMemo } from 'react';
import {
  Loader2, Search, Inbox, CheckCircle, AlertCircle, Trash2,
  Download, X, Mail,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { slugFromFormKey, type FormSubmissionRow, type SubmissionStatus } from '../lib/database.types';
import { listForms } from '../lib/formSchema';

interface ToastMsg { text: string; type: 'success' | 'error' }

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  new:      'bg-[var(--surface-3)]  text-[var(--fg-muted)]  border-[var(--line-strong)]',
  reviewed: 'bg-[var(--surface-3)]   text-[var(--fg-muted)]   border-[var(--line-strong)]',
  accepted: 'bg-[var(--surface-3)] text-[var(--fg-muted)] border-[var(--line-strong)]',
  rejected: 'bg-[var(--danger-soft)] text-[var(--danger)]    border-[var(--danger-line)]',
};

const STATUSES: SubmissionStatus[] = ['new', 'reviewed', 'accepted', 'rejected'];

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

export function pickDisplayName(data: Record<string, string>): string {
  return data.fullName || data.full_name || data.name || Object.values(data)[0] || '—';
}

export function pickEmail(data: Record<string, string>): string {
  return data.email || data.e_mail || data.email_address || '';
}

function exportCSV(rows: FormSubmissionRow[]) {
  if (rows.length === 0) return;
  // Collect all unique field names
  const fieldNames = new Set<string>();
  rows.forEach(r => Object.keys(r.data).forEach(k => fieldNames.add(k)));
  const headers = ['id', 'created_at', 'form_key', 'status', 'notes', ...Array.from(fieldNames)];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(','),
    ...rows.map(r => headers.map(h => {
      if (h === 'id' || h === 'created_at' || h === 'status' || h === 'form_key') return escape(String((r as any)[h] ?? ''));
      if (h === 'notes') return escape(r.notes ?? '');
      return escape(r.data[h] ?? '');
    }).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminSubmissions() {
  const [rows, setRows] = useState<FormSubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | SubmissionStatus>('all');
  const [formFilter, setFormFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FormSubmissionRow | null>(null);
  const [toasts, setToasts] = useState<(ToastMsg & { id: number })[]>([]);
  const [formNames, setFormNames] = useState<Record<string, string>>({});

  const addToast = (t: ToastMsg) => {
    const id = Date.now();
    setToasts(prev => [...prev, { ...t, id }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 3500);
  };

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) addToast({ text: error.message, type: 'error' });
    if (data) setRows(data as FormSubmissionRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Names for the form filter — the submission row only carries the key.
  useEffect(() => {
    listForms().then(list =>
      setFormNames(Object.fromEntries(list.map(f => [f.key, f.name]))));
  }, []);

  const counts = useMemo(() => {
    const c: Record<SubmissionStatus, number> = { new: 0, reviewed: 0, accepted: 0, rejected: 0 };
    rows.forEach(r => { c[r.status]++; });
    return c;
  }, [rows]);

  // One entry per form that has actually received answers, so the picker never
  // offers an empty filter.
  const formKeys = useMemo(() => {
    const seen = new Map<string, number>();
    rows.forEach(r => seen.set(r.form_key, (seen.get(r.form_key) ?? 0) + 1));
    return Array.from(seen.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (formFilter !== 'all' && r.form_key !== formFilter) return false;
      if (filter !== 'all' && r.status !== filter) return false;
      if (q) {
        const name = pickDisplayName(r.data).toLowerCase();
        const email = pickEmail(r.data).toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, formFilter, search]);

  const updateRow = async (id: string, patch: Partial<FormSubmissionRow>) => {
    const { error } = await supabase.from('form_submissions').update(patch).eq('id', id);
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } as FormSubmissionRow : r));
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, ...patch } as FormSubmissionRow : prev);
    addToast({ text: 'Updated', type: 'success' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this submission permanently?')) return;
    const { error } = await supabase.from('form_submissions').delete().eq('id', id);
    if (error) { addToast({ text: error.message, type: 'error' }); return; }
    setRows(prev => prev.filter(r => r.id !== id));
    if (selected?.id === id) setSelected(null);
    addToast({ text: 'Deleted', type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--fg)] tracking-tight">Form Submissions</h1>
          <p className="text-[var(--fg-muted)] text-sm mt-1">
            Every answer received, from every form.
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-3)] hover:bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-lg text-xs text-[var(--fg)] transition-colors disabled:opacity-40"
        >
          <Download size={12} /> Export CSV ({filtered.length})
        </button>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(filter === s ? 'all' : s)}
            className={`bg-[var(--surface-1)] border rounded-xl p-4 text-left transition-all ${
              filter === s ? 'border-[var(--line-strong)]' : 'border-[var(--line)] hover:border-[var(--line-strong)]'
            }`}
          >
            <p className="text-3xl font-bold text-[var(--fg)] tabular-nums">{counts[s]}</p>
            <p className="text-[var(--fg-muted)] text-xs tracking-widest uppercase mt-1">{s}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-[var(--fg-muted)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="bg-transparent text-[var(--fg)] text-sm focus:outline-none flex-1 placeholder-[var(--fg-faint)]"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | SubmissionStatus)}
          className="bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--accent-line)]"
        >
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {formKeys.length > 1 && (
          <select
            value={formFilter}
            onChange={e => setFormFilter(e.target.value)}
            className="bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--accent-line)]"
          >
            <option value="all">All forms</option>
            {formKeys.map(([key, n]) => (
              <option key={key} value={key}>{formNames[key] ?? slugFromFormKey(key)} ({n})</option>
            ))}
          </select>
        )}
      </div>

      {/* Rows */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="text-[var(--fg-faint)] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl p-12 text-center">
          <Inbox size={28} className="mx-auto text-[var(--fg-faint)] mb-3" />
          {rows.length === 0 ? (
            <>
              <p className="text-[var(--fg-muted)] text-sm">No applications yet.</p>
              <p className="text-[var(--fg-muted)] text-xs mt-2 max-w-sm mx-auto">
                They will appear here the moment someone sends the form. Nothing is broken —
                this page is simply waiting.
              </p>
            </>
          ) : (
            <p className="text-[var(--fg-muted)] text-sm">No submissions match the current filter.</p>
          )}
        </div>
      ) : (
        <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl overflow-hidden">
          {filtered.map(row => {
            const name = pickDisplayName(row.data);
            const email = pickEmail(row.data);
            const date = new Date(row.created_at).toLocaleString('en-GB', {
              year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit',
            });
            return (
              <button
                key={row.id}
                onClick={() => setSelected(row)}
                className="w-full px-5 py-4 flex items-center gap-4 border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-1)] transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-[var(--fg)] text-sm font-medium truncate">{name}</p>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {email && <span className="text-[var(--fg-muted)] text-xs font-mono truncate">{email}</span>}
                    <span className="text-[var(--fg-faint)] text-xs font-mono">{date}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Detail panel (slide-over) */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-[var(--scrim)] backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
          <aside className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-[var(--surface-2)] border-l border-[var(--line)] z-50 overflow-y-auto">
            <div className="sticky top-0 bg-[var(--surface-2)] border-b border-[var(--line)] px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[var(--fg)] font-semibold truncate">{pickDisplayName(selected.data)}</p>
                <p className="text-[var(--fg-muted)] text-xs font-mono mt-0.5">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status + actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={selected.status}
                  onChange={e => updateRow(selected.id, { status: e.target.value as SubmissionStatus })}
                  className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--accent-line)]"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {pickEmail(selected.data) && (
                  <a
                    href={`mailto:${pickEmail(selected.data)}`}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-3)] hover:bg-[var(--surface-3)] border border-[var(--line-strong)] rounded-lg text-xs text-[var(--fg)] transition-colors"
                  >
                    <Mail size={12} /> Reply
                  </a>
                )}
                <button
                  onClick={() => remove(selected.id)}
                  className="ml-auto flex items-center gap-2 px-3 py-2 bg-[var(--danger-soft)] hover:bg-[var(--danger-soft)] border border-[var(--danger-line)] rounded-lg text-xs text-[var(--danger)] transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                {Object.entries(selected.data).map(([key, value]) => (
                  <div key={key} className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg p-4">
                    <p className="text-[var(--fg-muted)] text-[10px] tracking-[0.2em] uppercase mb-1.5 font-mono">{key}</p>
                    <p className="text-[var(--fg)] text-sm whitespace-pre-wrap break-words">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[var(--fg-muted)] text-xs tracking-[0.12em] uppercase mb-1.5">Internal Notes</label>
                <textarea
                  value={selected.notes ?? ''}
                  onChange={e => setSelected({ ...selected, notes: e.target.value })}
                  onBlur={e => updateRow(selected.id, { notes: e.target.value })}
                  rows={4}
                  className="w-full bg-[var(--surface-1)] border border-[var(--line)] rounded-lg px-3 py-2 text-[var(--fg)] text-sm focus:outline-none focus:border-[var(--accent-line)] resize-y"
                  placeholder="Add private notes about this applicant…"
                />
              </div>
            </div>
          </aside>
        </>
      )}

      {/* Toasts */}
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
