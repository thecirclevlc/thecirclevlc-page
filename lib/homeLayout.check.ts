// Check ejecutable del orden de la portada:
//   node lib/homeLayout.check.ts
import assert from 'node:assert/strict';
import {
  HOME_SECTIONS, DEFAULT_HOME_LAYOUT, resolveHomeOrder, visibleHomeOrder,
  type PageBlock,
} from './database.types.ts';

const ALL = HOME_SECTIONS.map(s => s.id);
const block = (id: string): PageBlock => ({ id, type: 'text', body: '' });

// ── Sin nada guardado, la portada es exactamente la de hoy ───────
assert.deepEqual(resolveHomeOrder(DEFAULT_HOME_LAYOUT), ALL);
assert.deepEqual(visibleHomeOrder(DEFAULT_HOME_LAYOUT), ALL);
assert.deepEqual(resolveHomeOrder({ order: [], hidden: [], blocks: [] }), ALL,
  'un orden vacío no deja la portada en blanco');

// ── Reordenar ────────────────────────────────────────────────────
const swapped = { order: ['events', ...ALL.filter(id => id !== 'events')], hidden: [], blocks: [] };
assert.equal(resolveHomeOrder(swapped)[0], 'events');
assert.equal(resolveHomeOrder(swapped).length, ALL.length, 'reordenar no pierde ni duplica');
assert.equal(new Set(resolveHomeOrder(swapped)).size, ALL.length, 'sin duplicados');

// ── Ocultar ──────────────────────────────────────────────────────
const hid = { order: ALL, hidden: ['marquee'], blocks: [] };
assert.ok(!visibleHomeOrder(hid).includes('marquee'));
assert.ok(resolveHomeOrder(hid).includes('marquee'),
  'oculta sigue en el orden: al volver a encenderla recupera su sitio');
assert.equal(visibleHomeOrder(hid).length, ALL.length - 1);
assert.deepEqual(visibleHomeOrder({ order: ALL, hidden: ALL, blocks: [] }), [],
  'puede apagarlo todo — es su decisión, no un error');

// ── El caso que rompe solo: una sección nueva en el código ───────
// Su orden guardado es una foto de las secciones que existían al guardar.
// Sin esto, añadir una sección la haría invisible en producción y nadie
// vería un error en ninguna parte.
const oldSave = { order: ALL.slice(0, 3), hidden: [], blocks: [] };
assert.deepEqual(resolveHomeOrder(oldSave), ALL,
  'las secciones que ella nunca guardó se añaden al final, no desaparecen');
assert.equal(resolveHomeOrder(oldSave).slice(0, 3).join(), ALL.slice(0, 3).join(),
  'y su orden guardado se respeta delante');

// ── Bloques propios ──────────────────────────────────────────────
const withBlock = { order: ['hero', 'b-1', ...ALL.slice(1)], hidden: [], blocks: [block('b-1')] };
assert.equal(resolveHomeOrder(withBlock)[1], 'b-1', 'un bloque suyo se intercala donde ella lo puso');
assert.equal(resolveHomeOrder(withBlock).length, ALL.length + 1);

const orphan = { order: ['hero', 'b-borrado', ...ALL.slice(1)], hidden: [], blocks: [] };
assert.ok(!resolveHomeOrder(orphan).includes('b-borrado'),
  'un bloque borrado no deja un hueco fantasma');
assert.deepEqual(resolveHomeOrder(orphan), ALL);

const unsaved = { order: ALL, hidden: [], blocks: [block('b-nuevo')] };
assert.ok(resolveHomeOrder(unsaved).includes('b-nuevo'),
  'un bloque añadido sin reordenar sale igualmente');

console.log('homeLayout OK — 17 casos');
