/**
 * Works out where a link the client typed should actually go.
 *
 * Same reasoning as `embedUrl`: she pastes what she copied. Asked where a photo
 * should lead, she will type `instagram.com/thecircle` — no scheme — and a
 * naive "does it start with http" test sends that to
 * `thecirclevlc.com/instagram.com/thecircle`, which is a 404 on her own site
 * and looks like the feature is broken.
 *
 * Telling a bare domain from an internal path is exact here rather than a
 * guess: `validatePageSlug` only allows `[a-z0-9-]`, so no address on this site
 * can contain a dot. A dot followed by a TLD means somewhere else, always.
 *
 * Returns null for anything that must never reach an `href` — `javascript:`
 * above all. The client cannot type that by accident, but `blocks` is JSONB
 * behind a policy that lets any authenticated user write it, so the renderer
 * refuses rather than trusts.
 */

export interface LinkTarget {
  kind: 'external' | 'internal';
  /** Ready to use: as `href` when external, as a router path when internal. */
  href: string;
  /** Whether it should open in a new tab. Anchors and mail/phone should not. */
  newTab: boolean;
}

/** Schemes that may never become an href, whatever put them in the database. */
const BLOCKED = /^(javascript|data|vbscript|file|blob):/i;

/** A host with a real TLD, optionally followed by a port, path, query or hash. */
const BARE_DOMAIN = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9-]+)*\.[a-z]{2,}(:\d+)?([/?#].*)?$/i;

export function linkTarget(raw: string): LinkTarget | null {
  const input = (raw ?? '').trim();
  if (!input) return null;
  if (BLOCKED.test(input)) return null;

  // Reachable without leaving the page, so no new tab for these.
  if (/^(mailto|tel|sms):/i.test(input)) return { kind: 'external', href: input, newTab: false };
  if (input.startsWith('#')) return { kind: 'external', href: input, newTab: false };

  if (/^https?:\/\//i.test(input)) return { kind: 'external', href: input, newTab: true };
  // Protocol-relative. Given a name, https is the only sane reading.
  if (input.startsWith('//')) return { kind: 'external', href: `https:${input}`, newTab: true };

  if (input.startsWith('/')) return { kind: 'internal', href: input, newTab: false };
  if (BARE_DOMAIN.test(input)) return { kind: 'external', href: `https://${input}`, newTab: true };

  return { kind: 'internal', href: `/${input}`, newTab: false };
}

/** One sentence telling the client where this will send a visitor. */
export function describeLinkTarget(raw: string, siteHost = 'thecirclevlc.com'): string {
  const target = linkTarget(raw);
  if (!target) {
    return (raw ?? '').trim()
      ? 'That address cannot be used as a link. Paste a web address or a path on your site.'
      : 'Leave it empty and clicking the photo enlarges it, as it does now.';
  }
  if (target.kind === 'internal') return `Goes to ${siteHost}${target.href} — a page on your own site.`;
  // An anchor only works if something on the page is marked with that name.
  // Nothing on this site is yet, so say so rather than promise a jump.
  if (target.href.startsWith('#')) {
    return `Jumps to a spot named "${target.href.slice(1)}" on this page — only if one exists.`;
  }
  if (!target.newTab) return `Opens ${target.href} on the visitor's device.`;
  return `Opens ${target.href} in a new tab, because it leaves your site.`;
}
