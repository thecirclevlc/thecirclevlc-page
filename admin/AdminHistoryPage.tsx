import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, History, Trash2, Pencil, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AuditLogRow } from '../lib/database.types';

/**
 * Everything that has changed on the site, newest first.
 *
 * The audit log has been recording for months and had no screen at all — the
 * per-row drawer exists but only opens from inside an event, DJ or artist, so
 * a deleted row was unreachable. This is the client's safety net now that she
 * can edit pages and blocks.
 */

const TABLE_LABEL: Record<string, string> = {
  events:            'Event',
  djs:               'DJ',
  artists:           'Artist',
  pages:             'Page',
  site_settings:     'Site setting',
  social_links:      'Social link',
  artist_categories: 'Artist category',
  event_djs:         'Event lineup (DJs)',
  event_artists:     'Event lineup (artists)',
};

/** Where to go to see the thing that changed, when there is somewhere to go. */
const EDIT_PATH: Record<string, (id: string) => string> = {
  events:  id => `/admin/events/${id}`,
  djs:     id => `/admin/djs/${id}`,
  artists: id => `/admin/artists/${id}`,
  pages:   id => `/admin/pages/${id}`,
};

/** A human name for the row, dug out of whichever snapshot we have. */
function describe(row: AuditLogRow): string {
  const data = (row.new_data ?? row.old_data ?? {}) as Record<string, unknown>;
  const name = data.title ?? data.name ?? data.id;
  if (row.table_name === 'site_settings') return String(data.id ?? row.row_id);
  return name ? String(name) : row.row_id.slice(0, 8);
}

/** Which fields actually differ — the reason to look at a version at all. */
function changedFields(row: AuditLogRow): string[] {
  if (row.operation === 'DELETE' || !row.new_data) return [];
  const before = row.old_data as Record<string, unknown>;
  const after  = row.new_data as Record<string, unknown>;
  return Object.keys(after)
    .filter(k => k !== 'updated_at' && JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .slice(0, 6);
}

export default function AdminHistoryPage() {
  const navigate = useNavigate();
  const [rows, setRows]       = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [table, setTable]     = useState<string>('all');

  useEffect(() => {
    supabase
      .from('audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setRows((data as AuditLogRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  const tables = Array.from(new Set(rows.map(r => r.table_name))).sort();
  const shown  = table === 'all' ? rows : rows.filter(r => r.table_name === table);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Change history</h1>
        <p className="text-[#555] text-sm mt-1">
          Every edit and deletion, newest first. Open an event, DJ, artist or page and use the clock
          icon there to put an older version back.
        </p>
      </div>

      {tables.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setTable('all')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              table === 'all' ? 'bg-[#1a1a1a] text-white border border-[#2a2a2a]' : 'text-[#555] hover:text-[#888]'
            }`}
          >
            Everything
          </button>
          {tables.map(t => (
            <button
              key={t}
              onClick={() => setTable(t)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                table === t ? 'bg-[#1a1a1a] text-white border border-[#2a2a2a]' : 'text-[#555] hover:text-[#888]'
              }`}
            >
              {TABLE_LABEL[t] ?? t}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="text-[#444] animate-spin" />
        </div>
      ) : shown.length === 0 ? (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-12 text-center">
          <History size={28} className="mx-auto text-[#333] mb-3" />
          <p className="text-[#999] text-sm">No changes recorded yet.</p>
          <p className="text-[#555] text-xs mt-2">Edits you make from now on will appear here.</p>
        </div>
      ) : (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl overflow-hidden">
          {shown.map(row => {
            const fields = changedFields(row);
            const path   = EDIT_PATH[row.table_name]?.(row.row_id);
            const when   = new Date(row.changed_at).toLocaleString('en-GB', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            });
            return (
              <div
                key={row.id}
                className="px-5 py-3.5 flex items-start gap-4 border-b border-[#1a1a1a] last:border-0 hover:bg-[#161616] transition-colors"
              >
                <span className={`mt-0.5 flex-shrink-0 ${row.operation === 'DELETE' ? 'text-red-400/70' : 'text-[#555]'}`}>
                  {row.operation === 'DELETE' ? <Trash2 size={14} /> : <Pencil size={14} />}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    <span className="text-[#666]">{TABLE_LABEL[row.table_name] ?? row.table_name} · </span>
                    {describe(row)}
                  </p>
                  {fields.length > 0 && (
                    <p className="text-[#555] text-xs font-mono mt-0.5 truncate">
                      changed: {fields.join(', ')}
                    </p>
                  )}
                  {row.operation === 'DELETE' && (
                    <p className="text-red-400/60 text-xs mt-0.5">deleted</p>
                  )}
                </div>

                <span className="text-[#444] text-xs font-mono flex-shrink-0 tabular-nums">{when}</span>

                {path && row.operation !== 'DELETE' && (
                  <button
                    onClick={() => navigate(path)}
                    className="text-[#555] hover:text-white transition-colors flex-shrink-0"
                    title="Open"
                  >
                    <ExternalLink size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
