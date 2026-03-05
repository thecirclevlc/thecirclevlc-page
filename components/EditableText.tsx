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
}

const EditableText = forwardRef<HTMLElement, EditableTextProps>(
  ({ contentKey, field, value, onSave, as: Tag = 'span', className, style, multiline = false, children }, ref) => {
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
        // Fetch current JSON for key
        const { data } = await supabase
          .from('site_settings')
          .select('value')
          .eq('id', contentKey)
          .single();

        const current = (data?.value as Record<string, unknown>) ?? {};
        const merged = { ...current, [field]: draft };

        await supabase
          .from('site_settings')
          .upsert({ id: contentKey, value: merged }, { onConflict: 'id' });

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
              className="w-[400px] bg-[#111] border border-[#C42121]/40 rounded-lg shadow-2xl p-4 space-y-3"
            >
              <p className="text-[10px] font-mono text-[#C42121]/50 tracking-widest uppercase">
                {contentKey} &rarr; {field}
              </p>
              {multiline ? (
                <textarea
                  ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={4}
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded px-3 py-2 text-white text-sm resize-y focus:outline-none focus:border-[#C42121]/60"
                />
              ) : (
                <input
                  ref={inputRef as React.RefObject<HTMLInputElement>}
                  type="text"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full bg-[#0a0a0a] border border-[#1e1e1e] rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-[#C42121]/60"
                />
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setOpen(false); setDraft(value); }}
                  className="px-3 py-1.5 text-xs font-mono text-[#C42121]/60 border border-[#C42121]/20 rounded hover:bg-[#C42121]/10 transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs font-mono text-black bg-[#C42121] rounded hover:bg-[#ff3333] transition-colors disabled:opacity-50"
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
