// Check ejecutable del conversor de enlaces de vídeo:
//   node lib/embedUrl.check.ts
import assert from 'node:assert/strict';
import { embedUrl } from './embedUrl.ts';
import { validatePageSlug } from './database.types.ts';

const src = (raw: string) => embedUrl(raw)?.src ?? null;

// ── YouTube: las formas que la clienta va a copiar de verdad ─────
const YT = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
assert.equal(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), YT);
assert.equal(src('https://youtube.com/watch?v=dQw4w9WgXcQ'), YT);
assert.equal(src('https://youtu.be/dQw4w9WgXcQ'), YT);
assert.equal(src('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), YT);
assert.equal(src('https://www.youtube.com/shorts/dQw4w9WgXcQ'), YT);
// Con lista de reproducción y marca de tiempo pegados, que es lo normal.
assert.equal(src('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=42s'), YT);
// Espacios al copiar y pegar.
assert.equal(src('  https://youtu.be/dQw4w9WgXcQ  '), YT);

// ── Vimeo ───────────────────────────────────────────────────────
assert.equal(src('https://vimeo.com/123456789'), 'https://player.vimeo.com/video/123456789');
assert.equal(src('https://vimeo.com/notanid'), null, 'un id no numérico no es un vídeo');

// ── Audio ───────────────────────────────────────────────────────
assert.ok(src('https://soundcloud.com/artist/track')?.startsWith('https://w.soundcloud.com/player/'));
assert.ok(src('https://www.mixcloud.com/artist/mix/')?.startsWith('https://player-widget.mixcloud.com/'));

// ── Fichero subido al almacenamiento ────────────────────────────
assert.equal(embedUrl('https://x.supabase.co/storage/v1/object/public/images/a.mp4')?.kind, 'video');
assert.equal(embedUrl('https://x.supabase.co/a.webm')?.kind, 'video');

// ── Lo que NO se puede incrustar devuelve null, no un iframe vacío ──
assert.equal(embedUrl('https://example.com/una-pagina'), null);
assert.equal(embedUrl('no soy una url'), null);
assert.equal(embedUrl(''), null);
assert.equal(embedUrl('javascript:alert(1)'), null, 'javascript: nunca');
assert.equal(embedUrl('data:text/html,<script>'), null, 'data: nunca');

// ── Slugs de página ─────────────────────────────────────────────
assert.equal(validatePageSlug('who-we-are'), null);
assert.equal(validatePageSlug('about2'), null);
// Reservados: una página aquí sería inalcanzable porque gana la ruta estática.
assert.ok(validatePageSlug('djs'));
assert.ok(validatePageSlug('admin'));
assert.ok(validatePageSlug('form'));
// Formato.
assert.ok(validatePageSlug('Who We Are'), 'mayúsculas y espacios no valen');
assert.ok(validatePageSlug('who--we'), 'guiones dobles no valen');
assert.ok(validatePageSlug('-who'), 'no puede empezar por guión');
assert.ok(validatePageSlug('a'), 'una sola letra es demasiado corta');
assert.ok(validatePageSlug(''), 'vacío no vale');
// Duplicados.
assert.ok(validatePageSlug('about', ['about']));
assert.equal(validatePageSlug('about', ['contact']), null);

console.log('embedUrl + slugs OK — 30 casos');
