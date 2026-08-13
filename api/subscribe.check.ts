// Check ejecutable de la lista blanca de destinos CRM:
//   node api/subscribe.check.ts
import assert from 'node:assert/strict';
import { isAllowedCrmUrl } from './subscribe.ts';

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

console.log('subscribe OK — 19 casos');
