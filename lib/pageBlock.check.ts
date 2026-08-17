// Check ejecutable de los bloques vacíos. Node 24 corre TS nativo:
//   node lib/pageBlock.check.ts
// Falla con código != 0 si algo se rompe.
import assert from 'node:assert/strict';
import { newBlock, isBlockEmpty, emptyBlockHint, uuid } from './pageBlock.ts';
import type { PageBlock, PageBlockType } from './database.types.ts';
import { packRows } from './blockStyle.ts';

const TYPES: PageBlockType[] = ['text', 'image', 'gallery', 'video', 'buttons', 'form'];

// ── EL FALLO QUE ESTO PROTEGE ────────────────────────────────────
// La clienta: "traté de agregar algo y se agregó una sección y luego ya no pude
// borrar ese espacio". Un bloque sin contenido no pintaba nada pero seguía
// ocupando su banda: 96px en móvil y 160px en escritorio de página en blanco,
// invisibles, sin nada que clicar para quitarlos. Medido en Chrome.
assert.equal(isBlockEmpty({ id: '1', type: 'image', url: '' }), true, 'una foto sin subir está vacía');
assert.equal(isBlockEmpty({ id: '1', type: 'image', url: '   ' }), true, 'espacios no son una foto');
assert.equal(isBlockEmpty({ id: '1', type: 'image', url: 'https://x/y.jpg' }), false);

assert.equal(isBlockEmpty({ id: '1', type: 'text', heading: '', body: '' }), true);
assert.equal(isBlockEmpty({ id: '1', type: 'text', heading: '  ', body: '\n' }), true, 'sólo espacios sigue vacío');
assert.equal(isBlockEmpty({ id: '1', type: 'text', heading: 'Hola', body: '' }), false, 'un título ya es contenido');
assert.equal(isBlockEmpty({ id: '1', type: 'text', heading: '', body: 'Hola' }), false);

assert.equal(isBlockEmpty({ id: '1', type: 'gallery', images: [] }), true);
assert.equal(isBlockEmpty({ id: '1', type: 'gallery', images: ['', ''] } as PageBlock), true,
  'una galería de huecos está vacía');
assert.equal(isBlockEmpty({ id: '1', type: 'gallery', images: ['/a.jpg'] }), false);

assert.equal(isBlockEmpty({ id: '1', type: 'video', url: '', heading: '' }), true);
assert.equal(isBlockEmpty({ id: '1', type: 'video', url: '', heading: 'Sesión' }), false,
  'un vídeo con título todavía enseña el título');

assert.equal(isBlockEmpty({ id: '1', type: 'buttons', items: [] }), true);
assert.equal(isBlockEmpty({ id: '1', type: 'buttons', items: [{ id: 'b', label: '', url: '' }] }), true,
  'un botón sin texto ni destino no se pinta, así que no cuenta');
assert.equal(isBlockEmpty({ id: '1', type: 'buttons', items: [{ id: 'b', label: 'Donar', url: '' }] }), true,
  'a medio rellenar tampoco se pinta');
assert.equal(isBlockEmpty({ id: '1', type: 'buttons', items: [{ id: 'b', label: 'Donar', url: '/x' }] }), false);

assert.equal(isBlockEmpty({ id: '1', type: 'form', form_slug: '' }), true);
assert.equal(isBlockEmpty({ id: '1', type: 'form', form_slug: 'apply' }), false);

// Un tipo de una versión más nueva del panel no pinta nada aquí. Contarlo como
// lleno dejaría otra vez un hueco misterioso.
assert.equal(isBlockEmpty({ id: '1', type: 'carrusel' } as unknown as PageBlock), true);

// ── Lo que se crea al pulsar "añadir" ────────────────────────────
// Un bloque de texto nace con algo escrito a propósito: lo que acaba de añadir
// tiene que verse, o vuelve al hueco invisible por otro camino.
assert.equal(isBlockEmpty(newBlock('text')), false, 'un texto nuevo se ve nada más crearlo');

// Los demás nacen vacíos por fuerza — no hay foto que inventar — y por eso el
// render los tiene que dibujar como marcador mientras edita.
for (const type of TYPES) {
  const block = newBlock(type);
  assert.equal(block.type, type);
  assert.ok(block.id && block.id.length > 5, `${type} nace con id`);
  assert.doesNotThrow(() => isBlockEmpty(block));
  assert.ok(emptyBlockHint(block).length > 10, `${type} explica qué hacer si está vacío`);
}

// Dos bloques nuevos nunca comparten id: es la clave de React y la de arrastrar.
const ids = new Set([...TYPES, ...TYPES].map(t => newBlock(t).id));
assert.equal(ids.size, TYPES.length * 2, 'cada bloque nuevo tiene su propio id');
assert.notEqual(uuid(), uuid());

// El aviso del marcador nombra siempre una salida: rellenarlo o borrarlo.
for (const type of TYPES) {
  const hint = emptyBlockHint(newBlock(type)).toLowerCase();
  assert.ok(hint.includes('delete') || hint.includes('click'), `${type} dice cómo salir del hueco`);
}

// ── El hueco, medido de punta a punta ────────────────────────────
// Lo que ve un visitante es `blocks` filtrado por esto y repartido en filas.
// Un bloque vacío en medio no puede producir banda, que era justo el fallo:
// 96px en móvil y 160px en escritorio de página en blanco intocable.
const visibles = (list: PageBlock[]) => list.filter(b => !b.hidden && !isBlockEmpty(b));

const conHueco: PageBlock[] = [
  { id: 'a', type: 'text', heading: 'Uno', body: '' },
  { id: 'hueco', type: 'image', url: '' },
  { id: 'b', type: 'text', heading: 'Dos', body: '' },
];
assert.deepEqual(visibles(conHueco).map(b => b.id), ['a', 'b'], 'el bloque vacío no llega a pintarse');
assert.equal(packRows(visibles(conHueco)).length, 2, 'dos bandas, no tres: el hueco desaparece');

// Y si la página entera está a medio hacer, no se pinta ni una banda.
assert.equal(packRows(visibles([newBlock('image'), newBlock('video')])).length, 0,
  'una página de bloques recién añadidos y sin rellenar no deja espacio en blanco');

// Pero editando sí se ven todos, o no habría forma de rellenarlos ni borrarlos.
assert.equal(conHueco.length, 3, 'editando siguen estando los tres');

console.log('pageBlock OK — 44 casos');
