import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconAlert, IconFlat, IconGo, IconTrend, IconVoid, type IconProps } from './icons';

/**
 * La tarjeta de métrica del panel.
 *
 * Sin un solo color escrito aquí: todo sale de admin-ui.css. Lo que este
 * archivo aporta es lo que el CSS no puede — el reflejo que sigue al cursor,
 * el conteo del número y la sparkline dibujada del dato real.
 *
 * Accesibilidad de la tarjeta clicable: la tarjeta entera responde al clic,
 * pero el enlace de verdad es uno solo y está en el título (`.tc-stretch`,
 * que estira su área hasta los bordes). Así hay un único destino en el orden
 * de tabulación en vez de un div con onClick, y el CTA de la variante
 * accionable puede ser un botón real sin quedar anidado dentro de un enlace.
 */

/* ── Puntero → --mx/--my ────────────────────────────────────────────
 * Una escritura por frame. El rect se cachea al entrar en vez de leerse en
 * cada pointermove: leerlo ahí fuerza un reflow síncrono por evento, y con
 * cinco tarjetas eso se nota en el scroll. */
function useGlassPointer<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let rect: DOMRect | null = null;
    let frame = 0;
    let x = 50, y = 0;

    const write = () => {
      frame = 0;
      el.style.setProperty('--mx', `${x}%`);
      el.style.setProperty('--my', `${y}%`);
    };
    const onEnter = () => { rect = el.getBoundingClientRect(); };
    const onMove = (e: PointerEvent) => {
      if (!rect) rect = el.getBoundingClientRect();
      x = ((e.clientX - rect.left) / rect.width) * 100;
      y = ((e.clientY - rect.top) / rect.height) * 100;
      if (!frame) frame = requestAnimationFrame(write);
    };
    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      rect = null;
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
      el.style.removeProperty('will-change');
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return ref;
}

/* ── Conteo del número ──────────────────────────────────────────────
 * 600 ms con la misma curva que --ease (aproximada como easeOutCubic).
 *
 * Escribe en el nodo, no en el estado. Un setState por frame serían ~36
 * renders por tarjeta y 180 en la fila entera, justo durante la entrada
 * escalonada — el momento con menos presupuesto de toda la pantalla.
 *
 * useLayoutEffect y no useEffect: el JSX pinta ya el valor final (para que
 * nadie vea un hueco si el frame se retrasa) y esto lo baja a 0 antes de que
 * el navegador pinte. Con useEffect se vería el número correcto y luego un
 * salto atrás. */
function useCountUp(target: number, run: boolean) {
  const ref = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fmt = (n: number) => n.toLocaleString('es-ES');

    if (!run || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = fmt(target);
      return;
    }
    let frame = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 600);
      el.textContent = fmt(Math.round(target * (1 - (1 - p) ** 3)));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    el.textContent = '0';
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, run]);

  return ref;
}

/**
 * Primera carga de la sesión, y sólo esa.
 *
 * Quien entra veinte veces al dashboard en una tarde no quiere ver el
 * escalonado veinte veces. sessionStorage y no un ref del módulo, porque un
 * refresco de página no debería considerarse "otra vez".
 */
export function useFirstVisit(key = 'tc.dash.seen') {
  const [first] = useState(() => {
    try {
      if (sessionStorage.getItem(key)) return false;
      sessionStorage.setItem(key, '1');
      return true;
    } catch {
      return false;   // modo privado / storage bloqueado: nada de animación
    }
  });
  return first;
}

/* ── Sparkline ──────────────────────────────────────────────────────
 * Del dato real, no decorativa. Hereda el color por currentColor, así que
 * el gradiente sigue al tono de la tarjeta sin repetir el color aquí. */
function Sparkline({ data, w = 78, h = 28 }: { data: number[]; w?: number; h?: number }) {
  const gid = useId();
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 2;                                    // deja sitio al trazo de 2px
  const pts = data.map((v, i): [number, number] => [
    (i / (data.length - 1)) * w,
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);

  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];

  return (
    <svg className="tc-spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="currentColor" stopOpacity=".34" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w} ${h} L0 ${h} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="currentColor" />
    </svg>
  );
}

/* ── Delta contra el periodo anterior ───────────────────────────────── */
function Delta({ pct }: { pct: number }) {
  const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  const Glyph = dir === 'flat' ? IconFlat : IconTrend;
  return (
    <span className="tc-delta" data-dir={dir}>
      <Glyph size={13} stroke={2.1} {...(dir !== 'flat' ? { dir } : {})} />
      {pct > 0 ? '+' : ''}{pct}%
    </span>
  );
}

/* ── Tarjeta ────────────────────────────────────────────────────────── */

/** Cuatro tonos, cada uno con un significado estable. No añadir un quinto. */
export type MetricTone = 'events' | 'talent' | 'inbox' | 'live';

export interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ComponentType<IconProps>;
  tone?: MetricTone;
  /** Variación porcentual contra el periodo anterior. */
  delta?: number;
  /** Contra qué se compara. Sólo lectores de pantalla y `title`. */
  deltaLabel?: string;
  /** Serie del propio dato para la sparkline. */
  trend?: number[];
  state?: 'ready' | 'loading' | 'empty' | 'error';
  /** La tarjeta que pide acción. Una por fila, no más. */
  lead?: boolean;
  /** Destino de la tarjeta entera. */
  to?: string;
  cta?: { label: string; to: string };
  onRetry?: () => void;
  disabled?: boolean;
  /** Posición en la fila — mueve el escalonado de entrada. */
  index?: number;
  /** Animar la entrada y el conteo. Ver useFirstVisit. */
  animate?: boolean;
}

export default function MetricCard({
  label, value, icon: Icon, tone = 'events',
  delta, deltaLabel, trend, state = 'ready',
  lead = false, to, cta, onRetry, disabled = false,
  index = 0, animate = false,
}: MetricCardProps) {
  const ref = useGlassPointer<HTMLElement>();
  const valueRef = useCountUp(value, animate && state === 'ready');
  const interactive = Boolean(to) && !disabled && state === 'ready';

  const className = [
    'tc-glass', 'tc-card', 'tc-metric',
    lead && 'tc-metric--lead',
    animate && 'tc-enter',
  ].filter(Boolean).join(' ');

  return (
    <article
      ref={ref}
      className={className}
      style={{ '--i': index, '--tone': lead ? undefined : `var(--data-${tone})` } as React.CSSProperties}
      data-interactive={interactive || undefined}
      aria-disabled={disabled || undefined}
      aria-busy={state === 'loading' || undefined}
    >
      <div className="tc-metric__head">
        <span className="tc-metric__icon"><Icon size={17} stroke={2} /></span>
        <h3 className="tc-metric__label">
          {to && state === 'ready'
            ? <Link className="tc-stretch" to={to}>{label}</Link>
            : label}
        </h3>
      </div>

      {state === 'loading' && (
        <>
          <div className="tc-skel" style={{ height: 38, width: '54%', marginTop: 'auto' }} />
          <div className="tc-metric__foot">
            <div className="tc-skel" style={{ height: 20, width: 62, borderRadius: 999 }} />
            <div className="tc-skel" style={{ height: 28, width: 78 }} />
          </div>
        </>
      )}

      {state === 'error' && (
        <>
          <p className="tc-metric__note" data-kind="error">
            <IconAlert size={15} stroke={2} />
            No se pudo leer
          </p>
          <div className="tc-metric__foot">
            {onRetry && <button type="button" className="tc-linkbtn" onClick={onRetry}>Reintentar</button>}
          </div>
        </>
      )}

      {state === 'empty' && (
        <>
          <p className="tc-metric__note">
            <IconVoid size={15} stroke={2} />
            Todavía nada aquí
          </p>
          {cta && (
            <div className="tc-metric__foot">
              <Link className="tc-cta" to={cta.to}>{cta.label}<IconGo size={14} stroke={2.1} /></Link>
            </div>
          )}
        </>
      )}

      {state === 'ready' && (
        <>
          <p className="tc-metric__value" ref={valueRef}>{value.toLocaleString('es-ES')}</p>
          <div className="tc-metric__foot">
            {delta !== undefined
              ? <span title={deltaLabel}>
                  <Delta pct={delta} />
                  {deltaLabel && <span className="tc-sr">{` ${deltaLabel}`}</span>}
                </span>
              : <span />}
            {cta
              ? <Link className="tc-cta" to={cta.to}>{cta.label}<IconGo size={14} stroke={2.1} /></Link>
              : trend && <Sparkline data={trend} />}
          </div>
        </>
      )}
    </article>
  );
}
