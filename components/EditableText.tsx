import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { useEditMode } from '../contexts/EditModeContext';

interface EditableTextProps {
  contentKey: string;
  field: string;
  value: string;
  onSave: (newValue: string) => void;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  style?: React.CSSProperties;
  multiline?: boolean;
  children?: React.ReactNode;
  /**
   * Where the new value gets written.
   *
   * Default: merge the field into a `site_settings` row keyed `contentKey` —
   * which is every text on the home page and the section headers.
   *
   * Pages the client builds store their copy inside `pages.blocks`, not in
   * `site_settings`, so they pass their own writer here. Without this the
   * whole live-edit experience simply stopped existing the moment she created
   * a page of her own.
   */
  persist?: (value: string) => Promise<void>;
  /** Overrides the label shown in the popover. */
  label?: string;
}

/**
 * Turns `content_home_join` + `title` into "Home · Join block · Title".
 *
 * The popover printed the raw database key, which means nothing to the person
 * editing and makes the whole thing look like a debug tool.
 */
const AREA_LABELS: Record<string, string> = {
  content_home_manifesto:  'Home · Manifesto',
  content_home_marquee:    'Home · Scrolling banner',
  content_home_join:       'Home · Join block',
  content_home_headings:   'Home · Big headings',
  content_home_events:     'Home · Events section',
  content_home_newsletter: 'Home · Newsletter',
  content_events_hero:     'Past events · Header',
  content_djs_hero:        'DJs · Header',
  content_artists_hero:    'Artists · Header',
  content_cta_events:      'Past events · Bottom call to action',
  content_cta_djs:         'DJs · Bottom call to action',
  content_cta_artists:     'Artists · Bottom call to action',
};

const FIELD_LABELS: Record<string, string> = {
  title: 'Title', subtitle: 'Subtitle', desc1: 'First paragraph',
  desc2: 'Second paragraph', text: 'Text', consent: 'Consent text',
  h1: 'First line', h2: 'Second line', h3: 'Third line',
  p1: 'First paragraph', p2: 'Second paragraph', p3: 'Third paragraph',
  cta: 'Button text', success: 'Thank-you message', button: 'Button text',
};

function humanLabel(contentKey: string, field: string): string {
  const area  = AREA_LABELS[contentKey] ?? contentKey.replace(/^content_/, '').replace(/_/g, ' ');
  return `${area} · ${FIELD_LABELS[field] ?? field}`;
}

const EditableText = forwardRef<HTMLElement, EditableTextProps>(
  ({ contentKey, field, value, onSave, as: Tag = 'span', className, style, multiline = false, children, persist, label }, ref) => {
    const { editMode } = useEditMode();
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(value);
    const [saving, setSaving] = useState(false);
    const triggerRef = useRef<HTMLElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

    // Sync draft when value changes externally
    useEffect(() => { setDraft(value); }, [value]);

    // Focus input when popover opens
    useEffect(() => {
      if (open && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [open]);

    // Close on click outside
    useEffect(() => {
      if (!open) return;
      const handler = (e: MouseEvent) => {
        if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
          setOpen(false);
          setDraft(value);
        }
      };
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }, [open, value]);

    async function handleSave() {
      setSaving(true);
      try {
        if (persist) {
          await persist(draft);
        } else {
          // Read-modify-write so editing one field never blanks its siblings.
          const { data } = await supabase
            .from('site_settings')
            .select('value')
            .eq('id', contentKey)
            .maybeSingle();

          const current = (data?.value as Record<string, unknown>) ?? {};
          const merged = { ...current, [field]: draft };

          await supabase
            .from('site_settings')
            .upsert({ id: contentKey, value: merged }, { onConflict: 'id' });
        }

        onSave(draft);
        setOpen(false);
      } catch (err) {
        console.error('EditableText save failed:', err);
      } finally {
        setSaving(false);
      }
    }

    function handleKeyDown(e: React.KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        setDraft(value);
      }
      if (e.key === 'Enter' && !multiline) {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Enter' && multiline && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    }

    // Compute popover position
    const [pos, setPos] = useState({ top: 0, left: 0 });
    useEffect(() => {
      if (!open) return;
      const el = triggerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.bottom + window.scrollY + 8,
        left: Math.max(8, Math.min(rect.left + window.scrollX, window.innerWidth - 420)),
      });
    }, [open]);

    const mergedRef = (node: HTMLElement | null) => {
      (triggerRef as React.MutableRefObject<HTMLElement | null>).current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
    };

    const editableProps = editMode
      ? {
          'data-editable': true,
          onClick: (e: React.MouseEvent) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen(true);
          },
        }
      : {};

    return (
      <>
        {React.createElement(
          Tag as any,
          { ref: mergedRef, className, style, ...editableProps },
          children ?? value,
        )}

        {open &&
          createPortal(
            <div
              ref={popoverRef}
              style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
              className="w-[400px] bg-[#111] border border-primary/40 rounded-lg shadow-2xl p-4 space-y-3"
            >
              <p className="text-[10px] font-mono text-primary/50 tracking-widest uppercase">
                {label ?? humanLabel(contentKey, field)}
              </p>
              {multiline ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={4}
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded px-3 py-2 text-white text-sm resize-y focus:outline-none focus:border-primary/60"
                />
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/60"
                />
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setOpen(false); setDraft(value); }}
                  className="px-3 py-1.5 text-xs font-mono text-primary/60 border border-primary/20 rounded hover:bg-primary/10 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-mono text-black bg-primary rounded hover:opacity-80 transition-colors disabled:opacity-50"
                >
                  {saving ? 'SAVING...' : 'SAVE'}
                </button>
              </div>
              <p className="text-[9px] font-mono text-[#555]">
                {multiline ? 'Cmd+Enter to save' : 'Enter to save'} · Esc to cancel
              </p>
            </div>,
            document.body,
          )}
      </>
    );
  },
);

EditableText.displayName = 'EditableText';

export default EditableText;
