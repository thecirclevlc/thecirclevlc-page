import { useCallback, useEffect, useState } from 'react';

/**
 * Claro u oscuro, y quién manda.
 *
 * Orden: lo que ella eligió > lo que dice su sistema. Si nunca ha tocado el
 * interruptor seguimos a `prefers-color-scheme`, y si el sistema cambia a
 * mitad de sesión (macOS al atardecer) la seguimos también — pero sólo
 * mientras no haya elección guardada. En cuanto pulsa, manda ella para
 * siempre.
 *
 * El atributo va en el <div class="tc-admin">, no en <html>: el sitio
 * público comparte documento con el panel en esta SPA y no tiene tema claro.
 */
const KEY = 'tc.admin.theme';
export type Theme = 'light' | 'dark';

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;   // modo privado: se comporta como si nunca hubiese elegido
  }
}

export function useAdminTheme() {
  const [choice, setChoice] = useState<Theme | null>(stored);
  const [system, setSystem] = useState<Theme>(() =>
    typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches
      ? 'light' : 'dark');

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: light)');
    const on = (e: MediaQueryListEvent) => setSystem(e.matches ? 'light' : 'dark');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const theme: Theme = choice ?? system;

  const toggle = useCallback(() => {
    setChoice(prev => {
      const next: Theme = (prev ?? system) === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(KEY, next); } catch { /* sin persistencia, pero funciona */ }
      return next;
    });
  }, [system]);

  return { theme, toggle };
}
