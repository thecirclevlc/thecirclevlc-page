import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { EntityOption } from '../lib/database.types';
import { Search, X, ExternalLink, Loader2, UserCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

// ── Props ─────────────────────────────────────────────────────────

interface EntitySelectorProps {
  /** Which table to query: 'djs' or 'artists' */
  table: 'djs' | 'artists';
  /** Currently selected items */
  selected: EntityOption[];
  /** Callback when selection changes */
  onChange: (items: EntityOption[]) => void;
  /** Link to create a new entity, opened in a new tab */
  createLink: string;
  /** Display label for the section */
  label: string;
  /** Accent color class for chips — defaults to red */
}

// ── Component ─────────────────────────────────────────────────────

export default function EntitySelector({
  table,
  selected,
  onChange,
  createLink,
  label,
}: EntitySelectorProps) {
  const [allItems, setAllItems]     = useState<EntityOption[]>([]);
  const [query, setQuery]           = useState('');
  const [open, setOpen]             = useState(false);
  const [loading, setLoading]       = useState(false);
  const inputRef                    = useRef<HTMLInputElement>(null);
  const dropdownRef                 = useRef<HTMLDivElement>(null);

  // Load all entities on mount
  useEffect(() => {
    setLoading(true);
    supabase
      .from(table)
      .select('id, name, photo_url')
      .order('name')
      .then(({ data }) => {
        if (data) setAllItems(data as EntityOption[]);
        setLoading(false);
      });
  }, [table]);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Filtered options — exclude already selected
  const selectedIds = new Set(selected.map(s => s.id));
  const filtered = allItems.filter(
    item =>
      !selectedIds.has(item.id) &&
      item.name.toLowerCase().includes(query.toLowerCase()),
  );

  function handleSelect(item: EntityOption) {
    onChange([...selected, item]);
    setQuery('');
    inputRef.current?.focus();
  }

  function handleRemove(id: string) {
    onChange(selected.filter(s => s.id !== id));
  }

  // The order of this array IS the running order: it is written to
  // `sort_order` as the row index on save, and both the panel and the public
  // page read it back ordered. Everything was already in place except a way to
  // change it — until now the only way to move someone up the bill was to
  // remove everyone after them and add them again.
  function handleMove(idx: number, dir: -1 | 1) {
    const next = selected.slice();
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  const entityLabel = table === 'djs' ? 'DJ' : 'Artist';

  return (
    <div className="space-y-3">

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((item, idx) => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-full border pl-1 pr-2 py-1 text-sm"
              style={{ borderColor: 'var(--accent-line)', backgroundColor: 'var(--accent-soft)' }}
            >
              {/* Mini avatar */}
              <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--surface-3)] flex-shrink-0">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle2 size={14} className="text-[var(--fg-faint)]" />
                  </div>
                )}
              </div>
              <span className="text-[var(--fg)]">{item.name}</span>
              <span className="flex items-center ml-0.5">
                <button
                  type="button"
                  onClick={() => handleMove(idx, -1)}
                  disabled={idx === 0}
                  aria-label={`Move ${item.name} earlier`}
                  title="Move earlier"
                  className="text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-25 disabled:hover:text-[var(--fg-muted)] transition-colors"
                >
                  <ChevronLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(idx, 1)}
                  disabled={idx === selected.length - 1}
                  aria-label={`Move ${item.name} later`}
                  title="Move later"
                  className="text-[var(--fg-muted)] hover:text-[var(--fg)] disabled:opacity-25 disabled:hover:text-[var(--fg-muted)] transition-colors"
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  aria-label={`Remove ${item.name}`}
                  title="Remove"
                  className="text-[var(--fg-muted)] hover:text-[var(--danger)] transition-colors ml-1"
                >
                  <X size={11} />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div ref={dropdownRef} className="relative">
        <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--line)] rounded-lg px-3 py-2.5 focus-within:border-[var(--accent-line)] transition-colors">
          {loading ? (
            <Loader2 size={14} className="text-[var(--fg-faint)] animate-spin flex-shrink-0" />
          ) : (
            <Search size={14} className="text-[var(--fg-faint)] flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={`Search ${label}…`}
            className="flex-1 bg-transparent text-[var(--fg)] text-sm placeholder-[var(--fg-faint)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="text-[var(--fg-faint)] hover:text-[var(--fg)] transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--surface-1)] border border-[var(--line)] rounded-lg shadow-2xl overflow-hidden max-h-56 flex flex-col">
            {/* Results list */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-[var(--fg-faint)] text-sm text-center">
                  {query ? `No ${label} found for "${query}"` : `All ${label} already added`}
                </div>
              ) : (
                filtered.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface-3)] transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--surface-3)] border border-[var(--line-strong)] flex-shrink-0">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserCircle2 size={16} className="text-[var(--fg-faint)]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[var(--fg)] text-sm">{item.name}</span>
                  </button>
                ))
              )}
            </div>

            {/* Create new link */}
            <div className="border-t border-[var(--line)] px-3 py-2.5">
              <a
                href={createLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[var(--tc-brand-ink)] hover:text-[var(--danger)] transition-colors"
              >
                <ExternalLink size={12} />
                Create new {entityLabel} →
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Count hint */}
      {selected.length > 0 && (
        <p className="text-[var(--fg-faint)] text-xs font-mono">
          {selected.length} {entityLabel}{selected.length !== 1 ? 's' : ''} selected
          {selected.length > 1 && ' · arrows set the running order shown on the event page'}
        </p>
      )}
    </div>
  );
}
