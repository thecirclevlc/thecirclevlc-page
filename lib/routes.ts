// ================================================================
// Public routes registry — single source of truth for nav/footer pickers
// Admin UI only lets the admin pick from THIS list (avoids broken links).
// Keep in sync with AppRouter.tsx.
// ================================================================

export interface RouteOption {
  path:  string;
  label: string;
}

export const AVAILABLE_ROUTES: readonly RouteOption[] = [
  { path: '/',            label: 'Home' },
  { path: '/past-events', label: 'Past Events' },
  { path: '/djs',         label: 'DJs' },
  { path: '/artists',     label: 'Artists' },
  { path: '/form',        label: 'Join (Form)' },
  { path: '/terms',       label: 'Terms' },
  { path: '/privacy',     label: 'Privacy' },
] as const;

export function isValidRoute(path: string): boolean {
  return AVAILABLE_ROUTES.some(r => r.path === path);
}
