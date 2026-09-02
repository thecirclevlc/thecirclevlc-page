import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Event } from '../lib/database.types';
import { Plus, Pencil, Trash2, Search, Eye, EyeOff, Calendar } from 'lucide-react';

type StatusFilter = 'all' | 'published' | 'draft';

function formatDate(date: string | null) {
  if (!date) return '—';
  return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export default function AdminEvents() {
  const [events, setEvents]         = useState<Event[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState<StatusFilter>('all');
  const [toggling, setToggling]     = useState<string | null>(null);
  const [deleting, setDeleting]     = useState<string | null>(null);

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents() {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setEvents(data);
    setLoading(false);
  }

  async function toggleStatus(ev: Event) {
    setToggling(ev.id);
    const next = ev.status === 'published' ? 'draft' : 'published';
    const { error } = await supabase.from('events').update({ status: next }).eq('id', ev.id);
    if (!error) setEvents(prev => prev.map(e => e.id === ev.id ? { ...e, status: next } : e));
    setToggling(null);
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    setDeleting(id);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) setEvents(prev => prev.filter(e => e.id !== id));
    setDeleting(null);
  }

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    return (
      (e.title.toLowerCase().includes(q) || (e.event_number ?? '').toLowerCase().includes(q)) &&
      (statusFilter === 'all' || e.status === statusFilter)
    );
  });

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[var(--fg)] text-2xl font-bold tracking-tight">Events</h1>
          <p className="text-[var(--fg-faint)] text-sm mt-0.5">{events.length} total</p>
        </div>
        <Link
          to="/admin/events/new"
          className="flex items-center gap-2 bg-[var(--tc-brand)] hover:bg-[var(--accent-hover)] text-[var(--on-accent)] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          <Plus size={15} strokeWidth={2.5} />
          New Event
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--fg-faint)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search events…"
            className="w-full bg-[var(--surface-1)] border border-[var(--line)] rounded-lg pl-9 pr-4 py-2.5 text-[var(--fg)] text-sm placeholder-[var(--fg-faint)] focus:outline-none focus:border-[var(--line-strong)] transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value as StatusFilter)}
          className="bg-[var(--surface-1)] border border-[var(--line)] rounded-lg px-3 py-2.5 text-[var(--fg-muted)] text-sm focus:outline-none focus:border-[var(--line-strong)] appearance-none cursor-pointer"
        >
          <option value="all">All status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface-1)] border border-[var(--line)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-[60px] bg-[var(--surface-1)] rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 px-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 border border-[var(--line)] rounded-full flex items-center justify-center mb-4">
              <Calendar size={20} className="text-[var(--fg-faint)]" />
            </div>
            <p className="text-[var(--fg-faint)] text-sm">
              {search ? 'No events match your search.' : 'No events yet.'}
            </p>
            {!search && (
              <Link to="/admin/events/new" className="text-[var(--tc-brand-ink)] text-sm mt-3 hover:underline">
                Create your first event →
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="text-left text-[var(--fg-faint)] text-xs tracking-[0.1em] uppercase font-medium px-5 py-3">Event</th>
                <th className="text-left text-[var(--fg-faint)] text-xs tracking-[0.1em] uppercase font-medium px-5 py-3 hidden sm:table-cell">Date</th>
                <th className="text-left text-[var(--fg-faint)] text-xs tracking-[0.1em] uppercase font-medium px-5 py-3 hidden md:table-cell">Status</th>
                <th className="px-5 py-3 w-28"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev, i) => (
                <tr
                  key={ev.id}
                  className={`hover:bg-[var(--surface-2)] transition-colors ${i < filtered.length - 1 ? 'border-b border-[var(--line)]' : ''}`}
                >
                  {/* Title + thumbnail */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[var(--surface-3)]">
                        {ev.cover_image_url && (
                          <img src={ev.cover_image_url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[var(--fg)] text-sm font-medium truncate">{ev.title}</p>
                        {ev.event_number && (
                          <p className="text-[var(--fg-faint)] text-xs truncate">{ev.event_number}</p>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-[var(--fg-muted)] text-sm">{formatDate(ev.date)}</span>
                  </td>

                  {/* Status badge */}
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      ev.status === 'published'
                        ? 'bg-[var(--surface-3)] text-[var(--fg-muted)] border border-[var(--line-strong)]'
                        : 'bg-[var(--surface-3)] text-[var(--fg-muted)] border border-[var(--line-strong)]'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ev.status === 'published' ? 'bg-[var(--surface-3)]' : 'bg-[var(--surface-3)]'}`} />
                      {ev.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleStatus(ev)}
                        disabled={toggling === ev.id}
                        title={ev.status === 'published' ? 'Unpublish' : 'Publish'}
                        className="p-1.5 text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors disabled:opacity-40"
                      >
                        {ev.status === 'published' ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <Link
                        to={`/admin/events/${ev.id}`}
                        className="p-1.5 text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors"
                      >
                        <Pencil size={15} />
                      </Link>
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        disabled={deleting === ev.id}
                        className="p-1.5 text-[var(--fg-faint)] hover:text-[var(--danger)] transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
