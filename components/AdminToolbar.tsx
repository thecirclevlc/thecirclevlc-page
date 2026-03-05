import React, { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Paintbrush, LayoutDashboard, LogOut, Zap } from 'lucide-react';
import { useEditMode } from '../contexts/EditModeContext';

/**
 * Floating admin toolbar shown at the bottom of public pages
 * only when an admin user is authenticated.
 */
export default function AdminToolbar() {
  const { user, signOut } = useAuth();
  const { editMode, setEditMode } = useEditMode();

  // Inject / remove edit-mode CSS when toggle changes
  useEffect(() => {
    const id = 'admin-edit-mode-style';
    let el = document.getElementById(id) as HTMLStyleElement | null;

    if (editMode) {
      if (!el) {
        el = document.createElement('style');
        el.id = id;
        document.head.appendChild(el);
      }
      el.textContent = `
        [data-editable] {
          outline: 1px dashed rgba(196,33,33,0.6) !important;
          cursor: pointer !important;
          transition: outline-color 0.2s;
        }
        [data-editable]:hover {
          outline-color: rgba(196,33,33,1) !important;
          background: rgba(196,33,33,0.05) !important;
        }
      `;
    } else {
      el?.remove();
    }

    return () => {
      // Keep style when unmounted in case user navigates away
    };
  }, [editMode]);

  if (!user) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[500] bg-[#050000]/96 border-t border-[#C42121]/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-4">

        {/* Brand mark */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-6 h-6 border border-[#C42121]/50 rounded-full flex items-center justify-center">
            <span className="text-[#C42121] font-bold text-[9px] tracking-widest">TC</span>
          </div>
          <span className="text-[#C42121]/40 text-xs font-mono tracking-widest hidden sm:block">ADMIN</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-[#C42121]/15 flex-shrink-0" />

        {/* Edit Mode Toggle */}
        <button
          onClick={() => setEditMode(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-mono tracking-wider px-3 py-1.5 border transition-all ${
            editMode
              ? 'border-[#C42121]/60 text-[#C42121] bg-[#C42121]/10'
              : 'border-[#C42121]/20 text-[#C42121]/50 hover:border-[#C42121]/40 hover:text-[#C42121]/80'
          }`}
        >
          <Zap size={11} className={editMode ? 'fill-[#C42121]' : ''} />
          EDIT MODE {editMode ? 'ON' : 'OFF'}
        </button>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <a
            href="/admin/visual-editor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-mono tracking-wider px-3 py-1.5 border border-[#C42121]/20 text-[#C42121]/50 hover:border-[#C42121]/40 hover:text-[#C42121]/80 transition-all"
          >
            <Paintbrush size={11} />
            <span className="hidden sm:block">COLORS & TEXT</span>
          </a>

          <a
            href="/admin"
            className="flex items-center gap-1.5 text-xs font-mono tracking-wider px-3 py-1.5 border border-[#C42121]/20 text-[#C42121]/50 hover:border-[#C42121]/40 hover:text-[#C42121]/80 transition-all"
          >
            <LayoutDashboard size={11} />
            <span className="hidden sm:block">ADMIN</span>
          </a>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-1.5 text-xs font-mono tracking-wider px-3 py-1.5 border border-[#C42121]/10 text-[#C42121]/30 hover:border-red-900/40 hover:text-red-400 transition-all"
          >
            <LogOut size={11} />
            <span className="hidden sm:block">EXIT</span>
          </button>
        </div>

      </div>
    </div>
  );
}
