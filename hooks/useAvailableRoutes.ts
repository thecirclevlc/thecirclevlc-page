import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AVAILABLE_ROUTES, type RouteOption } from '../lib/routes';

/**
 * Every address a menu or footer link may point at: the site's built-in
 * routes plus every page the client has published.
 *
 * This is what makes her pages first-class. Without it she can create
 * "Who We Are" and still have no way to link to it, which is the same
 * dead end that made her write in the first place.
 *
 * Drafts are excluded on purpose — linking to an unpublished page from the
 * public menu would 404 for visitors while looking fine to her.
 */
export function useAvailableRoutes(): RouteOption[] {
  const [routes, setRoutes] = useState<RouteOption[]>([...AVAILABLE_ROUTES]);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('pages')
      .select('slug, title')
      .eq('status', 'published')
      .order('sort_order')
      .then(({ data }) => {
        if (cancelled || !data) return;
        setRoutes([
          ...AVAILABLE_ROUTES,
          ...data.map(p => ({ path: `/${p.slug}`, label: p.title as string })),
        ]);
      });

    return () => { cancelled = true; };
  }, []);

  return routes;
}
