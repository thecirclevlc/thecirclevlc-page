import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import './admin-ui.css';
import { Logo } from './ui/Logo';
import { useAdminTheme } from './ui/useAdminTheme';
import {
  IconArtists, IconBell, IconClose, IconCollapse, IconDoc, IconEvent, IconExternal,
  IconFooter, IconForm, IconGrid, IconHelp, IconHistory, IconHome, IconImage, IconInbox,
  IconLink, IconMenu, IconPages, IconSearch, IconShare, IconSignOut, IconTag, IconTalent,
  IconTheme, type IconProps,
} from './ui/icons';

/**
 * El armazón del panel.
 *
 * Las rutas y los grupos son los mismos que había — esto es una capa visual,
 * no una reorganización. Lo que cambia:
 *
 *  · Los tres rótulos en mayúsculas grises ("Content", "People writing in",
 *    "Look & navigation") pasan a ser separadores finos. Ocupaban tres líneas
 *    para decir algo que la propia agrupación ya dice.
 *  · El ítem activo era texto rojo, invisible a media pantalla de distancia.
 *    Ahora es una pastilla de cristal con un indicador de 3 px en el acento.
 *  · La barra se pliega a iconos. En una pantalla de portátil, 260 px de menú
 *    permanente es mucho para quien pasa el día dentro de un formulario.
 */

type NavItem = { label: string; to: string; icon: React.ComponentType<IconProps>; end?: boolean };

/** `null` = separador. Sustituye a los títulos de grupo. */
const NAV: (NavItem | null)[] = [
  { label: 'Dashboard',    to: '/admin',              icon: IconGrid, end: true },
  { label: 'How it works', to: '/admin/help',         icon: IconHelp },
  { label: 'Events',       to: '/admin/events',       icon: IconEvent },
  { label: 'DJs',          to: '/admin/djs',          icon: IconTalent },
  { label: 'Artists',      to: '/admin/artists',      icon: IconArtists },
  { label: 'Home page',    to: '/admin/home',         icon: IconHome },
  { label: 'Pages',        to: '/admin/pages',        icon: IconPages },
  null,
  { label: 'Submissions',  to: '/admin/submissions',  icon: IconInbox },
  { label: 'Forms',        to: '/admin/form-builder', icon: IconForm },
  { label: 'Email alerts', to: '/admin/notifications', icon: IconBell },
  null,
  { label: 'Appearance',       to: '/admin/appearance',            icon: IconTheme },
  { label: 'Menu',             to: '/admin/navigation',            icon: IconLink },
  { label: 'Footer',           to: '/admin/navigation?tab=footer', icon: IconFooter },
  { label: 'Social links',     to: '/admin/navigation?tab=social', icon: IconShare },
  { label: 'Page backgrounds', to: '/admin/settings',              icon: IconImage },
  null,
  { label: 'Google & sharing',  to: '/admin/settings?tab=seo',        icon: IconSearch },
  { label: 'Artist categories', to: '/admin/settings?tab=categories', icon: IconTag },
  { label: 'Legal pages',       to: '/admin/legal',                   icon: IconDoc },
  { label: 'Change history',    to: '/admin/history',                 icon: IconHistory },
];

const ITEMS = NAV.filter((n): n is NavItem => n !== null);

/**
 * El sitio público escala su texto desde el tamaño raíz, y el panel escalaría
 * con él. Se fija a 1: su panel no debe encoger porque ella haya hecho más
 * pequeños los titulares de la web.
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

/**
 * ¿Es este ítem el de la pantalla actual? Incluye el `?tab=` en la cuenta.
 *
 * Y por eso los enlaces son `Link` y no `NavLink`. NavLink escribe su propio
 * `aria-current="page"` con SU criterio, y lo escribe después de esparcir las
 * props, así que gana al que le pases tú. Su criterio es prefijo de ruta e
 * ignora la query — con lo cual en /admin/navigation se encendían Menu,
 * Footer y Social links a la vez, y "Dashboard" (/admin) se encendía en todas
 * las pantallas del panel. Cuatro entradas de menú marcadas y ninguna cierta.
 */
function isActive(item: NavItem, pathname: string, search: string) {
  const [path, query] = item.to.split('?');
  const wanted = new URLSearchParams(query ?? '').get('tab');
  if (item.end) return pathname === path;
  return pathname.startsWith(path)
    && (new URLSearchParams(search).get('tab') ?? null) === wanted;
}

/* ── Paleta de comandos ──────────────────────────────────────────────
 * Un buscador que no busca nada es peor que no tenerlo, así que ⌘K salta
 * entre las 21 pantallas del menú. No indexa contenido todavía; cuando lo
 * haga, se añade aquí y el atajo ya está en los dedos de la clienta. */
function Palette({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (n ? ITEMS.filter(x => x.label.toLowerCase().includes(n)) : ITEMS).slice(0, 8);
  }, [q]);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setI(0); }, [q]);

  const go = (item?: NavItem) => { if (item) { navigate(item.to); onClose(); } };

  return (
    <div className="tc-palette__scrim" onClick={onClose} role="presentation">
      <div
        className="tc-glass tc-glass--3 tc-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar una pantalla"
        onClick={e => e.stopPropagation()}
      >
        <div className="tc-palette__field">
          <IconSearch size={17} stroke={2} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Ir a…"
            aria-label="Buscar una pantalla"
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setI(v => Math.min(v + 1, hits.length - 1)); }
              if (e.key === 'ArrowUp')   { e.preventDefault(); setI(v => Math.max(v - 1, 0)); }
              if (e.key === 'Enter')     { e.preventDefault(); go(hits[i]); }
              if (e.key === 'Escape')    { e.preventDefault(); onClose(); }
            }}
          />
          <kbd className="tc-kbd">esc</kbd>
        </div>

        {hits.length === 0
          ? <p className="tc-palette__empty">Nada con ese nombre.</p>
          : (
            <ul className="tc-palette__list">
              {hits.map((item, k) => (
                <li key={item.to}>
                  <button
                    type="button"
                    className="tc-palette__row"
                    data-on={k === i || undefined}
                    onMouseEnter={() => setI(k)}
                    onClick={() => go(item)}
                  >
                    <item.icon size={17} stroke={2} />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </div>
  );
}

/* ── Barra lateral ───────────────────────────────────────────────────── */
function Sidebar({ unread, onNav }: { unread: number; onNav?: () => void }) {
  const { pathname, search } = useLocation();
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const link = (item: NavItem, active: boolean) => (
    <Link
      key={item.to}
      to={item.to}
      onClick={onNav}
      className="tc-nav"
      aria-current={active ? 'page' : undefined}
    >
      <item.icon size={19} />
      <span className="tc-nav__text">{item.label}</span>
      {item.to === '/admin/submissions' && unread > 0 && (
        <span
          className="tc-badge"
          title={`${unread} solicitud${unread === 1 ? '' : 'es'} sin abrir`}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
      <span className="tc-nav__tip">{item.label}</span>
    </Link>
  );

  return (
    <aside className="tc-glass tc-glass--1 tc-side">
      <div className="tc-side__brand">
        <Logo size={30} />
        <div className="tc-side__name">
          <b>The Circle</b>
          <span>CMS</span>
        </div>
      </div>

      <nav className="tc-side__nav">
        {NAV.map((item, k) =>
          item === null
            ? <div key={`sep-${k}`} className="tc-side__sep" />
            : link(item, isActive(item, pathname, search)),
        )}
      </nav>

      <div className="tc-side__foot">
        <a className="tc-nav" href="/" target="_blank" rel="noopener noreferrer">
          <IconExternal size={19} />
          <span className="tc-nav__text">Ver la web</span>
          <span className="tc-nav__tip">Ver la web</span>
        </a>
        <button
          type="button"
          className="tc-nav"
          onClick={async () => { await signOut(); navigate('/admin/login'); }}
        >
          <IconSignOut size={19} />
          <span className="tc-nav__text">Cerrar sesión</span>
          <span className="tc-nav__tip">Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

/* ── Layout ──────────────────────────────────────────────────────────── */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  useUnscaledAdmin();
  const { pathname, search } = useLocation();
  const { theme, toggle } = useAdminTheme();

  const [drawer, setDrawer]     = useState(false);
  const [palette, setPalette]   = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('tc.admin.collapsed') === '1'; } catch { return false; }
  });
  const [unread, setUnread] = useState(0);

  // Solicitudes sin abrir, en la entrada de menú que lleva a ellas.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('form_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new')
      .then(({ count }) => { if (!cancelled) setUnread(count ?? 0); }, () => {});
    return () => { cancelled = true; };
  }, [pathname]);

  // El cajón se cierra al navegar; si no, tapa la pantalla a la que acaba de ir.
  useEffect(() => { setDrawer(false); }, [pathname, search]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const setFold = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem('tc.admin.collapsed', v ? '1' : '0'); } catch { /* da igual */ }
  };

  const current = ITEMS.find(x => isActive(x, pathname, search));

  return (
    <div className="tc-admin" data-theme={theme}>
      <div className="tc-shell" data-collapsed={collapsed} data-drawer={drawer}>

        <Sidebar unread={unread} onNav={() => setDrawer(false)} />
        {drawer && <div className="tc-scrim" onClick={() => setDrawer(false)} role="presentation" />}

        <div className="tc-main">
          <header className="tc-glass tc-glass--1 tc-top">
            <button
              type="button"
              className="tc-iconbtn tc-only-mobile"
              onClick={() => setDrawer(v => !v)}
              aria-label={drawer ? 'Cerrar el menú' : 'Abrir el menú'}
            >
              {drawer ? <IconClose size={18} /> : <IconMenu size={18} />}
            </button>

            <button
              type="button"
              className="tc-iconbtn tc-only-desktop"
              onClick={() => setFold(!collapsed)}
              aria-label={collapsed ? 'Desplegar el menú' : 'Plegar el menú'}
              aria-pressed={collapsed}
            >
              <IconCollapse size={18} />
            </button>

            <nav className="tc-crumb" aria-label="Migas de pan">
              <Link to="/admin">Panel</Link>
              {current && current.to !== '/admin' && (
                <>
                  <i aria-hidden="true">/</i>
                  <b>{current.label}</b>
                </>
              )}
            </nav>

            <div className="tc-spacer" />

            <button type="button" className="tc-search" onClick={() => setPalette(true)}>
              <IconSearch size={16} stroke={2} />
              <span>Buscar</span>
              <kbd className="tc-kbd">⌘K</kbd>
            </button>

            <button
              type="button"
              className="tc-iconbtn"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            >
              <IconTheme size={18} />
            </button>

            <span className="tc-avatar" aria-hidden="true">TC</span>
          </header>

          <main className="tc-page">{children}</main>
        </div>
      </div>

      {palette && <Palette onClose={() => setPalette(false)} />}
    </div>
  );
}
