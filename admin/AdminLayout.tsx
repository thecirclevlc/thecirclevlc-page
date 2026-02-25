import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, Calendar, Music2, Users,
  LogOut, Menu, X, ExternalLink, Settings, Paintbrush,
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard',      to: '/admin',                icon: LayoutDashboard, end: true },
  { label: 'Events',         to: '/admin/events',         icon: Calendar },
  { label: 'DJs',            to: '/admin/djs',            icon: Music2 },
  { label: 'Artists',        to: '/admin/artists',        icon: Users },
  { label: 'Visual Editor',  to: '/admin/visual-editor',  icon: Paintbrush },
  { label: 'Settings',       to: '/admin/settings',       icon: Settings },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const { signOut } = useAuth();
  const navigate    = useNavigate();

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
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNav}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? 'bg-[#C42121]/10 text-[#C42121] border border-[#C42121]/15 font-medium'
                  : 'text-[#666] hover:text-[#ccc] hover:bg-[#161616] border border-transparent'
              }`
            }
          >
            <item.icon size={15} strokeWidth={1.8} />
            <span className="tracking-wide">{item.label}</span>
          </NavLink>
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
