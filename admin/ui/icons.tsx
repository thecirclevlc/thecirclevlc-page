import React from 'react';

/**
 * Iconos del panel — dibujados, no importados.
 *
 * Una sola rejilla (24), un solo grosor (1.75), terminaciones redondas y un
 * mismo vocabulario: círculos, arcos concéntricos y rectángulos de esquina
 * ancha. Lucide es correcta pero es la de todo el mundo, y aquí el círculo
 * es la marca — los iconos tenían que decirlo.
 *
 * Sobre `stroke`: 1.75 está calibrado para dibujarse a 20-24 px. Por debajo
 * de ~16 el trazo se va a medio píxel y se ve lavado, así que los iconos que
 * viven dentro de una pastilla pequeña pasan `stroke={2.1}`. Es compensación
 * óptica, no una segunda rejilla.
 */

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, 'stroke'> {
  size?: number;
  stroke?: number;
}

function Svg({ size = 22, stroke = 1.75, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ── Contenido ─────────────────────────────────────────────────────── */

/** Eventos — la rejilla de fechas con el día marcado. */
export const IconEvent = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.25" y="5.25" width="17.5" height="15.5" rx="4.25" />
    <path d="M3.25 10.25h17.5M8.25 3.25v4M15.75 3.25v4" />
    <circle cx="12" cy="15.6" r="1.7" fill="currentColor" stroke="none" />
  </Svg>
);

/** Talento — el disco y el brazo. El giro entero del negocio en un icono. */
export const IconTalent = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.6" cy="13.4" r="7.35" />
    <circle cx="10.6" cy="13.4" r="2.4" />
    <path d="M20.75 3.25 15.9 8.1" />
  </Svg>
);

/** Artistas — dos siluetas, construidas con círculo y arco. */
export const IconArtists = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9.6" cy="8.6" r="3.85" />
    <path d="M3.25 20.4a6.35 6.35 0 0 1 12.7 0" />
    <path d="M16.4 5.15a3.85 3.85 0 0 1 0 6.9" />
    <path d="M17.95 15.1a6.35 6.35 0 0 1 2.8 5.3" />
  </Svg>
);

/** Submissions — la bandeja y algo que entra en ella. */
export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.75 12.6v5.55a2.35 2.35 0 0 1-2.35 2.35H5.6a2.35 2.35 0 0 1-2.35-2.35V12.6" />
    <path d="M3.25 12.6h5.1l1.35 2.65h4.6l1.35-2.65h5.1" />
    <path d="M12 3.25v6.5m0 0 2.6-2.6M12 9.75 9.4 7.15" />
  </Svg>
);

/** Publicado — emitiendo. Arcos concéntricos, el mismo gesto que el logo. */
export const IconLive = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    <path d="M7.85 16.15a5.87 5.87 0 0 1 0-8.3" />
    <path d="M16.15 7.85a5.87 5.87 0 0 1 0 8.3" />
    <path d="M4.9 19.1a10.04 10.04 0 0 1 0-14.2" />
    <path d="M19.1 4.9a10.04 10.04 0 0 1 0 14.2" />
  </Svg>
);

/* ── Señales ───────────────────────────────────────────────────────── */

/** Tendencia. `down` invierte en Y, así el par comparte trazo exacto. */
export const IconTrend = ({ dir = 'up', ...p }: IconProps & { dir?: 'up' | 'down' }) => (
  <Svg {...p} style={{ ...p.style, transform: dir === 'down' ? 'scaleY(-1)' : undefined }}>
    <path d="M3.75 17.5 9.5 11.25l3.5 3.5 7.25-8" />
    <path d="M15.25 6.75h5v5" />
  </Svg>
);

/** Sin cambio. */
export const IconFlat = (p: IconProps) => (
  <Svg {...p}><path d="M4.25 12h15.5" /></Svg>
);

/** Error. */
export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 7.6v4.9" />
    <circle cx="12" cy="16.05" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

/** Vacío — la misma familia de arcos, sin nada en el centro. */
export const IconVoid = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.75" strokeDasharray="2.4 3.6" />
    <circle cx="12" cy="12" r="3.5" />
  </Svg>
);

/** Avanzar — la punta del CTA. */
export const IconGo = (p: IconProps) => (
  <Svg {...p}><path d="M5 12h13m0 0-5-5m5 5-5 5" /></Svg>
);

/* ── Navegación ─────────────────────────────────────────────────────
 * El resto del menú. Mismo vocabulario que los de arriba: el rectángulo de
 * esquina ancha para lo que es una página, el círculo para lo que es una
 * entidad, el arco para lo que se emite. */

/** Dashboard — la retícula de la propia pantalla. */
export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.25" y="3.25" width="7.4" height="7.4" rx="2.4" />
    <rect x="13.35" y="3.25" width="7.4" height="7.4" rx="2.4" />
    <rect x="3.25" y="13.35" width="7.4" height="7.4" rx="2.4" />
    <rect x="13.35" y="13.35" width="7.4" height="7.4" rx="2.4" />
  </Svg>
);

/** Cómo funciona. */
export const IconHelp = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M9.5 9.4a2.6 2.6 0 1 1 3.4 2.48c-.55.19-.9.72-.9 1.3v.72" />
    <circle cx="12" cy="16.4" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

/** Portada. */
export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.6 10.6 12 3.9l8.4 6.7" />
    <path d="M5.6 12.2v6.2a2.35 2.35 0 0 0 2.35 2.35h8.1a2.35 2.35 0 0 0 2.35-2.35v-6.2" />
    <path d="M9.85 20.75v-4.6a2.15 2.15 0 0 1 4.3 0v4.6" />
  </Svg>
);

/** Páginas — hojas apiladas. */
export const IconPages = (p: IconProps) => (
  <Svg {...p}>
    <rect x="7.4" y="3.25" width="13.35" height="14.6" rx="3.4" />
    <path d="M16.6 20.75H6.65A3.4 3.4 0 0 1 3.25 17.35V7.4" />
  </Svg>
);

/** Formularios — campos que se rellenan. */
export const IconForm = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="4.25" />
    <path d="M7.5 9h9M7.5 13h9M7.5 17h4.5" />
  </Svg>
);

/** Avisos por email — la campana como arco, no como campana literal. */
export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6.4 10.4a5.6 5.6 0 0 1 11.2 0v3.3l1.55 2.75a1 1 0 0 1-.87 1.5H5.72a1 1 0 0 1-.87-1.5L6.4 13.7z" />
    <path d="M9.9 20.9a2.4 2.4 0 0 0 4.2 0" />
  </Svg>
);

/** Apariencia — medio disco lleno, la idea de tema. */
export const IconTheme = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.75" />
    <path d="M12 3.25a8.75 8.75 0 0 1 0 17.5z" fill="currentColor" stroke="none" />
  </Svg>
);

/** Menú de navegación — eslabones. */
export const IconLink = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10.1 13.9a3.6 3.6 0 0 0 5.15.1l2.9-2.9a3.65 3.65 0 0 0-5.16-5.16l-1.6 1.6" />
    <path d="M13.9 10.1a3.6 3.6 0 0 0-5.15-.1l-2.9 2.9a3.65 3.65 0 0 0 5.16 5.16l1.6-1.6" />
  </Svg>
);

/** Pie de página — la banda de abajo. */
export const IconFooter = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="4.25" />
    <path d="M3.25 15.6h17.5" />
    <path d="M7.2 18.2h5" />
  </Svg>
);

/** Redes — un nodo que se reparte. */
export const IconShare = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="17.6" cy="5.9" r="2.65" />
    <circle cx="6.4" cy="12" r="2.65" />
    <circle cx="17.6" cy="18.1" r="2.65" />
    <path d="M8.75 10.75 15.3 7.2M8.75 13.25l6.55 3.55" />
  </Svg>
);

/** Fondos de página. */
export const IconImage = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="4.25" />
    <circle cx="9.1" cy="9.1" r="1.85" />
    <path d="M3.55 17.1 8 12.9a2.1 2.1 0 0 1 2.95.08l5.2 5.45" />
    <path d="M14.35 14.5l1.5-1.4a2.1 2.1 0 0 1 2.92.06l1.85 1.9" />
  </Svg>
);

/** Google y compartir — buscar. */
export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="10.9" cy="10.9" r="7.15" />
    <path d="M16.2 16.2 20.75 20.75" />
  </Svg>
);

/** Categorías. */
export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M11.15 3.6H5.6A2 2 0 0 0 3.6 5.6v5.55a2 2 0 0 0 .59 1.42l7.24 7.24a2 2 0 0 0 2.83 0l5.55-5.55a2 2 0 0 0 0-2.83l-7.24-7.24a2 2 0 0 0-1.42-.59z" />
    <circle cx="8.2" cy="8.2" r="1.5" fill="currentColor" stroke="none" />
  </Svg>
);

/** Páginas legales. */
export const IconDoc = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.25 6.6A3.35 3.35 0 0 1 8.6 3.25h4.05l6.1 6.1v8.05a3.35 3.35 0 0 1-3.35 3.35H8.6a3.35 3.35 0 0 1-3.35-3.35z" />
    <path d="M12.9 3.4v4.3a1.8 1.8 0 0 0 1.8 1.8h4.05" />
    <path d="M8.9 14.2h6.2M8.9 17.3h4" />
  </Svg>
);

/** Historial — el círculo con la aguja hacia atrás. */
export const IconHistory = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.7 10.6A8.75 8.75 0 1 1 3.25 13.4" />
    <path d="M3.25 4.9v5.1h5.1" />
    <path d="M12 7.9V12l2.9 1.9" />
  </Svg>
);

/** Salir del panel hacia la web. */
export const IconExternal = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.6 4.15H6.6a2.85 2.85 0 0 0-2.85 2.85v10.4a2.85 2.85 0 0 0 2.85 2.85H17a2.85 2.85 0 0 0 2.85-2.85v-7" />
    <path d="M20.25 3.75 11.4 12.6M14.9 3.75h5.35V9.1" />
  </Svg>
);

/** Cerrar sesión. */
export const IconSignOut = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9.6 3.75H6.6A2.85 2.85 0 0 0 3.75 6.6v10.8A2.85 2.85 0 0 0 6.6 20.25h3" />
    <path d="M14.7 7.9 18.8 12l-4.1 4.1M18.4 12H8.5" />
  </Svg>
);

/* ── Cromo de la interfaz ───────────────────────────────────────────── */

/** Plegar el panel lateral. */
export const IconCollapse = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.25" y="3.9" width="17.5" height="16.2" rx="4" />
    <path d="M9.9 3.9v16.2" />
  </Svg>
);

/** Cajón móvil. */
export const IconMenu = (p: IconProps) => (
  <Svg {...p}><path d="M3.9 7h16.2M3.9 12h16.2M3.9 17h10.4" /></Svg>
);

export const IconClose = (p: IconProps) => (
  <Svg {...p}><path d="M6.4 6.4 17.6 17.6M17.6 6.4 6.4 17.6" /></Svg>
);
