import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { signIn, user }        = useAuth();
  const navigate                = useNavigate();

  // Already logged in → redirect to dashboard
  useEffect(() => {
    if (user) navigate('/admin', { replace: true });
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#0a0a0a', fontFamily: 'Poppins, sans-serif' }}
    >
      <div className="w-full max-w-sm">

        {/* Brand mark */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 border border-[#C42121] rounded-full flex items-center justify-center mb-5">
            <span className="text-[#C42121] font-bold text-lg tracking-widest">TC</span>
          </div>
          <h1 className="text-white text-xl font-bold tracking-[0.2em] uppercase">The Circle</h1>
          <p className="text-[#444] text-xs tracking-[0.3em] uppercase mt-1">Admin Panel</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {error && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-lg px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-[#555] text-xs tracking-[0.15em] uppercase mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-3 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#C42121]/60 transition-colors"
              placeholder="admin@thecircle.com"
            />
          </div>

          <div>
            <label className="block text-[#555] text-xs tracking-[0.15em] uppercase mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#111] border border-[#1e1e1e] rounded-lg px-4 py-3 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#C42121]/60 transition-colors"
              placeholder="••••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-[#C42121] hover:bg-[#a81c1c] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold tracking-[0.12em] uppercase py-3.5 rounded-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>

        </form>
      </div>
    </div>
  );
}
