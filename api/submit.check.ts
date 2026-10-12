// Check ejecutable de lo que /api/submit deja pasar:
//   node api/submit.check.ts
import assert from 'node:assert/strict';
import { cleanData, FORM_KEY } from './submit.ts';

// Solo las preguntas del formulario y el registro de consentimiento.
assert.deepEqual(
  cleanData({ email: 'a@b.co', age: 30, _terms_accepted: 'yes', extra: 'x', _other: 'y' }, ['email', 'age']),
  { email: 'a@b.co', age: '30', _terms_accepted: 'yes' },
);
// Objetos anidados y nulos fuera; cada valor con tope.
assert.deepEqual(cleanData({ email: { $gt: '' }, age: null }, ['email', 'age']), {});
assert.equal(cleanData({ about: 'x'.repeat(9000) }, ['about'])!.about.length, 5000);
// Lo que no es un objeto plano no es un envío.
assert.equal(cleanData(null, ['email']), null);
assert.equal(cleanData('email=a', ['email']), null);
assert.equal(cleanData(['a'], ['email']), null);

// Claves de formulario: las que crea el panel, nada más.
assert.ok(FORM_KEY.test('form_schema_join'));
assert.ok(FORM_KEY.test('form_schema_djmusicians-application'));
assert.equal(FORM_KEY.test('legal_privacy'), false);
assert.equal(FORM_KEY.test('form_schema_'), false);
assert.equal(FORM_KEY.test('form_schema_join,legal_privacy'), false);
assert.equal(FORM_KEY.test('form_schema_JOIN'), false);

console.log('submit OK — 12 casos');
