// Check ejecutable de los enlaces en las fotos. Node 24 corre TS nativo:
//   node lib/blockLink.check.ts
// Falla con código != 0 si algo se rompe.
import assert from 'node:assert/strict';
import { linkTarget, describeLinkTarget } from './blockLink.ts';

const t = (raw: string) => linkTarget(raw);

// ── Vacío ────────────────────────────────────────────────────────
// Sin enlace, la foto sigue abriendo la lupa como siempre.
assert.equal(t(''), null);
assert.equal(t('   '), null, 'espacios en blanco es no haber puesto nada');
assert.equal(t(undefined as unknown as string), null, 'un campo que nunca existió tampoco rompe');

// ── Fuera del sitio ──────────────────────────────────────────────
assert.deepEqual(t('https://instagram.com/thecircle'),
  { kind: 'external', href: 'https://instagram.com/thecircle', newTab: true });
assert.deepEqual(t('http://ejemplo.org'),
  { kind: 'external', href: 'http://ejemplo.org', newTab: true });
assert.equal(t('  https://instagram.com/x  ')!.href, 'https://instagram.com/x', 'se recortan los espacios');
assert.equal(t('HTTPS://INSTAGRAM.COM/X')!.kind, 'external', 'el esquema en mayúsculas también sale');

// EL FALLO QUE ESTO PROTEGE: la clienta escribe lo que copia, y copiar de la
// barra del navegador o de una tarjeta deja el dominio pelado. Tratarlo como
// ruta interna la mandaba a thecirclevlc.com/instagram.com/… — un 404 en su
// propia web, que parece que la función está rota.
assert.deepEqual(t('instagram.com/thecircle'),
  { kind: 'external', href: 'https://instagram.com/thecircle', newTab: true });
assert.equal(t('paypal.me/thecircle')!.href, 'https://paypal.me/thecircle');
assert.equal(t('ko-fi.com/algo')!.kind, 'external', 'un guion en el dominio no lo hace interno');
assert.equal(t('www.ejemplo.com')!.href, 'https://www.ejemplo.com');
assert.equal(t('sub.dominio.co.uk/ruta?a=1#b')!.href, 'https://sub.dominio.co.uk/ruta?a=1#b');
assert.equal(t('ejemplo.com:8080/x')!.href, 'https://ejemplo.com:8080/x', 'con puerto sigue siendo externo');
assert.deepEqual(t('//cdn.ejemplo.com/foto.jpg'),
  { kind: 'external', href: 'https://cdn.ejemplo.com/foto.jpg', newTab: true });

// ── Dentro del sitio ─────────────────────────────────────────────
// Ninguna dirección de este sitio puede llevar un punto: validatePageSlug sólo
// admite [a-z0-9-]. Por eso distinguir dominio de ruta es exacto, no un truco.
assert.deepEqual(t('/artists'), { kind: 'internal', href: '/artists', newTab: false });
assert.deepEqual(t('artists'), { kind: 'internal', href: '/artists', newTab: false },
  'sin barra delante también es una página suya');
assert.equal(t('past-events')!.href, '/past-events', 'un guion no convierte la ruta en dominio');
assert.equal(t('/form/apply')!.href, '/form/apply');
assert.equal(t('form')!.kind, 'internal');

// ── Ni pestaña nueva ni router ───────────────────────────────────
assert.deepEqual(t('mailto:hola@thecircle.com'),
  { kind: 'external', href: 'mailto:hola@thecircle.com', newTab: false },
  'un correo no se abre en una pestaña en blanco');
assert.equal(t('tel:+34600000000')!.newTab, false);
assert.deepEqual(t('#apply'), { kind: 'external', href: '#apply', newTab: false },
  'un ancla de la misma página no pasa por el router ni abre pestaña');

// ── Lo que nunca puede llegar a un href ──────────────────────────
// No lo va a escribir ella. Pero `pages.blocks` es JSONB y la política deja
// escribir a cualquier usuario autenticado, así que el render desconfía.
assert.equal(t('javascript:alert(1)'), null);
assert.equal(t('JavaScript:alert(1)'), null, 'las mayúsculas no lo cuelan');
assert.equal(t('data:text/html,<script>x</script>'), null);
assert.equal(t('vbscript:msgbox'), null);
assert.equal(t('file:///etc/passwd'), null);
assert.equal(t('blob:https://x/y'), null);

// ── Lo que el panel promete es lo que el render hace ─────────────
// Si el aviso del panel y el render se separan, ella configura una cosa y
// obtiene otra, que es el peor de los fallos porque no se ve.
assert.ok(describeLinkTarget('').includes('enlarges it'), 'vacío explica que sigue habiendo lupa');
assert.ok(describeLinkTarget('javascript:alert(1)').includes('cannot be used'));
assert.ok(describeLinkTarget('instagram.com/x').includes('new tab'));
assert.ok(describeLinkTarget('instagram.com/x').includes('https://instagram.com/x'),
  'le enseña la dirección corregida, no la que escribió');
assert.ok(describeLinkTarget('artists').includes('thecirclevlc.com/artists'));
assert.ok(describeLinkTarget('artists').includes('your own site'));
assert.ok(describeLinkTarget('mailto:a@b.com').includes("visitor's device"));
assert.ok(!describeLinkTarget('mailto:a@b.com').includes('new tab'), 'un correo no promete pestaña nueva');
// Un ancla sólo salta si algo de la página lleva ese nombre, y de momento nada
// lo lleva. Decirlo es mejor que prometer un salto que no ocurre.
assert.ok(describeLinkTarget('#apply').includes('only if one exists'), 'el ancla no se promete sin más');
assert.ok(describeLinkTarget('#apply').includes('apply'), 'le enseña el nombre que buscará');
assert.ok(!describeLinkTarget('#apply').includes('new tab'));

// Ninguna entrada, por rara que sea, hace saltar una excepción.
for (const raw of ['', ' ', '/', '//', '.', '..', 'a', 'a.b', '?x', '#', ':', 'http://', 'https://',
                   'ejemplo', 'ejemplo.', '.com', '-.com', 'ñ.es', '/ruta con espacios']) {
  const out = linkTarget(raw);
  assert.ok(out === null || (typeof out.href === 'string' && out.href.length > 0),
    `entrada rara sin salida válida: ${JSON.stringify(raw)}`);
  assert.doesNotThrow(() => describeLinkTarget(raw));
}

console.log('blockLink OK — 48 casos');
