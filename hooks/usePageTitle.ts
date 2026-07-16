import { useEffect } from 'react';

// ponytail: client-side titles only — bots that skip JS see the server-injected home title
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} — THE CIRCLE` : 'THE CIRCLE';
  }, [title]);
}
