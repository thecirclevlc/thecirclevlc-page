// Check ejecutable del gesto de arrastrar. Node 24 corre TS nativo:
//   node hooks/useDragList.check.ts
// Falla con código != 0 si algo se rompe.
import assert from 'node:assert/strict';
import { zoneAt, reorder } from './useDragList.ts';

// ── En qué parte del bloque se suelta ────────────────────────────
// Se mide el DESPLAZAMIENTO LATERAL desde donde agarró, no la posición cruda.
const r = { left: 0, width: 1000 };

// EL FALLO QUE ESTO PROTEGE: el asa vive en un borde del bloque, así que el
// puntero arranca pegado a ese borde y ahí sigue al arrastrar en vertical. Con
// la posición cruda, el puntero caía siempre en el mismo tercio del que salió,
// y en el panel TODO arrastre de reordenar salía como "ponlos uno al lado del
// otro". Agarrando por el asa de la izquierda y bajando recto:
const asaIzquierda = { offsetX: 10, width: 1000 };
assert.equal(zoneAt(10, r, asaIzquierda), 'over', 'bajar recto reordena, no empareja');
assert.equal(zoneAt(0, r, asaIzquierda), 'over', 'un pelín a la izquierda tampoco empareja');
// Y con el asa a la derecha, que es donde está en la página en vivo:
const asaDerecha = { offsetX: 990, width: 1000 };
assert.equal(zoneAt(990, r, asaDerecha), 'over', 'bajar recto desde la derecha también reordena');

// Para emparejar hay que moverse de verdad hacia un lado.
assert.equal(zoneAt(400, r, asaIzquierda), 'right', 'moverse a la derecha sí empareja');
assert.equal(zoneAt(700, r, asaIzquierda), 'right');
assert.equal(zoneAt(600, r, asaDerecha), 'left', 'desde la derecha, moverse a la izquierda empareja');
assert.equal(zoneAt(200, r, asaDerecha), 'left');

// Agarrando por el centro se comporta como antes: los tercios de siempre.
const centro = { offsetX: 500, width: 1000 };
assert.equal(zoneAt(500, r, centro), 'over');
assert.equal(zoneAt(200, r, centro), 'left');
assert.equal(zoneAt(800, r, centro), 'right');

// El bloque no empieza en cero: la banda tiene margen lateral.
const off = { left: 300, width: 400 };
assert.equal(zoneAt(500, off, centro), 'over', 'se mide desde el borde del bloque, no de la pantalla');
assert.equal(zoneAt(690, off, centro), 'right');

// Sin datos del agarre se toma el centro, que es lo mismo que no haberse movido.
assert.equal(zoneAt(500, r), 'over');
assert.equal(zoneAt(100, r), 'left');
assert.equal(zoneAt(900, r), 'right');

// Nada de esto puede reventar ni dividir por cero.
assert.equal(zoneAt(-50, r, centro), 'left');
assert.equal(zoneAt(9999, r, centro), 'right');
assert.equal(zoneAt(0, { left: 0, width: 0 }, centro), 'over', 'sin ancho no se inventa un lado');
// Un agarre de ancho cero es dato degenerado: se comporta como si no hubiera
// agarre, midiendo desde el centro. Lo importante es que no reviente ni invente.
assert.equal(zoneAt(0, r, { offsetX: 0, width: 0 }), zoneAt(0, r), 'un agarre sin ancho cae al comportamiento por defecto');
assert.equal(zoneAt(500, r, { offsetX: 0, width: 0 }), 'over');

// ── Reordenar ────────────────────────────────────────────────────
const l = ['a', 'b', 'c', 'd'];
assert.deepEqual(reorder(l, 0, 2), ['b', 'c', 'a', 'd'], 'bajar mete el bloque en esa posición');
assert.deepEqual(reorder(l, 3, 1), ['a', 'd', 'b', 'c'], 'subir también');
assert.deepEqual(reorder(l, 1, 1), l, 'soltarse en su sitio no cambia nada');
assert.deepEqual(reorder(l, -1, 2), l, 'un índice que no existe no toca la lista');
assert.deepEqual(reorder(l, 0, 99), l);
assert.deepEqual(reorder([], 0, 0), [], 'una página vacía aguanta');
// La original no se toca: la lista viene del estado de React.
const original = ['a', 'b', 'c'];
reorder(original, 0, 2);
assert.deepEqual(original, ['a', 'b', 'c'], 'reorder no muta lo que le pasan');

console.log('useDragList OK — 31 casos');
