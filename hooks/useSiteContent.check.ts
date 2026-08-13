// Check ejecutable de mergeBlock. Node 24 corre TS nativo:
//   node hooks/useSiteContent.check.ts
// Falla con código != 0 si la fusión se rompe.
import assert from 'node:assert/strict';
import { mergeBlock } from '../lib/mergeBlock.ts';

const CTA = { title: 'DON\'T MISS THE NEXT CHAPTER', subtitle: 'The next Circle is forming.' };

// El bug real: la fila de producción content_cta_events solo tiene 'title'.
assert.deepEqual(
  mergeBlock(CTA, { title: 'NUEVO TITULAR' }),
  { title: 'NUEVO TITULAR', subtitle: CTA.subtitle },
  'un campo guardado no puede vaciar a sus hermanos',
);

// Fila ausente → defaults enteros.
assert.deepEqual(mergeBlock(CTA, null), CTA);
assert.deepEqual(mergeBlock(CTA, undefined), CTA);

// Fila completa → gana la BD en todos los campos.
const full = { title: 'A', subtitle: 'B' };
assert.deepEqual(mergeBlock(CTA, full), full);

// Un null guardado no debe blanquear el default.
assert.deepEqual(mergeBlock(CTA, { title: null }), CTA);

// Cadena vacía SÍ es una edición válida: la clienta puede querer vaciar un campo.
assert.deepEqual(mergeBlock(CTA, { subtitle: '' }), { title: CTA.title, subtitle: '' });

// Los arrays se sustituyen enteros, no se fusionan elemento a elemento.
const schema = { title: 'JOIN', fields: [{ id: 'a' }, { id: 'b' }] };
assert.deepEqual(
  mergeBlock(schema, { fields: [{ id: 'z' }] }),
  { title: 'JOIN', fields: [{ id: 'z' }] },
  'borrar un campo del formulario no puede resucitarlo desde el default',
);

// Valor almacenado que no es objeto → se devuelve tal cual.
assert.equal(mergeBlock({ a: 1 } as unknown, 'texto'), 'texto');

// ── Grupos anidados ─────────────────────────────────────────────
// EL BUG QUE ESTO PROTEGE: la fila real de site_theme guardaba
// { background: { style: 'none' } } y la fusión superficial devolvía ese
// objeto tal cual, dejando density/weight/speed/intensity sin definir.
// Eso llegaba al shader como gl.uniform4f(NaN) y no pintaba nada.
const TEMA = {
  primary_color: '#C42121', bg_color: '#050000', font: 'poppins', type_scale: 1,
  background: { style: 'grid', density: 40, weight: 0.02, speed: 5, intensity: 0.2 },
};
const parcial = mergeBlock(TEMA, { font: 'syne', background: { style: 'none' } });
assert.equal(parcial.background.style, 'none', 'lo guardado gana');
assert.equal(parcial.background.density, 40, 'los hermanos sobreviven');
assert.equal(parcial.background.intensity, 0.2);
assert.equal(parcial.font, 'syne');
assert.equal(parcial.primary_color, '#C42121');

// El anidado sigue respetando las reglas del nivel de arriba.
assert.equal(mergeBlock(TEMA, { background: { density: null } }).background.density, 40,
  'un null anidado tampoco borra su default');
assert.deepEqual(mergeBlock(TEMA, { background: {} }).background, TEMA.background,
  'un grupo vacío deja el default intacto');

// Los arrays se siguen sustituyendo enteros, también dentro de un anidado.
assert.deepEqual(
  mergeBlock({ a: { list: [1, 2, 3] } }, { a: { list: [9] } }),
  { a: { list: [9] } },
  'los arrays no se fusionan elemento a elemento');

console.log('mergeBlock OK — 15 casos');
