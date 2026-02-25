import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, Music2, Users, Plus, TrendingUp } from 'lucide-react';

interface Stats {
  totalEvents:     number;
  publishedEvents: number;
  totalDJs:        number;
  totalArtists:    number;
}

function StatCard({
  label, value, sub, icon: Icon, color, loading,
}: {
  label: string; value: number; sub: string;
  icon: React.ElementType; color: string; loading: boolean;
}) {
  return (
    <div className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-5 rounded bg-[#1e1e1e]" />
          <div className="h-8 w-12 rounded bg-[#1e1e1e]" />
          <div className="h-3 w-20 rounded bg-[#1e1e1e]" />
        </div>
      ) : (
        <>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
            style={{ backgroundColor: `${color}18` }}
          >
            <Icon size={16} style={{ color }} strokeWidth={1.8} />
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">{value}</p>
          <p className="text-[#666] text-xs tracking-widest uppercase mt-1">{label}</p>
          <p className="text-[#3a3a3a] text-xs mt-0.5">{sub}</p>
        </>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats]   = useState<Stats>({ totalEvents: 0, publishedEvents: 0, totalDJs: 0, totalArtists: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [evTotal, evPub, djTotal, arTotal] = await Promise.all([
          supabase.from('events').select('id',  { count: 'exact', head: true }),
          supabase.from('events').select('id',  { count: 'exact', head: true }).eq('status', 'published'),
          supabase.from('djs').select('id',     { count: 'exact', head: true }),
          supabase.from('artists').select('id', { count: 'exact', head: true }),
        ]);
        setStats({
          totalEvents:     evTotal.count  ?? 0,
          publishedEvents: evPub.count    ?? 0,
          totalDJs:        djTotal.count  ?? 0,
          totalArtists:    arTotal.count  ?? 0,
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const quickActions = [
    { label: '+ New Event',  to: '/admin/events/new',   color: '#C42121' },
    { label: '+ New DJ',     to: '/admin/djs/new',      color: '#7c3aed' },
    { label: '+ New Artist', to: '/admin/artists/new',  color: '#059669' },
  ];

  return (
    <div className="space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-white text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-[#444] text-sm mt-1">Welcome back. Here's an overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Events"     value={stats.totalEvents}     sub={`${stats.publishedEvents} published`} icon={Calendar}    color="#C42121" loading={loading} />
        <StatCard label="Published"        value={stats.publishedEvents} sub="visible to public"                     icon={TrendingUp}   color="#f59e0b" loading={loading} />
        <StatCard label="DJs"              value={stats.totalDJs}        sub="registered"                            icon={Music2}       color="#7c3aed" loading={loading} />
        <StatCard label="Artists"          value={stats.totalArtists}    sub="registered"                            icon={Users}        color="#059669" loading={loading} />
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[#3a3a3a] text-xs tracking-[0.2em] uppercase mb-3">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map(a => (
            <Link
              key={a.to}
              to={a.to}
              className="flex items-center gap-3 bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-xl p-4 transition-all group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${a.color}18` }}
              >
                <Plus size={14} style={{ color: a.color }} />
              </div>
              <span className="text-[#666] group-hover:text-white text-sm transition-colors tracking-wide">
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick nav */}
      <div>
        <p className="text-[#3a3a3a] text-xs tracking-[0.2em] uppercase mb-3">Manage</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'All Events',  to: '/admin/events',  count: stats.totalEvents },
            { label: 'All DJs',     to: '/admin/djs',     count: stats.totalDJs },
            { label: 'All Artists', to: '/admin/artists', count: stats.totalArtists },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center justify-between bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-xl p-4 transition-all group"
            >
              <span className="text-[#666] group-hover:text-white text-sm transition-colors">{item.label}</span>
              {!loading && (
                <span className="text-[#333] text-xs bg-[#1a1a1a] px-2 py-0.5 rounded-full tabular-nums">
                  {item.count}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
