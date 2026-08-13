/**
 * Turns the link a person actually copies from the address bar into
 * something embeddable.
 *
 * The client will paste `youtube.com/watch?v=…`, never `youtube.com/embed/…`,
 * so asking her for an "embed URL" would just produce broken blocks and a
 * message to the developer.
 *
 * Returns `null` when the link is not something we can embed, so callers can
 * fall back to a plain link rather than rendering a blank iframe.
 */
export type EmbedKind = 'iframe' | 'video';

export interface Embed {
  kind: EmbedKind;
  src:  string;
  /** Iframes need it; <video> does not. */
  title: string;
}

export function embedUrl(raw: string): Embed | null {
  const input = (raw ?? '').trim();
  if (!input) return null;

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

  const host = url.hostname.toLowerCase().replace(/^www\./, '');

  // ── YouTube ─────────────────────────────────────────────────────
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return id ? { kind: 'iframe', src: `https://www.youtube.com/embed/${id}`, title: 'YouTube video' } : null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') {
      const id = url.searchParams.get('v');
      return id ? { kind: 'iframe', src: `https://www.youtube.com/embed/${id}`, title: 'YouTube video' } : null;
    }
    const m = url.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/);
    if (m) return { kind: 'iframe', src: `https://www.youtube.com/embed/${m[2]}`, title: 'YouTube video' };
    return null;
  }

  // ── Vimeo ───────────────────────────────────────────────────────
  if (host === 'vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return /^\d+$/.test(id ?? '')
      ? { kind: 'iframe', src: `https://player.vimeo.com/video/${id}`, title: 'Vimeo video' }
      : null;
  }
  if (host === 'player.vimeo.com') {
    return { kind: 'iframe', src: url.toString(), title: 'Vimeo video' };
  }

  // ── SoundCloud / Mixcloud — audio, but same block from her side ──
  if (host === 'soundcloud.com') {
    return {
      kind: 'iframe',
      src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url.toString())}&color=%23000000&hide_related=true`,
      title: 'SoundCloud player',
    };
  }
  if (host === 'mixcloud.com') {
    return {
      kind: 'iframe',
      src: `https://player-widget.mixcloud.com/widget/iframe/?feed=${encodeURIComponent(url.pathname)}`,
      title: 'Mixcloud player',
    };
  }

  // ── A video file uploaded straight to storage ───────────────────
  if (/\.(mp4|webm|ogg|mov)$/i.test(url.pathname)) {
    return { kind: 'video', src: url.toString(), title: 'Video' };
  }

  return null;
}
