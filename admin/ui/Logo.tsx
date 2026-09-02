import React, { useId } from 'react';

/**
 * El monograma. Un disco con un corte: el círculo de la marca y el surco de
 * un vinilo en el mismo trazo, con el corte girado a la posición de las diez
 * para que se lea como algo que gira y no como una "C".
 *
 * El gradiente necesita un id único — con dos logos en pantalla (barra fija
 * y cajón móvil abierto) un id repetido hace que el segundo herede el
 * primero, o desaparezca según el navegador.
 */
export function Logo({ size = 30 }: { size?: number }) {
  const g = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tc-brand-ink)" />
          <stop offset="1" stopColor="var(--tc-brand)" />
        </linearGradient>
      </defs>
      <circle
        cx="16" cy="16" r="12.6"
        stroke={`url(#${g})`} strokeWidth="2.4"
        strokeDasharray="61 18" strokeLinecap="round"
        transform="rotate(-38 16 16)"
      />
      <circle cx="16" cy="16" r="4.4" stroke={`url(#${g})`} strokeWidth="1.75" />
      <circle cx="16" cy="16" r="1.15" fill="var(--tc-brand-ink)" />
    </svg>
  );
}

/** Versión compacta: sin el anillo interior, legible a 20 px. */
export function LogoMark({ size = 22 }: { size?: number }) {
  const g = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={g} x1="4" y1="3" x2="27" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--tc-brand-ink)" />
          <stop offset="1" stopColor="var(--tc-brand)" />
        </linearGradient>
      </defs>
      <circle
        cx="16" cy="16" r="12.6"
        stroke={`url(#${g})`} strokeWidth="3.2"
        strokeDasharray="61 18" strokeLinecap="round"
        transform="rotate(-38 16 16)"
      />
      <circle cx="16" cy="16" r="3" fill="var(--tc-brand-ink)" />
    </svg>
  );
}
