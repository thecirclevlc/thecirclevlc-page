import React, { useEffect, useState } from 'react';
import {
  Loader2, Save, CheckCircle, AlertCircle, Send, ExternalLink, KeyRound, Trash2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Email notifications, set up by her, without a developer.
 *
 * ── Where the key lives, and why not in site_settings ──────────────
 * `site_settings` carries the policy `Public read site_settings` with a
 * qualifier of `true`: every row is readable by any anonymous visitor. That is
 * correct for titles and colours and fatal for an API key — pasting one there
 * would publish it on the internet.
 *
 * So the key sits in `integration_settings`, which has no anon policy at all,
 * and it is written through `save_integration()`. It is never read back: this
 * screen only ever learns whether a key exists. There is no code path that
 * sends it to a browser.
 *
 * The send happens inside Postgres, on a trigger over `form_submissions`, so
 * nothing has to be added to the hosting environment and she can change
 * provider, key or recipient whenever she likes.
 */

const KEY = 'email_notifications';
const INPUT = 'w-full bg-[#0d0d0d] border border-[#1e1e1e] rounded-lg px-3 py-2 text-white text-sm placeholder-[#333] focus:outline-none focus:border-[#059669]/40 transition-colors disabled:opacity-35 disabled:cursor-not-allowed';
const LABEL = 'block text-white text-xs font-medium tracking-wide mb-1.5';
const HINT  = 'text-[#444] text-xs mt-1.5 font-mono leading-relaxed';

interface Config {
  provider: 'resend';
  enabled:  boolean;
  to:       string;
  from:     string;
}

const EMPTY: Config = { provider: 'resend', enabled: false, to: '', from: '' };

type TestState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent' }
  | { kind: 'failed'; message: string };

export default function AdminNotifications() {
  const [config, setConfig]   = useState<Config>(EMPTY);
  const [secretSet, setSecret] = useState(false);
  const [newKey, setNewKey]   = useState('');
  const [replacing, setReplacing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);
  const [test, setTest]       = useState<TestState>({ kind: 'idle' });
  const [toast, setToast]     = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    supabase.rpc('get_integration', { p_id: KEY }).then(({ data, error }) => {
      if (!error && data) {
        setConfig({ ...EMPTY, ...((data as any).config ?? {}) });
        setSecret(Boolean((data as any).secret_set));
      }
      setLoading(false);
    }, () => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const update = (patch: Partial<Config>) => {
    setConfig(prev => ({ ...prev, ...patch }));
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc('save_integration', {
        p_id: KEY,
        p_config: config,
        // Empty means "keep the key you already have", so she can change the
        // recipient without retyping a key she cannot see.
        p_secret: newKey.trim() || null,
      });
      if (error) throw error;
      setSecret(Boolean((data as any)?.secret_set));
      setNewKey(''); setReplacing(false);
      setDirty(false);
      setToast({ text: 'Saved', type: 'success' });
    } catch (err: any) {
      setToast({ text: err.message ?? 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const forgetKey = async () => {
    if (!confirm('Forget the saved API key?')) return;
    const { data, error } = await supabase.rpc('clear_integration_secret', { p_id: KEY });
    if (error) return setToast({ text: error.message, type: 'error' });
    setSecret(Boolean((data as any)?.secret_set));
    setToast({ text: 'Key forgotten', type: 'success' });
  };

  /**
   * The button that makes this safe to hand over.
   *
   * The provider replies asynchronously, so we poll for the answer and show
   * whatever it actually said. "The domain is not verified" is something she
   * can act on; a generic "failed" would send her to her developer.
   */
  const sendTest = async () => {
    setTest({ kind: 'sending' });
    try {
      const { data: reqId, error } = await supabase.rpc('test_notification');
      if (error) throw error;

      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise(r => setTimeout(r, 700));
        const { data: res } = await supabase.rpc('notification_result', { p_id: reqId });
        const r = res as any;
        if (!r || r.state === 'pending') continue;
        if (r.state === 'sent') return setTest({ kind: 'sent' });
        return setTest({
          kind: 'failed',
          message: r.timed_out ? 'The provider did not answer in time.' : (r.message || `Error ${r.status}`),
        });
      }
      setTest({ kind: 'failed', message: 'No answer yet. Try again in a moment.' });
    } catch (err: any) {
      setTest({ kind: 'failed', message: err.message ?? 'Test failed' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="text-[#444] animate-spin" />
      </div>
    );
  }

  const canTest = secretSet || newKey.trim().length > 0;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-white text-lg font-semibold">Email notifications</h1>
        <p className="text-[#555] text-sm mt-1">
          Get an email the moment somebody applies, so you do not have to keep
          checking the panel.
        </p>
      </div>

      <section className="bg-[#111] border border-[#1a1a1a] rounded-xl p-6 space-y-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={e => update({ enabled: e.target.checked })}
            className="w-4 h-4 mt-0.5 accent-[#059669]"
          />
          <span>
            <span className="block text-white text-sm">Send me an email for every application</span>
            <span className="block text-[#555] text-xs mt-0.5">
              Applications are always saved in the panel, whether this is on or off.
            </span>
          </span>
        </label>

        <div>
          <label className={LABEL}>Send notifications to</label>
          <input
            type="email"
            className={INPUT}
            value={config.to}
            onChange={e => update({ to: e.target.value })}
            placeholder="you@yourdomain.com"
          />
          <p className={HINT}>Your own address. This is where the applications land.</p>
        </div>

        <div>
          <label className={LABEL}>Resend API key</label>
          {secretSet && !replacing ? (
            <div className="flex items-center gap-2 min-h-[42px] px-3 rounded-lg border border-[#1e1e1e] bg-[#0d0d0d]">
              <KeyRound size={14} className="text-emerald-400 flex-shrink-0" />
              <span className="text-[#888] text-sm">A key is saved</span>
              <button
                onClick={() => setReplacing(true)}
                className="ml-auto text-[#555] hover:text-white text-xs uppercase tracking-wider transition-colors"
              >
                Replace
              </button>
              <button
                onClick={forgetKey}
                aria-label="Forget the key"
                className="text-[#555] hover:text-red-400 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ) : (
            <>
              <input
                type="password"
                autoComplete="off"
                className={INPUT}
                value={newKey}
                onChange={e => { setNewKey(e.target.value); setDirty(true); }}
                placeholder="re_..."
              />
              {secretSet && (
                <button
                  onClick={() => { setNewKey(''); setReplacing(false); }}
                  className="text-[#555] hover:text-white text-xs mt-1.5 transition-colors"
                >
                  Keep the key I already had
                </button>
              )}
            </>
          )}
          <p className={HINT}>
            Stored privately — it is never shown again and never sent to your
            browser. Get one free at{' '}
            <a
              href="https://resend.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#059669] hover:underline inline-flex items-center gap-1"
            >
              resend.com <ExternalLink size={10} />
            </a>
          </p>
        </div>

        <div>
          <label className={LABEL}>Send from <span className="text-[#444] normal-case">(optional)</span></label>
          <input
            type="text"
            className={INPUT}
            value={config.from}
            onChange={e => update({ from: e.target.value })}
            placeholder="The Circle &lt;hello@thecirclevlc.com&gt;"
          />
          <p className={HINT}>
            Leave empty to use Resend's shared sender. To use your own address you
            must first verify thecirclevlc.com in Resend.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-[#1a1a1a]">
          <button
            onClick={save}
            disabled={saving || !dirty}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>

          <button
            onClick={sendTest}
            disabled={test.kind === 'sending' || !canTest || dirty}
            title={dirty ? 'Save first, then test' : undefined}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] hover:bg-[#222] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
          >
            {test.kind === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {test.kind === 'sending' ? 'Sending…' : 'Send test'}
          </button>
        </div>

        {test.kind === 'sent' && (
          <p className="flex items-center gap-2 text-emerald-300 text-sm">
            <CheckCircle size={14} /> Sent. Check {config.to || 'your inbox'}.
          </p>
        )}
        {test.kind === 'failed' && (
          <p className="flex items-start gap-2 text-amber-300/90 text-xs leading-relaxed bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2.5">
            <AlertCircle size={14} className="flex-shrink-0 mt-px" />
            <span>{test.message}</span>
          </p>
        )}
      </section>

      <p className="text-[#444] text-xs leading-relaxed">
        Nothing here can lose you an application. The form saves to the panel
        first and notifies afterwards, so if the provider is down or the key is
        wrong, the application is still waiting for you under Submissions.
      </p>

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 rounded-lg text-sm shadow-2xl ${
          toast.type === 'success'
            ? 'bg-[#064e3b] text-emerald-100 border border-emerald-500/30'
            : 'bg-[#4c0519] text-red-100 border border-red-500/30'
        }`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
