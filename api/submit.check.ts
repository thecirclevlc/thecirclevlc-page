// Check ejecutable de lo que /api/submit deja pasar:
//   node api/submit.check.ts
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanData, FORM_KEY, resolveSchema, DEFAULT_FIELDS } from './submit.ts';

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

// El formulario que pinta la página, también sin fila en site_settings.
assert.deepEqual(resolveSchema('form_schema_join', null), { fields: DEFAULT_FIELDS, captcha: true });
assert.deepEqual(resolveSchema('form_schema_newsletter', undefined), { fields: ['email'], captcha: true });
assert.equal(resolveSchema('form_schema_otro', null), null);
assert.deepEqual(resolveSchema('form_schema_otro', { name: 'X' }), { fields: DEFAULT_FIELDS, captcha: true });
assert.deepEqual(
  resolveSchema('form_schema_otro', { captcha_required: false, fields: [{ name: 'email' }] }),
  { fields: ['email'], captcha: false },
);
assert.equal(resolveSchema('form_schema_join', { captcha_required: null })!.captcha, true);

// DEFAULT_FIELDS = las preguntas de DEFAULT_FORM_SCHEMA (solo ese bloque:
// blankFormSchema, debajo, también tiene líneas id: 'f-…').
const src = readFileSync(new URL('../lib/formSchema.ts', import.meta.url), 'utf8');
const block = src.slice(src.indexOf('export const DEFAULT_FORM_SCHEMA'));
const fields = [...block.slice(0, block.indexOf('\n};')).matchAll(/id: 'f-[\w-]+',\s*name:\s*'(\w+)'/g)].map(m => m[1]);
assert.deepEqual(fields, DEFAULT_FIELDS, 'DEFAULT_FIELDS ya no coincide con DEFAULT_FORM_SCHEMA');

console.log('submit OK — 20 casos');
