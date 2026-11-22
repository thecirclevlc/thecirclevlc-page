import React, { useState } from 'react';
import { Play } from 'lucide-react';

/**
 * A third-party player that loads only when the visitor asks for it.
 *
 * YouTube, Vimeo, SoundCloud and Mixcloud can set their own cookies as soon
 * as their iframe loads. Behind a click, nothing is requested from them until
 * someone chooses to play — which is what the privacy policy promises.
 *
 * Fills its parent: callers keep their own aspect-ratio box.
 */
export default function EmbedFrame({ src, title, label }: { src: string; title: string; label: string }) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={src + (src.includes('?') ? '&' : '?') + 'autoplay=1'}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-3 px-6
                 text-primary hover:text-fg transition-colors cursor-pointer"
    >
      <Play className="w-10 h-10" aria-hidden="true" />
      <span className="text-sm font-mono tracking-widest uppercase">Load {label}</span>
      <span className="text-xs font-mono text-fg/40 normal-case">
        Content from {new URL(src).hostname}, which may set its own cookies.
      </span>
    </button>
  );
}
