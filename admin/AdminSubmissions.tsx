import React, { useEffect, useState, useMemo } from 'react';
import {
  Loader2, Search, Inbox, CheckCircle, AlertCircle, Trash2,
  Download, X, Mail,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { FormSubmissionRow, SubmissionStatus } from '../lib/database.types';

interface ToastMsg { text: string; type: 'success' | 'error' }

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  new:      'bg-amber-500/15  text-amber-400  border-amber-500/30',
  reviewed: 'bg-blue-500/15   text-blue-400   border-blue-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  rejected: 'bg-red-500/15    text-red-400    border-red-500/30',
};

const STATUSES: SubmissionStatus[] = ['new', 'reviewed', 'accepted', 'rejected'];

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded border ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function pickDisplayName(data: Record<string, string>): string {
  return data.fullName || data.full_name || data.name || Object.values(data)[0] || '—';
}

function pickEmail(data: Record<string, string>): string {
  return data.email || data.e_mail || data.email_address || '';
}

function exportCSV(rows: FormSubmissionRow[]) {
  if (rows.length === 0) return;
  // Collect all unique field names
  const fieldNames = new Set<string>();
  rows.forEach(r => Object.keys(r.data).forEach(k => fieldNames.add(k)));
  const headers = ['id', 'created_at', 'status', 'notes', ...Array.from(fieldNames)];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [
    headers.map(escape).join(','),
    ...rows.map(r => headers.map(h => {
      if (h === 'id' || h === 'created_at' || h === 'status') return escape(String((r as any)[h] ?? ''));
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
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<FormSubmissionRow | null>(null);
  const [toasts, setToasts] = useState<(ToastMsg & { id: number })[]>([]);

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

  const counts = useMemo(() => {
    const c: Record<SubmissionStatus, number> = { new: 0, reviewed: 0, accepted: 0, rejected: 0 };
    rows.forEach(r => { c[r.status]++; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (q) {
        const name = pickDisplayName(r.data).toLowerCase();
        const email = pickEmail(r.data).toLowerCase();
        if (!name.includes(q) && !email.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter, search]);

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
          <h1 className="text-2xl font-bold text-white tracking-tight">Form Submissions</h1>
          <p className="text-[#555] text-sm mt-1">
            Applications received from the public "Join The Circle" form.
          </p>
        </div>
        <button
          onClick={() => exportCSV(filtered)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors disabled:opacity-40"
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
            className={`bg-[#111] border rounded-xl p-4 text-left transition-all ${
              filter === s ? 'border-[#2a2a2a]' : 'border-[#1a1a1a] hover:border-[#222]'
            }`}
          >
            <p className="text-3xl font-bold text-white tabular-nums">{counts[s]}</p>
            <p className="text-[#666] text-xs tracking-widest uppercase mt-1">{s}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-[#555]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="bg-transparent text-white text-sm focus:outline-none flex-1 placeholder-[#444]"
          />
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value as 'all' | SubmissionStatus)}
          className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#059669]/40"
        >
          <option value="all">All statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Rows */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="text-[#444] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-12 text-center">
          <Inbox size={28} className="mx-auto text-[#333] mb-3" />
          <p className="text-[#555] text-sm">No submissions match the current filter.</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
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
                className="w-full px-5 py-4 flex items-center gap-4 border-b border-[#1a1a1a] last:border-0 hover:bg-[#161616] transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <p className="text-white text-sm font-medium truncate">{name}</p>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {email && <span className="text-[#666] text-xs font-mono truncate">{email}</span>}
                    <span className="text-[#444] text-xs font-mono">{date}</span>
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40" onClick={() => setSelected(null)} />
          <aside className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-[#0d0d0d] border-l border-[#1a1a1a] z-50 overflow-y-auto">
            <div className="sticky top-0 bg-[#0d0d0d] border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-white font-semibold truncate">{pickDisplayName(selected.data)}</p>
                <p className="text-[#666] text-xs font-mono mt-0.5">
                  {new Date(selected.created_at).toLocaleString()}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#666] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status + actions */}
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={selected.status}
                  onChange={e => updateRow(selected.id, { status: e.target.value as SubmissionStatus })}
                  className="bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#059669]/40"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {pickEmail(selected.data) && (
                  <a
                    href={`mailto:${pickEmail(selected.data)}`}
                    className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg text-xs text-[#ccc] transition-colors"
                  >
                    <Mail size={12} /> Reply
                  </a>
                )}
                <button
                  onClick={() => remove(selected.id)}
                  className="ml-auto flex items-center gap-2 px-3 py-2 bg-red-950/30 hover:bg-red-950/50 border border-red-500/20 rounded-lg text-xs text-red-400 transition-colors"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-3">
                {Object.entries(selected.data).map(([key, value]) => (
                  <div key={key} className="bg-[#111] border border-[#1a1a1a] rounded-lg p-4">
                    <p className="text-[#555] text-[10px] tracking-[0.2em] uppercase mb-1.5 font-mono">{key}</p>
                    <p className="text-white text-sm whitespace-pre-wrap break-words">{value || '—'}</p>
                  </div>
                ))}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[#555] text-xs tracking-[0.12em] uppercase mb-1.5">Internal Notes</label>
                <textarea
                  value={selected.notes ?? ''}
                  onChange={e => setSelected({ ...selected, notes: e.target.value })}
                  onBlur={e => updateRow(selected.id, { notes: e.target.value })}
                  rows={4}
                  className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#059669]/40 resize-y"
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
