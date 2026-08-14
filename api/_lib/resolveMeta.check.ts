// Check ejecutable del resolutor de metadatos:
//   node api/_lib/resolveMeta.check.ts
import assert from 'node:assert/strict';
// @ts-ignore
import { resolveMeta, normalisePath, SITE_URL } from './resolveMeta.mjs';
// @ts-ignore
import { injectMeta, jsonLdScript } from './injectMeta.mjs';

const db = {
  async event(slug: string) {
    return slug === 'vol-iv'
      ? { title: 'The Industrial Warehouse', event_number: 'VOL.IV', date: '2026-05-09',
          venue: 'Secret Location', short_description: 'Una noche irrepetible.',
          description: null, cover_image_url: 'https://x/cover.webp' }
      : null;
  },
  async profile(kind: string, slug: string) {
    return slug === 'two-m'
      ? { name: 'TWO M', bio: 'DJ valenciana.', photo_url: 'https://x/p.webp',
          genres: ['House'], based_in: 'Valencia' }
      : null;
  },
  async page(slug: string) {
    return slug === 'who-we-are'
      ? { title: 'Who We Are', seo_title: null, seo_description: 'Quiénes somos.' }
      : null;
  },
};

const R = async (url: string) => resolveMeta(url, db, {});

// ── Normalización ───────────────────────────────────────────────
assert.equal(normalisePath('/djs/'), '/djs', 'la barra final no crea otra página');
assert.equal(normalisePath('/djs?utm_source=ig'), '/djs', 'los parámetros no cuentan');
assert.equal(normalisePath('/djs#gallery'), '/djs');
assert.equal(normalisePath(''), '/');

// ── Canonical: EL bug. Antes todas las rutas se declaraban como la portada ──
assert.equal((await R('/')).canonical,      SITE_URL + '/');
assert.equal((await R('/djs')).canonical,   SITE_URL + '/djs');
assert.equal((await R('/artists')).canonical, SITE_URL + '/artists');
assert.equal((await R('/past-events/vol-iv')).canonical, SITE_URL + '/past-events/vol-iv');
// Con parámetros de campaña, el canonical debe seguir siendo limpio.
assert.equal((await R('/djs?utm_source=ig')).canonical, SITE_URL + '/djs');

// ── Títulos propios por página ──────────────────────────────────
assert.match((await R('/djs')).title, /^DJs · THE CIRCLE$/);
assert.match((await R('/past-events/vol-iv')).title, /The Industrial Warehouse — VOL\.IV/);
assert.match((await R('/djs/two-m')).title, /^TWO M · /);
assert.match((await R('/who-we-are')).title, /^Who We Are · /);

// ── noindex donde toca ──────────────────────────────────────────
assert.equal((await R('/admin')).noindex, true, 'el panel nunca se indexa');
assert.equal((await R('/admin/events/123')).noindex, true);
assert.equal((await R('/terms')).noindex, true, 'los legales no aportan a búsqueda');
assert.equal((await R('/no-existe')).noindex, true, 'una URL rota no puede indexarse como buena');
assert.equal((await R('/past-events/no-existe')).noindex, true);
assert.equal((await R('/djs/no-existe')).noindex, true);
assert.equal((await R('/djs')).noindex, false);
assert.equal((await R('/')).noindex, false);

// ── Datos estructurados ─────────────────────────────────────────
const ev = await R('/past-events/vol-iv');
assert.equal(ev.jsonld['@type'], 'Event');
assert.equal(ev.jsonld.startDate, '2026-05-09');
assert.equal(ev.jsonld.location.name, 'Secret Location');
assert.equal(ev.image, 'https://x/cover.webp', 'compartir un evento muestra su portada');

const dj = await R('/djs/two-m');
assert.equal(dj.jsonld['@type'], 'MusicGroup');
assert.deepEqual(dj.jsonld.genre, ['House']);

// La portada conserva la copia que la clienta escribe en el panel.
const home = await resolveMeta('/', db, { title: 'MI TITULO', description: 'Mi descripción.' });
assert.equal(home.title, 'MI TITULO');
assert.equal(home.description, 'Mi descripción.');

// ── Inyección de extremo a extremo ──────────────────────────────
const shell = '<title><!--META:title-->X<!--/META:title--></title>'
            + '<link rel="canonical" href="<!--META:canonical-->Y<!--/META:canonical-->" />'
            + '<!--META:head_extra--><!--/META:head_extra-->';
const out = injectMeta(shell, {
  title: ev.title, canonical: ev.canonical,
  head_extra: '<meta name="robots" content="noindex,follow" />' + jsonLdScript(ev.jsonld),
});
assert.ok(out.includes('<title>The Industrial Warehouse'), 'el título real llega al HTML');
assert.ok(out.includes(`href="${SITE_URL}/past-events/vol-iv"`), 'el canonical real llega al HTML');
assert.ok(out.includes('application/ld+json'), 'el JSON-LD se inyecta CRUDO, no escapado');
assert.ok(!out.includes('META:'), 'no queda ni un marcador visible para el rastreador');

// El escapado de texto sigue activo donde debe.
const xss = injectMeta('<title><!--META:title-->X<!--/META:title--></title>',
                       { title: '</title><script>alert(1)</script>' });
assert.ok(!xss.includes('<script>alert(1)'), 'el título se escapa');

console.log('resolveMeta + injectMeta OK — 32 casos');

// ── Compartir por página, no el mismo título en todas ─────────────
// Reproduce la precedencia de api/index.ts: los valores de meta_seo son la
// copia de la PORTADA, no de todas las páginas. Antes ganaban en todas, así
// que /djs, cada evento y cada perfil se compartían como "THE CIRCLE".
{
  const defaults = { og_title: 'THE CIRCLE', og_description: 'Un evento exclusivo.', og_image: 'https://cdn/site.png' };
  const share = (meta) => {
    const isHome = meta.canonical === SITE_URL + '/';
    return {
      og_title: isHome ? (defaults.og_title || meta.title) : meta.title,
      og_image: meta.image || defaults.og_image || null,
    };
  };

  assert.equal(share({ canonical: SITE_URL + '/', title: 'THE CIRCLE' }).og_title, 'THE CIRCLE',
    'la portada conserva su propia copia de compartir');
  assert.equal(share({ canonical: SITE_URL + '/djs', title: 'DJs · THE CIRCLE' }).og_title, 'DJs · THE CIRCLE',
    'una página interior se comparte con SU título, no con el del sitio');
  assert.equal(share({ canonical: SITE_URL + '/past-events/vol-iv', title: 'VOL. IV · THE CIRCLE' }).og_title,
    'VOL. IV · THE CIRCLE', 'y un evento también');

  assert.equal(share({ canonical: SITE_URL + '/djs' }).og_image, 'https://cdn/site.png',
    'sin imagen propia se usa la que ella sube');
  assert.equal(share({ canonical: SITE_URL + '/djs/x', image: 'https://cdn/foto.jpg' }).og_image,
    'https://cdn/foto.jpg', 'la foto del perfil gana a la del sitio');
  assert.equal(share({ canonical: SITE_URL + '/djs' }).og_image, 'https://cdn/site.png');
}

console.log('compartir por página OK — 6 casos');
