import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { AuditLogRow } from '../lib/database.types';
import { X, Clock, RotateCcw, Loader2, Check, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  tableName: string;
  rowId: string;
  open: boolean;
  onClose: () => void;
  onRestored?: () => void;
}

// Fields stripped before writing old_data back — controlled by the DB or
// by the auto-updated_at trigger, never by user input.
const READONLY_FIELDS = new Set(['id', 'created_at', 'updated_at']);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function diffKeys(
  oldData: Record<string, unknown>,
  newData: Record<string, unknown> | null,
): string[] {
  if (!newData) return Object.keys(oldData);
  const keys = new Set<string>([...Object.keys(oldData), ...Object.keys(newData)]);
  const changed: string[] = [];
  keys.forEach(k => {
    if (READONLY_FIELDS.has(k)) return;
    if (JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])) changed.push(k);
  });
  return changed;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v.length > 200 ? v.slice(0, 200) + '…' : v;
  if (Array.isArray(v) || typeof v === 'object') {
    const s = JSON.stringify(v);
    return s.length > 200 ? s.slice(0, 200) + '…' : s;
  }
  return String(v);
}

export default function AdminHistory({ tableName, rowId, open, onClose, onRestored }: Props) {
  const [rows, setRows]         = useState<AuditLogRow[]>([]);
  const [loading, setLoading]   = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [toast, setToast]       = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  useEffect(() => {
    if (!open || !rowId) return;
    let cancelled = false;
    setLoading(true);
    supabase
      .from('audit_log')
      .select('*')
      .eq('table_name', tableName)
      .eq('row_id', rowId)
      .order('changed_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!cancelled) {
          setRows((data ?? []) as AuditLogRow[]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [open, tableName, rowId]);

  function showToast(msg: string, type: 'ok' | 'err') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function restore(entry: AuditLogRow) {
    const changed = diffKeys(entry.old_data, entry.new_data);
    const summary = changed.length
      ? `${changed.length} field${changed.length === 1 ? '' : 's'}: ${changed.slice(0, 3).join(', ')}${changed.length > 3 ? '…' : ''}`
      : 'the previous version';
    if (!confirm(`Restore ${summary}?\n\nThis overwrites the current row with the data from ${formatWhen(entry.changed_at)}.`)) return;

    setRestoring(entry.id);
    // Strip readonly fields before write
    const payload: Record<string, unknown> = {};
    Object.entries(entry.old_data).forEach(([k, v]) => {
      if (!READONLY_FIELDS.has(k)) payload[k] = v;
    });

    const { error } = await supabase.from(tableName).update(payload).eq('id', rowId);
    setRestoring(null);

    if (error) {
      showToast('Restore failed: ' + error.message, 'err');
      return;
    }
    showToast('Restored. Reloading…', 'ok');
    onRestored?.();
    setTimeout(() => onClose(), 800);
  }

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className="fixed inset-y-0 right-0 w-full sm:w-[480px] z-50 bg-[#0d0d0d] border-l border-[#1a1a1a] flex flex-col">

        {/* Header */}
        <header className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <Clock size={16} className="text-[#C42121]" />
            <h2 className="text-white text-sm font-medium tracking-wide">History</h2>
            <span className="text-[#444] text-xs font-mono">{rows.length} {rows.length === 1 ? 'version' : 'versions'}</span>
          </div>
          <button onClick={onClose} className="text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </header>

        {/* Warning banner */}
        <div className="px-5 py-3 bg-yellow-950/30 border-b border-yellow-900/30 flex items-start gap-2.5">
          <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-yellow-200 text-xs leading-relaxed">
            Restoring overwrites the current values. Lineup associations (DJs/Artists) are stored separately and are not affected by event restore.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-5 space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-[#161616] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="text-[#666] text-sm">No previous versions yet.</p>
              <p className="text-[#444] text-xs mt-2">
                Every save from now on creates a recoverable snapshot.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-[#161616]">
              {rows.map(entry => {
                const isOpen  = expanded === entry.id;
                const changed = diffKeys(entry.old_data, entry.new_data);
                return (
                  <li key={entry.id} className="px-5 py-3.5">
                    <button
                      onClick={() => setExpanded(isOpen ? null : entry.id)}
                      className="w-full flex items-start gap-2.5 text-left"
                    >
                      {isOpen
                        ? <ChevronDown size={14} className="text-[#666] mt-1 flex-shrink-0" />
                        : <ChevronRight size={14} className="text-[#666] mt-1 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white text-sm">{formatWhen(entry.changed_at)}</span>
                          <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            entry.operation === 'DELETE'
                              ? 'bg-red-950 text-red-400 border border-red-900/50'
                              : 'bg-[#161616] text-[#888] border border-[#222]'
                          }`}>{entry.operation}</span>
                        </div>
                        <p className="text-[#666] text-xs mt-1 truncate">
                          {changed.length === 0
                            ? 'no field-level changes'
                            : `${changed.length} change${changed.length === 1 ? '' : 's'}: ${changed.join(', ')}`}
                        </p>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="ml-6 mt-3 space-y-3">
                        {/* Diff */}
                        {changed.length > 0 && (
                          <div className="space-y-2">
                            {changed.map(k => (
                              <div key={k} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2.5">
                                <p className="text-[#888] text-[10px] tracking-[0.1em] uppercase font-mono mb-1.5">{k}</p>
                                <div className="space-y-1 text-xs font-mono">
                                  <div className="flex gap-2">
                                    <span className="text-red-500 flex-shrink-0">−</span>
                                    <span className="text-red-300/80 break-all">{formatValue(entry.old_data[k])}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-green-500 flex-shrink-0">+</span>
                                    <span className="text-green-300/80 break-all">
                                      {formatValue(entry.new_data ? entry.new_data[k] : undefined)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Restore button */}
                        <button
                          onClick={() => restore(entry)}
                          disabled={restoring === entry.id}
                          className="flex items-center gap-2 bg-[#C42121] hover:bg-[#a81c1c] disabled:opacity-40 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors"
                        >
                          {restoring === entry.id
                            ? <Loader2 size={12} className="animate-spin" />
                            : <RotateCcw size={12} />}
                          {restoring === entry.id ? 'Restoring…' : 'Restore this version'}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium transition-all ${
          toast.type === 'ok'
            ? 'bg-green-950 border border-green-800 text-green-400'
            : 'bg-red-950 border border-red-800 text-red-400'
        }`}>
          {toast.type === 'ok' ? <Check size={15} /> : <X size={15} />}
          {toast.msg}
        </div>
      )}
    </>
  );
}
