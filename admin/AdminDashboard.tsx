import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MetricCard, { useFirstVisit } from './ui/MetricCard';
import { pickDisplayName, pickEmail } from './AdminSubmissions';
import {
  IconAlert, IconArtists, IconEvent, IconGo, IconInbox, IconLive, IconTalent, IconVoid,
} from './ui/icons';

/**
 * El panel de entrada.
 *
 * Antes eran cinco cifras sin contexto y dos filas de atajos que repetían el
 * menú de la izquierda. Ahora las cifras traen su variación y su serie, y el
 * espacio de abajo lo ocupa trabajo real: lo que viene y lo que está sin
 * contestar.
 *
 * Ninguna cifra está inventada — todas salen de `created_at`, que existe en
 * las cuatro tablas.
 */

const DAY = 86_400_000;

interface Series { delta?: number; trend: number[] }

/**
 * Variación contra el periodo anterior y serie acumulada.
 *
 * `delta` es opcional a propósito: si en los 30 días anteriores no hubo nada,
 * no hay porcentaje que calcular. La costumbre es enseñar "+100 %", que es
 * mentira — un tanto por ciento sobre cero no existe. Cuando no hay con qué
 * comparar, la tarjeta no enseña comparación.
 */
function series(dates: number[], now: number): Series {
  const last  = dates.filter(t => t >  now - 30 * DAY).length;
  const prior = dates.filter(t => t <= now - 30 * DAY && t > now - 60 * DAY).length;

  return {
    delta: prior === 0 ? undefined : Math.round(((last - prior) / prior) * 100),
    // Acumulado en 7 cortes sobre los últimos 6 meses: para un total, la
    // forma que importa es cómo ha crecido, no cuántos entraron cada semana.
    trend: Array.from({ length: 7 }, (_, i) =>
      dates.filter(t => t <= now - (6 - i) * 30 * DAY).length),
  };
}

const ms = (d: string | null) => (d ? new Date(d).getTime() : 0);

interface EventRow {
  id: string; title: string; date: string | null; venue: string | null;
  status: string; lineup: string[] | null; created_at: string | null;
}
interface SubRow {
  id: string; data: Record<string, string>; status: string; created_at: string | null;
}

type Load = 'loading' | 'ready' | 'error';

export default function AdminDashboard() {
  const [state, setState] = useState<Load>('loading');
  const [events, setEvents] = useState<EventRow[]>([]);
  const [djs, setDjs]       = useState<number[]>([]);
  const [artists, setArtists] = useState<number[]>([]);
  const [subs, setSubs]     = useState<SubRow[]>([]);
  const [toast, setToast]   = useState<string | null>(null);
  const [nonce, setNonce]   = useState(0);

  const first = useFirstVisit();

  useEffect(() => {
    let cancelled = false;
    setState('loading');

    // ponytail: se traen las filas enteras en vez de contarlas en el servidor.
    // Con 4 eventos y 33 solicitudes es una query menos y el dato de la
    // sparkline sale gratis. Si esto pasa de ~2.000 filas, hay que volver a
    // count({head:true}) y una vista agregada para las series.
    Promise.all([
      supabase.from('events').select('id,title,date,venue,status,lineup,created_at'),
      supabase.from('djs').select('created_at'),
      supabase.from('artists').select('created_at'),
      supabase.from('form_submissions').select('id,data,status,created_at').order('created_at', { ascending: false }),
    ]).then(([ev, dj, ar, fs]) => {
      if (cancelled) return;
      if (ev.error || dj.error || ar.error || fs.error) { setState('error'); return; }
      setEvents((ev.data ?? []) as EventRow[]);
      setDjs((dj.data ?? []).map(r => ms(r.created_at)));
      setArtists((ar.data ?? []).map(r => ms(r.created_at)));
      setSubs((fs.data ?? []) as SubRow[]);
      setState('ready');
    }, () => { if (!cancelled) setState('error'); });

    return () => { cancelled = true; };
  }, [nonce]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const now = Date.now();
  const published = events.filter(e => e.status === 'published');
  const pending   = subs.filter(s => s.status === 'new');

  const sEvents = series(events.map(e => ms(e.created_at)), now);
  const sPub    = series(published.map(e => ms(e.created_at)), now);
  const sDjs    = series(djs, now);
  const sArt    = series(artists, now);
  const sSubs   = series(subs.map(s => ms(s.created_at)), now);

  const upcoming = events
    .filter(e => e.date && new Date(e.date).getTime() >= now - DAY)
    .sort((a, b) => ms(a.date) - ms(b.date))
    .slice(0, 5);

  const cardState = state === 'ready' ? 'ready' : state === 'error' ? 'error' : 'loading';

  /** Aprobar o descartar sin esperar al servidor; si falla, se devuelve. */
  const decide = async (row: SubRow, next: 'accepted' | 'rejected') => {
    const before = subs;
    setSubs(list => list.map(s => (s.id === row.id ? { ...s, status: next } : s)));
    setToast(next === 'accepted'
      ? `${pickDisplayName(row.data)} — aceptada`
      : `${pickDisplayName(row.data)} — descartada`);

    const { error } = await supabase.from('form_submissions').update({ status: next }).eq('id', row.id);
    if (error) { setSubs(before); setToast('No se pudo guardar. Vuelve a intentarlo.'); }
  };

  return (
    <>
      <div className="tc-page__head">
        <div>
          <h1>Panel</h1>
          <p>Lo que hay, lo que viene y lo que está sin contestar.</p>
        </div>
        <Link className="tc-cta" to="/admin/events/new">Nuevo evento<IconGo size={14} stroke={2.1} /></Link>
      </div>

      {/* Comparación dicha una vez, y no repetida en las cinco tarjetas. */}
      <p className="tc-eyebrow">Últimos 30 días, contra los 30 anteriores</p>

      <div className="tc-metrics">
        <MetricCard index={0} animate={first} state={cardState} label="Eventos"
          value={events.length} icon={IconEvent} tone="events" to="/admin/events"
          delta={sEvents.delta} trend={sEvents.trend} />
        <MetricCard index={1} animate={first} state={cardState} label="Publicados"
          value={published.length} icon={IconLive} tone="live" to="/admin/events"
          delta={sPub.delta} trend={sPub.trend} />
        <MetricCard index={2} animate={first} state={cardState} label="DJs"
          value={djs.length} icon={IconTalent} tone="talent" to="/admin/djs"
          delta={sDjs.delta} trend={sDjs.trend} />
        <MetricCard index={3} animate={first} state={cardState} label="Artistas"
          value={artists.length} icon={IconArtists} tone="talent" to="/admin/artists"
          delta={sArt.delta} trend={sArt.trend} />
        <MetricCard index={4} animate={first} state={cardState} label="Sin revisar"
          value={pending.length} icon={IconInbox} lead
          delta={sSubs.delta}
          cta={{ label: 'Revisar', to: '/admin/submissions' }} />
      </div>

      <div className="tc-grid-8-4">

        {/* ── Próximos eventos ─────────────────────────────────────── */}
        <section className="tc-glass tc-card tc-panel">
          <header className="tc-panel__head">
            <h2>Próximos eventos</h2>
            <Link className="tc-linkbtn" to="/admin/events">Ver todos</Link>
          </header>

          {state === 'loading' && (
            <div className="tc-list">
              {[0, 1, 2].map(i => <div key={i} className="tc-skel" style={{ height: 58 }} />)}
            </div>
          )}

          {state === 'ready' && upcoming.length === 0 && (
            <div className="tc-empty">
              <IconVoid size={34} stroke={1.5} />
              <p>No hay ningún evento con fecha futura.</p>
              <Link className="tc-cta" to="/admin/events/new">Crear el primero<IconGo size={14} stroke={2.1} /></Link>
            </div>
          )}

          {state === 'ready' && upcoming.length > 0 && (
            <ul className="tc-list">
              {upcoming.map(ev => (
                <li key={ev.id}>
                  <Link className="tc-row" to={`/admin/events/${ev.id}`}>
                    <time className="tc-date" dateTime={ev.date ?? undefined}>
                      <b>{ev.date ? new Date(ev.date).toLocaleDateString('es-ES', { day: '2-digit' }) : '··'}</b>
                      <span>{ev.date ? new Date(ev.date).toLocaleDateString('es-ES', { month: 'short' }) : ''}</span>
                    </time>
                    <div className="tc-row__body">
                      <p className="tc-row__title">{ev.title}</p>
                      <p className="tc-row__sub">{ev.venue || 'Sin sala'}</p>
                    </div>
                    <Lineup names={ev.lineup ?? []} />
                    <span className="tc-chip" data-on={ev.status === 'published' || undefined}>
                      {ev.status === 'published' ? 'Publicado' : 'Borrador'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Sin revisar ──────────────────────────────────────────── */}
        <section className="tc-glass tc-card tc-panel">
          <header className="tc-panel__head">
            <h2>Sin revisar</h2>
            <Link className="tc-linkbtn" to="/admin/submissions">Ver todas</Link>
          </header>

          {state === 'loading' && (
            <div className="tc-list">
              {[0, 1, 2].map(i => <div key={i} className="tc-skel" style={{ height: 66 }} />)}
            </div>
          )}

          {state === 'error' && (
            <div className="tc-empty">
              <IconAlert size={30} stroke={1.6} />
              <p>No se pudieron leer las solicitudes.</p>
              <button type="button" className="tc-linkbtn" onClick={() => setNonce(n => n + 1)}>
                Reintentar
              </button>
            </div>
          )}

          {state === 'ready' && pending.length === 0 && (
            <div className="tc-empty">
              <IconVoid size={34} stroke={1.5} />
              <p>Todo contestado. No queda nada pendiente.</p>
            </div>
          )}

          {state === 'ready' && pending.length > 0 && (
            <ul className="tc-list">
              {pending.slice(0, 4).map(row => (
                <li key={row.id} className="tc-sub">
                  <div className="tc-row__body">
                    <p className="tc-row__title">{pickDisplayName(row.data)}</p>
                    <p className="tc-row__sub">{pickEmail(row.data) || 'Sin email'}</p>
                  </div>
                  <div className="tc-sub__acts">
                    <button type="button" className="tc-mini" data-kind="yes"
                      onClick={() => decide(row, 'accepted')}>Aceptar</button>
                    <button type="button" className="tc-mini"
                      onClick={() => decide(row, 'rejected')}>Descartar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {toast && (
        <div className="tc-glass tc-glass--3 tc-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

/** El cartel en avatares apilados. */
function Lineup({ names }: { names: string[] }) {
  if (names.length === 0) return <span className="tc-avatars" />;
  const shown = names.slice(0, 3);
  return (
    <span className="tc-avatars" title={names.join(' · ')}>
      {shown.map((n, i) => (
        // `lineup` guarda NOMBRES, no ids de DJ, así que no hay foto que
        // buscar sin cruzar cadenas — y un cruce por nombre falla con la
        // primera tilde. Iniciales hasta que el cartel apunte a la tabla djs.
        <span key={`${n}-${i}`} className="tc-avatars__i" style={{ '--k': i } as React.CSSProperties}>
          {n.trim().slice(0, 1).toUpperCase() || '·'}
        </span>
      ))}
      {names.length > 3 && <span className="tc-avatars__n">+{names.length - 3}</span>}
    </span>
  );
}
