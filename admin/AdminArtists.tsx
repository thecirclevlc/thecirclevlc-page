import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { Artist } from '../lib/database.types';
import { Plus, Pencil, Trash2, Search, Users } from 'lucide-react';

export default function AdminArtists() {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [deleting, setDel]    = useState<string | null>(null);

  useEffect(() => { fetchArtists(); }, []);

  async function fetchArtists() {
    setLoading(true);
    const { data } = await supabase.from('artists').select('*').order('name');
    if (data) setArtists(data);
    setLoading(false);
  }

  async function deleteArtist(id: string) {
    if (!confirm('Delete this artist? This cannot be undone.')) return;
    setDel(id);
    const { error } = await supabase.from('artists').delete().eq('id', id);
    if (!error) setArtists(prev => prev.filter(a => a.id !== id));
    setDel(null);
  }

  const filtered = artists.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Artists</h1>
          <p className="text-[#444] text-sm mt-0.5">{artists.length} total</p>
        </div>
        <Link
          to="/admin/artists/new"
          className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
        >
          <Plus size={15} strokeWidth={2.5} />
          New Artist
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#444]" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search artists…"
          className="w-full bg-[#111] border border-[#1a1a1a] rounded-lg pl-9 pr-4 py-2.5 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#2a2a2a] transition-colors"
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#111] border border-[#1a1a1a] rounded-xl py-20 flex flex-col items-center text-center">
          <div className="w-12 h-12 border border-[#1e1e1e] rounded-full flex items-center justify-center mb-4">
            <Users size={20} className="text-[#333]" />
          </div>
          <p className="text-[#444] text-sm">
            {search ? 'No artists match your search.' : 'No artists yet.'}
          </p>
          {!search && (
            <Link to="/admin/artists/new" className="text-[#059669] text-sm mt-3 hover:underline">
              Add your first artist →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(artist => (
            <div key={artist.id}
              className="bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] rounded-xl p-4 flex items-center gap-3 group transition-colors">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-[#1a1a1a] flex-shrink-0 border border-[#222]">
                {artist.photo_url
                  ? <img src={artist.photo_url} alt={artist.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[#333] text-xs font-bold">
                      {artist.name.slice(0, 2).toUpperCase()}
                    </div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{artist.name}</p>
                {artist.genres?.length > 0 && (
                  <p className="text-[#444] text-xs truncate mt-0.5">{artist.genres.slice(0, 3).join(' · ')}</p>
                )}
                {artist.featured && (
                  <span className="inline-block mt-1 text-xs text-[#059669] bg-[#059669]/10 border border-[#059669]/20 px-2 py-0.5 rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link to={`/admin/artists/${artist.id}`} className="p-1.5 text-[#444] hover:text-white transition-colors">
                  <Pencil size={14} />
                </Link>
                <button onClick={() => deleteArtist(artist.id)} disabled={deleting === artist.id}
                  className="p-1.5 text-[#444] hover:text-red-500 transition-colors disabled:opacity-40">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
