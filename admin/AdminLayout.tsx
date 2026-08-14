import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard, Calendar, Music2, Users, Search, History, Tags, Image,
  LogOut, Menu, X, ExternalLink, Paintbrush, Link2, FileText, FormInput, Inbox, Files,
  PanelBottom, Share2, HelpCircle, Home, BellRing,
} from 'lucide-react';

/**
 * Grouped, and named for what each screen contains.
 *
 * There are more entries than before, not fewer, and that is the point: the
 * client asked for Instagram in the footer while it sat in the third tab of a
 * screen called "Navigation". Tabs are addressable by URL, so each one gets to
 * be its own destination instead of hiding behind a sibling.
 */
const NAV_GROUPS: { title: string; items: { label: string; to: string; icon: React.ElementType; end?: boolean }[] }[] = [
  {
    title: 'Content',
    items: [
      { label: 'Dashboard',    to: '/admin',          icon: LayoutDashboard, end: true },
      { label: 'How it works', to: '/admin/help',     icon: HelpCircle },
      { label: 'Events',       to: '/admin/events',   icon: Calendar },
      { label: 'DJs',          to: '/admin/djs',      icon: Music2 },
      { label: 'Artists',      to: '/admin/artists',  icon: Users },
      { label: 'Home page',    to: '/admin/home',     icon: Home },
      { label: 'Pages',        to: '/admin/pages',    icon: Files },
    ],
  },
  {
    title: 'People writing in',
    items: [
      { label: 'Submissions',  to: '/admin/submissions',  icon: Inbox },
      { label: 'Forms',        to: '/admin/form-builder', icon: FormInput },
      { label: 'Email alerts', to: '/admin/notifications', icon: BellRing },
    ],
  },
  {
    title: 'Look & navigation',
    items: [
      { label: 'Appearance',     to: '/admin/appearance',               icon: Paintbrush },
      { label: 'Menu',           to: '/admin/navigation',               icon: Link2 },
      { label: 'Footer',         to: '/admin/navigation?tab=footer',    icon: PanelBottom },
      { label: 'Social links',   to: '/admin/navigation?tab=social',    icon: Share2 },
      { label: 'Page backgrounds', to: '/admin/settings',               icon: Image },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Google & sharing',  to: '/admin/settings?tab=seo',        icon: Search },
      { label: 'Artist categories', to: '/admin/settings?tab=categories', icon: Tags },
      { label: 'Legal pages',       to: '/admin/legal',                   icon: FileText },
      { label: 'Change history',    to: '/admin/history',                 icon: History },
    ],
  },
];

/**
 * The public site scales its text from the root font size, so the admin would
 * scale with it. Pin it back to 1 here: her panel should not shrink because
 * she made the website's headings smaller.
 */
function useUnscaledAdmin() {
  useEffect(() => {
    const root = document.documentElement.style;
    const previous = root.getPropertyValue('--type-scale');
    root.setProperty('--type-scale', '1');
    return () => {
      if (previous) root.setProperty('--type-scale', previous);
      else root.removeProperty('--type-scale');
    };
  }, []);
}

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const location    = useLocation();
  const { signOut } = useAuth();
  const navigate    = useNavigate();

  // Unread applications, on the menu entry that leads to them.
  //
  // Nothing tells her an application has arrived: the count existed on the
  // dashboard, but only if she went looking, and the form has been collecting
  // answers she never saw. This is the version that works with no email
  // provider, no key and nothing to configure — it is true the moment she
  // logs in. An actual email still needs a sending service.
  const [unread, setUnread] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const read = () => {
      supabase
        .from('form_submissions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'new')
        .then(({ count }) => { if (!cancelled) setUnread(count ?? 0); }, () => {});
    };
    read();
    // Re-read on navigation so the badge clears once she works through them.
    return () => { cancelled = true; };
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] border-r border-[#1a1a1a]">

      {/* Brand */}
      <div className="px-6 py-5 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-[#C42121] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-[#C42121] font-bold text-xs tracking-widest">TC</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold tracking-[0.15em] uppercase truncate">The Circle</p>
            <p className="text-[#3a3a3a] text-xs tracking-widest uppercase">CMS</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_GROUPS.map(group => (
          <div key={group.title} className="mb-5 last:mb-0">
            <p className="px-3 mb-1.5 text-[10px] tracking-[0.18em] uppercase text-[#3a3a3a]">
              {group.title}
            </p>
            {group.items.map(item => {
              const [path, query] = item.to.split('?');
              const wantedTab = new URLSearchParams(query ?? '').get('tab');
              const active = item.end
                ? location.pathname === path
                : location.pathname.startsWith(path)
                  && (new URLSearchParams(location.search).get('tab') ?? null) === wantedTab;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onNav}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    active
                      ? 'bg-[#C42121]/10 text-[#C42121] border border-[#C42121]/15 font-medium'
                      : 'text-[#666] hover:text-[#ccc] hover:bg-[#161616] border border-transparent'
                  }`}
                >
                  <item.icon size={15} strokeWidth={1.8} />
                  <span className="tracking-wide">{item.label}</span>
                  {item.to === '/admin/submissions' && unread > 0 && (
                    <span
                      title={`${unread} application${unread === 1 ? '' : 's'} you have not opened yet`}
                      className="ml-auto min-w-[20px] px-1.5 py-0.5 rounded-full bg-[#C42121] text-white
                                 text-[10px] font-bold leading-none text-center"
                    >
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[#1a1a1a] space-y-0.5">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#444] hover:text-[#888] hover:bg-[#161616] transition-all border border-transparent"
        >
          <ExternalLink size={15} strokeWidth={1.8} />
          <span className="tracking-wide">View Site</span>
        </a>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#444] hover:text-red-400 hover:bg-red-950/20 transition-all border border-transparent"
        >
          <LogOut size={15} strokeWidth={1.8} />
          <span className="tracking-wide">Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useUnscaledAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white flex"
      style={{ fontFamily: 'Poppins, sans-serif' }}
    >
      {/* Desktop sidebar — fixed */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 fixed inset-y-0 left-0 z-30 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar — slide in */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 w-56 z-40 flex flex-col transform transition-transform duration-300 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent onNav={() => setMobileOpen(false)} />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">

        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3.5 border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 border border-[#C42121] rounded-full flex items-center justify-center">
              <span className="text-[#C42121] font-bold text-xs">TC</span>
            </div>
            <span className="text-white text-sm font-bold tracking-[0.15em] uppercase">The Circle</span>
          </div>
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="text-[#666] hover:text-white transition-colors p-1"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>

        {/* Page */}
        <main className="flex-1 p-5 sm:p-7 lg:p-8 max-w-5xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
