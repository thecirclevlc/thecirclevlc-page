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

console.log('mergeBlock OK — 8 casos');
