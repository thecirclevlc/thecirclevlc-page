// Check ejecutable del redimensionado de imágenes. Node 24 corre TS nativo:
//   node lib/imageUrl.check.ts
// Falla con código != 0 si algo se rompe.
import assert from 'node:assert/strict';
import { sizedImage, sizedSrcSet, isStorageImage } from './imageUrl.ts';

const BASE = 'https://ifpikoyetqafzllqloyr.supabase.co/storage/v1/object/public';
const COVER = `${BASE}/images/events/covers/1779962041749-rbwtx077lj.webp`;

// ── EL FALLO QUE ESTO PROTEGE ────────────────────────────────────
// Las tres portadas de la home se servían a 1920x2530 dentro de una tarjeta de
// 320x427: treinta y seis veces los píxeles necesarios, 664kB cada una, once
// segundos en un móvil con 4G lento. Medido en Chrome, no supuesto. Al ancho
// real de la tarjeta pesan 104kB.
assert.equal(isStorageImage(COVER), true, 'una imagen nuestra sí se puede redimensionar');
assert.equal(
  sizedImage(COVER, 640),
  `https://ifpikoyetqafzllqloyr.supabase.co/storage/v1/render/image/public/images/events/covers/1779962041749-rbwtx077lj.webp?width=640&resize=contain&quality=70`,
  'pide la rendición, no el original',
);
assert.ok(sizedImage(COVER, 320).includes('width=320'));
// EL FALLO QUE ESTO PROTEGE: sin `resize=contain`, Supabase usa `cover` y de un
// original 1920x2530 devuelve 640x2530 — la altura entera aplastada en un tercio
// del ancho. Comprobado descodificando los bytes que devuelve de verdad. Una web
// con las fotos deformadas es peor que una web lenta.
assert.ok(sizedImage(COVER, 640).includes('resize=contain'), 'sin esto las fotos salen aplastadas');
for (const w of [320, 640, 800, 1200, 1600] as const)
  assert.ok(sizedImage(COVER, w).includes('resize=contain'), `falta contain en ${w}`);
assert.ok(sizedImage(COVER, 640, 85).includes('quality=85'), 'la calidad se puede subir donde importe');
// El original sigue existiendo: la lupa lo quiere entero.
assert.ok(COVER.includes('/object/public/'), 'no tocamos la URL de origen');

// ── Lo que no es nuestro no se toca ──────────────────────────────
// Ella pega enlaces de fuera. Reescribirlos rompería la imagen entera.
for (const foreign of [
  'https://instagram.com/foto.jpg',
  'https://images.unsplash.com/photo-123',
  '/local/portada.png',
  'data:image/svg+xml,<svg/>',
  '',
]) {
  assert.equal(isStorageImage(foreign), false, `ajena: ${foreign}`);
  assert.equal(sizedImage(foreign, 640), foreign, `se devuelve tal cual: ${foreign}`);
  assert.equal(sizedSrcSet(foreign, [320, 640]), '', 'sin srcset para lo que no podemos redimensionar');
}
assert.equal(sizedImage(undefined as unknown as string, 640), undefined as unknown as string,
  'un campo vacío no revienta');

// ── srcset ───────────────────────────────────────────────────────
const set = sizedSrcSet(COVER, [320, 640, 800]);
assert.equal(set.split(', ').length, 3);
assert.ok(set.includes('width=320 ') === false, 'el descriptor va detrás de la URL, no dentro');
assert.ok(set.endsWith('800w'), 'termina con el descriptor de ancho');
for (const w of [320, 640, 800]) assert.ok(set.includes(`width=${w}&resize=contain&quality=70 ${w}w`), `falta ${w}w`);

// Una URL que ya lleva query no pierde sus parámetros ni duplica el '?'.
const withQuery = `${COVER}?t=123`;
const out = sizedImage(withQuery, 640);
assert.ok(out.includes('t=123'), 'conserva lo que ya traía');
assert.equal(out.split('?').length, 2, 'un solo signo de interrogación');
assert.ok(out.includes('&width=640'));

console.log('imageUrl OK — 36 casos');
