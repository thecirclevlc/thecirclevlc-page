import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { EntityOption } from '../lib/database.types';
import { Search, X, ExternalLink, Loader2, UserCircle2 } from 'lucide-react';

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
  accentColor?: string;
}

// ── Component ─────────────────────────────────────────────────────

export default function EntitySelector({
  table,
  selected,
  onChange,
  createLink,
  label,
  accentColor = '#C42121',
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

  const entityLabel = table === 'djs' ? 'DJ' : 'Artist';

  return (
    <div className="space-y-3">

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-full border pl-1 pr-3 py-1 text-sm"
              style={{ borderColor: `${accentColor}30`, backgroundColor: `${accentColor}10` }}
            >
              {/* Mini avatar */}
              <div className="w-6 h-6 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                {item.photo_url ? (
                  <img
                    src={item.photo_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserCircle2 size={14} className="text-[#444]" />
                  </div>
                )}
              </div>
              <span style={{ color: accentColor === '#C42121' ? '#f87171' : '#6ee7b7' }}>
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="text-[#555] hover:text-white transition-colors ml-0.5"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input + dropdown */}
      <div ref={dropdownRef} className="relative">
        <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2.5 focus-within:border-[#C42121]/40 transition-colors">
          {loading ? (
            <Loader2 size={14} className="text-[#444] animate-spin flex-shrink-0" />
          ) : (
            <Search size={14} className="text-[#444] flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={`Search ${label}…`}
            className="flex-1 bg-transparent text-white text-sm placeholder-[#333] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="text-[#444] hover:text-white transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#111] border border-[#1e1e1e] rounded-lg shadow-2xl overflow-hidden max-h-56 flex flex-col">
            {/* Results list */}
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-[#444] text-sm text-center">
                  {query ? `No ${label} found for "${query}"` : `All ${label} already added`}
                </div>
              ) : (
                filtered.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1a1a] transition-colors text-left"
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] flex-shrink-0">
                      {item.photo_url ? (
                        <img
                          src={item.photo_url}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserCircle2 size={16} className="text-[#444]" />
                        </div>
                      )}
                    </div>
                    <span className="text-white text-sm">{item.name}</span>
                  </button>
                ))
              )}
            </div>

            {/* Create new link */}
            <div className="border-t border-[#1a1a1a] px-3 py-2.5">
              <a
                href={createLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-[#C42121] hover:text-[#ff5555] transition-colors"
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
        <p className="text-[#333] text-xs font-mono">
          {selected.length} {entityLabel}{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
