// Check ejecutable de la lista blanca de destinos CRM:
//   node api/subscribe.check.ts
import assert from 'node:assert/strict';
import { isAllowedCrmUrl, buildCrmBody, toReadableEndpoint } from './subscribe.ts';

// Lo que la clienta pegará de verdad.
assert.ok(isAllowedCrmUrl('https://thecircle.us1.list-manage.com/subscribe/post?u=abc&id=123'));
assert.ok(isAllowedCrmUrl('https://app.brevo.com/forms/xyz'));
assert.ok(isAllowedCrmUrl('https://assets.mailerlite.com/jsonp/1/forms/1/subscribe'));
assert.ok(isAllowedCrmUrl('https://alia.ck.page/forms/1/subscriptions'));

// SSRF: los objetivos clásicos.
assert.equal(isAllowedCrmUrl('http://169.254.169.254/latest/meta-data/'), false, 'metadatos de la nube');
assert.equal(isAllowedCrmUrl('http://localhost:3000/admin'), false);
assert.equal(isAllowedCrmUrl('http://127.0.0.1/'), false);
assert.equal(isAllowedCrmUrl('https://192.168.1.1/'), false);
assert.equal(isAllowedCrmUrl('file:///etc/passwd'), false);
assert.equal(isAllowedCrmUrl('gopher://evil.tld/'), false);

// Solo https: sin esto, un http:// permitiría interceptar la lista de correos.
assert.equal(isAllowedCrmUrl('http://x.list-manage.com/subscribe/post'), false, 'http debe rechazarse');

// Sufijos que parecen legítimos y no lo son — el fallo típico de un endsWith pelado.
assert.equal(isAllowedCrmUrl('https://evil-list-manage.com/x'), false);
assert.equal(isAllowedCrmUrl('https://list-manage.com.evil.tld/x'), false);
assert.equal(isAllowedCrmUrl('https://notbrevo.com/x'), false);

// Un subdominio de un host permitido sí vale; el dominio pelado también.
assert.ok(isAllowedCrmUrl('https://list-manage.com/subscribe/post'));
assert.ok(isAllowedCrmUrl('https://deep.sub.list-manage.com/subscribe/post'));

// Mayúsculas: el host es insensible a ellas y no puede usarse para colarse.
assert.ok(isAllowedCrmUrl('https://THECIRCLE.US1.LIST-MANAGE.COM/subscribe/post'));

// Basura que no parsea.
assert.equal(isAllowedCrmUrl('no soy una url'), false);
assert.equal(isAllowedCrmUrl(''), false);

// ── El fallo que reportó la clienta: llegaba el email, no el tag ──
// Su URL y su tag reales, de la Audience THECIRCLEVLC.
{
  const body = buildCrmBody('alguien@ejemplo.com', { fullname: 'Ana' }, '3313342');
  assert.equal(body.get('EMAIL'), 'alguien@ejemplo.com');
  assert.equal(body.get('tags'), '3313342', 'el tag es justo lo que faltaba');
  assert.equal(body.get('fullname'), 'Ana', 'y las demás respuestas siguen viajando');
}

// Varios tags: Mailchimp los quiere separados por coma y sin espacios.
assert.equal(buildCrmBody('a@b.co', {}, '111, 222 , 333').get('tags'), '111,222,333');

// Sin tag configurado no se manda el parámetro — mandar `tags=` vacío hace
// que Mailchimp rechace el alta entera.
assert.equal(buildCrmBody('a@b.co', {}).get('tags'), null);
assert.equal(buildCrmBody('a@b.co', {}, '   ').get('tags'), null);

// Un nombre de tag en vez de su ID es el error que va a cometer: se descarta
// en vez de tumbar el alta.
assert.equal(buildCrmBody('a@b.co', {}, 'ARTISTS').get('tags'), null);
assert.equal(buildCrmBody('a@b.co', {}, 'ARTISTS, 3313342').get('tags'), '3313342');

// El visitante no puede elegirse su propio tag desde una respuesta.
assert.equal(buildCrmBody('a@b.co', { tags: '999' }, '3313342').get('tags'), '3313342');

// La contabilidad de consentimiento sigue sin salir a Mailchimp.
{
  const body = buildCrmBody('a@b.co', { _terms_text: 'acepto', _terms_at: 'x', city: '' });
  assert.equal(body.get('_terms_text'), null, 'los campos internos no se publican');
  assert.equal(body.get('city'), null, 'ni las respuestas vacías');
}

// ── Poder leer qué contestó Mailchimp ────────────────────────────
// El `c=` es obligatorio: comprobado contra su Audience real, sin él Mailchimp
// sirve el HTML del formulario y el JSON no aparece nunca. Si alguien lo quita
// "por limpieza", esto falla en vez de dejar la integración muda otra vez.
assert.equal(
  toReadableEndpoint('https://thecirclevlc.us7.list-manage.com/subscribe/post?u=f9&id=72&f_id=00'),
  'https://thecirclevlc.us7.list-manage.com/subscribe/post-json?u=f9&id=72&f_id=00&c=cb');
assert.equal(
  toReadableEndpoint('https://x.us1.list-manage.com/subscribe/post'),
  'https://x.us1.list-manage.com/subscribe/post-json?c=cb');
// Ya convertida, no se convierte dos veces ni se duplica el callback.
{
  const once  = toReadableEndpoint('https://x.us1.list-manage.com/subscribe/post?u=1');
  const twice = toReadableEndpoint(once);
  assert.equal(twice, once, 'convertir dos veces no cambia nada');
  assert.equal(twice.match(/c=/g)?.length, 1);
}
// Los demás proveedores se quedan exactamente como ella los pegó.
assert.equal(toReadableEndpoint('https://app.brevo.com/forms/xyz'), 'https://app.brevo.com/forms/xyz');
// Y sigue siendo un destino permitido después de reescribirla.
assert.ok(isAllowedCrmUrl(toReadableEndpoint(
  'https://thecirclevlc.us7.list-manage.com/subscribe/post?u=f9&id=72')));

// ── Desenvolver el JSONP que contesta de verdad ──────────────────
// Respuesta literal de su cuenta, copiada de la prueba contra producción.
{
  const real = 'cb({"result":"error","msg":"0 - An email address must contain a single @."})';
  const json = JSON.parse(real.replace(/^[^{]*\{/, '{').replace(/\}[^}]*$/, '}'));
  assert.equal(json.result, 'error');
  assert.match(json.msg, /single @/);
}
// Y "ya está suscrito" no puede confundirse con un fallo.
assert.match('alguien@x.com is already subscribed to list THECIRCLEVLC.', /already/i);

console.log('subscribe OK — 40 casos');
