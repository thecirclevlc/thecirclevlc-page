// Check ejecutable del vocabulario de composición. Node 24 corre TS nativo:
//   node lib/blockStyle.check.ts
// Falla con código != 0 si algo se rompe.
import assert from 'node:assert/strict';
import {
  packRows, rowLayout, rowFill, spanOf, isWordReveal, placeBeside, separate, insertBlocks,
  removeBlock, canPlaceBeside,
  DEFAULT_BLOCK_STYLE, SPAN_OPTIONS, WIDTH_OPTIONS, REVEAL_OPTIONS, SURFACE_OPTIONS,
  type BlockStyle, type BlockSpan,
} from './blockStyle.ts';

const solo = (style?: BlockStyle) => rowLayout([{ style }]);
const spans = (...list: (BlockSpan | undefined)[]) =>
  list.map((span, i) => ({ id: `b${i}`, style: span ? { span } : {} }));

// ── Un bloque sin estilo tiene que verse como siempre ────────────
// Es lo que garantiza que las páginas ya creadas no cambien de aspecto:
// banda con su margen lateral y su aire, y el contenido a la medida normal.
const bare = solo(undefined);
assert.ok(bare.band.includes('px-5'),   'sin estilo mantiene el margen lateral estándar');
assert.ok(bare.band.includes('py-12'),  'sin estilo mantiene el espaciado normal');
assert.ok(bare.band.includes('relative'), 'la banda sigue siendo el contexto de posición');
assert.equal(bare.grid, 'max-w-4xl mx-auto');
assert.deepEqual(bare.cells, [{ outer: '', inner: '' }], 'un bloque solo no lleva clases de celda');
assert.ok(!bare.grid.includes('grid-cols'), 'un bloque solo no monta una rejilla');
assert.deepEqual(solo({}), bare, 'un estilo vacío es igual que no tener estilo');
assert.deepEqual(solo({ span: 'full' }), bare, 'fila entera es el valor por defecto');

// ── Ancho ────────────────────────────────────────────────────────
assert.ok(solo({ width: 'narrow' }).grid.includes('max-w-2xl'));
assert.ok(solo({ width: 'wide' }).grid.includes('max-w-6xl'));
assert.ok(solo({ width: 'full' }).grid.includes('max-w-none'));
// A ancho completo el margen lateral desaparece, o no sería a sangre.
assert.ok(solo({ width: 'full' }).band.includes('px-0'));
assert.ok(!solo({ width: 'full' }).band.includes('px-5'));

// ── Alineación ───────────────────────────────────────────────────
assert.equal(solo({ align: 'center' }).cells[0].inner, 'text-center');
assert.equal(solo({ align: 'left' }).cells[0].inner, '');

// ── Superficie ───────────────────────────────────────────────────
// Invertido tiene que forzar texto negro, o el acento sobre el acento
// se vuelve ilegible.
assert.ok(solo({ surface: 'invert' }).band.includes('bg-primary'));
assert.ok(solo({ surface: 'invert' }).band.includes('text-black'));
assert.ok(solo({ surface: 'line' }).band.includes('border-t'));
assert.ok(!solo({ surface: 'none' }).band.includes('bg-primary'));

// ── Espaciado ────────────────────────────────────────────────────
assert.ok(solo({ spacing: 'tight' }).band.includes('py-6'));
assert.ok(solo({ spacing: 'roomy' }).band.includes('py-20'));

// ── Reveal por palabras ──────────────────────────────────────────
assert.equal(isWordReveal({ reveal: 'words' }), true);
assert.equal(isWordReveal({ reveal: 'fade' }), false);
assert.equal(isWordReveal(undefined), false, 'el defecto no parte en palabras');

// ── Reparto en filas ─────────────────────────────────────────────
// Lo que pidió la clienta: "poner las fotos al lado de los textos y eliminar
// los espacios vacíos". Una foto a media fila seguida de un texto a media
// fila comparten banda; todo lo demás se sigue apilando como antes.
const ids = (rows: { id: string }[][]) => rows.map(r => r.map(b => b.id));

assert.deepEqual(ids(packRows(spans())), [], 'una página vacía no produce filas');
assert.deepEqual(
  ids(packRows(spans(undefined, undefined))),
  [['b0'], ['b1']],
  'sin span cada bloque es su propia banda — el comportamiento de siempre',
);
assert.deepEqual(ids(packRows(spans('half', 'half'))), [['b0', 'b1']], 'dos mitades comparten fila');
assert.deepEqual(
  ids(packRows(spans('half', 'half', 'half'))),
  [['b0', 'b1'], ['b2']],
  'la tercera mitad no cabe y abre fila nueva',
);
assert.deepEqual(ids(packRows(spans('two-thirds', 'third'))), [['b0', 'b1']], 'dos tercios y un tercio llenan la fila');
assert.deepEqual(
  ids(packRows(spans('two-thirds', 'half'))),
  [['b0'], ['b1']],
  'dos tercios y una mitad se pasarían de doce, así que no se juntan',
);
assert.deepEqual(ids(packRows(spans('third', 'third', 'third'))), [['b0', 'b1', 'b2']], 'tres tercios, tres columnas');
assert.deepEqual(
  ids(packRows(spans('half', 'full', 'half'))),
  [['b0'], ['b1'], ['b2']],
  'un bloque a fila entera corta la fila: nunca acompaña a nadie',
);
assert.deepEqual(
  ids(packRows(spans('third', 'third', 'half'))),
  [['b0', 'b1'], ['b2']],
  'la mitad no cabe en los cuatro doceavos que sobran',
);

// EL FALLO QUE ESTO PROTEGE: `blocks` es JSONB. Un span escrito a mano, o por
// una versión más nueva del panel, llega como cualquier cadena — y si se cuela
// en SPAN_CLASS[x] la página entera deja de pintar.
assert.equal(spanOf({ span: 'mitad' as BlockSpan }), 'full', 'un span desconocido cae en fila entera');
assert.equal(spanOf({ span: '' as BlockSpan }), 'full', 'un span vacío cae en fila entera');
assert.equal(spanOf(undefined), 'full');
assert.deepEqual(
  ids(packRows(spans('inventado' as BlockSpan, 'half'))),
  [['b0'], ['b1']],
  'un span basura se trata como fila entera y no arrastra al vecino',
);

// ── Cuánta fila se ocupa, para poder avisar del hueco ────────────
// El panel enseña este número: es la diferencia entre "lo publico y ya veré" y
// saber de antemano dónde queda el espacio vacío que ella quería quitar.
assert.equal(rowFill(spans('full')), 12);
assert.equal(rowFill(spans('half', 'half')), 12, 'dos mitades llenan la fila');
assert.equal(rowFill(spans('two-thirds')), 8, 'dos tercios solo deja un tercio vacío');
assert.equal(rowFill(spans('third', 'third')), 8);
assert.equal(rowFill(spans('two-thirds', 'third')), 12);
assert.equal(rowFill(spans('half')), 6, 'media fila sola deja media vacía');
assert.equal(rowFill([]), 0, 'una fila sin bloques no ocupa nada');
assert.equal(rowFill(spans('basura' as BlockSpan)), 12, 'un span roto cuenta como fila entera');
// Ninguna fila que salga de packRows se pasa de doce. Si esto falla, la rejilla
// desborda y una columna se cae de la pantalla.
for (const row of packRows(spans('half', 'third', 'third', 'two-thirds', 'half', 'full', 'third'))) {
  assert.ok(rowFill(row) <= 12, `fila de ${rowFill(row)} doceavos`);
}

// ── Filas compartidas ────────────────────────────────────────────
const pair   = rowLayout(spans('half', 'half'));
const triple = rowLayout(spans('third', 'third', 'third'));

assert.ok(pair.grid.includes('md:grid-cols-12'), 'una fila compartida monta la rejilla de doce');
assert.ok(pair.grid.includes('grid-cols-1'), 'en móvil las columnas se apilan');
assert.ok(pair.cells.every(c => c.outer.includes('min-w-0')), 'sin min-w-0 una palabra larga tira la rejilla');
assert.ok(pair.cells[0].outer.includes('md:col-span-6'));
assert.ok(rowLayout(spans('two-thirds', 'third')).cells[0].outer.includes('md:col-span-8'));
assert.ok(triple.cells[2].outer.includes('md:col-span-4'));
// El aire y el margen los pone la banda, no cada celda: dos bloques uno al
// lado del otro tienen que respirar como una sola unidad.
assert.ok(pair.band.includes('py-12') && pair.band.includes('px-5'));
assert.ok(pair.cells.every(c => !c.outer.includes('py-')), 'la celda no añade aire vertical propio');
assert.ok(pair.grid.includes('gap-8'), 'las columnas se separan a la escala del aire de la fila');

// Una medida de lectura con dos columnas dentro no se lee. Si no ha elegido
// ancho, una fila compartida se ensancha sola; si lo ha elegido, se respeta.
assert.ok(pair.grid.includes('max-w-6xl'), 'sin ancho elegido, una fila compartida va ancha');
assert.ok(rowLayout(spans('half', 'half').map((b, i) =>
  i === 0 ? { ...b, style: { ...b.style, width: 'narrow' as const } } : b,
)).grid.includes('max-w-2xl'), 'un ancho elegido manda sobre el ensanchado automático');

// Una pareja se centra entre sí — es el caso "foto al lado del texto" y es lo
// que cierra el hueco que deja un párrafo corto. Tres o más son tarjetas.
assert.ok(pair.grid.includes('md:items-center'));
assert.ok(triple.grid.includes('md:items-start'));
assert.ok(!solo(undefined).grid.includes('md:items-'), 'un bloque solo no alinea nada');

// Pero en cuanto una celda tiene fondo es una caja, y dos cajas en la misma
// fila tienen que medir lo mismo de alto. Centrarlas las deja desparejas y
// parece un error, no una decisión.
const boxedPair = rowLayout([{ style: { span: 'half', surface: 'tint' } }, { style: { span: 'half' } }]);
assert.ok(!boxedPair.grid.includes('md:items-center'), 'con fondo se estiran, no se centran');
assert.ok(!boxedPair.grid.includes('md:items-start'));
// El fondo lo puede llevar cualquiera de las dos, no sólo la primera.
const boxedSecond = rowLayout([{ style: { span: 'half' } }, { style: { span: 'half', surface: 'invert' } }]);
assert.ok(!boxedSecond.grid.includes('md:items-center'), 'basta con que una celda sea caja');

// En fila compartida la superficie baja a la celda, para poder teñir un lado
// solo; en un bloque a fila entera sigue cubriendo la banda completa.
const tinted = rowLayout([{ style: { span: 'half', surface: 'tint' } }, { style: { span: 'half' } }]);
assert.ok(tinted.cells[0].outer.includes('bg-primary/[0.04]'), 'la celda teñida lleva su fondo');
assert.ok(tinted.cells[0].outer.includes('p-6'), 'un fondo sin relleno pega el texto al borde');
assert.ok(!tinted.band.includes('bg-primary'), 'la banda no se tiñe entera por una celda');
assert.equal(tinted.cells[1].outer.includes('bg-primary'), false, 'la celda sin superficie queda limpia');

// Un solo bloque a media fila también es fila compartida: usa la rejilla, deja
// libre la mitad derecha, y no se estira a lo ancho.
const lonely = rowLayout(spans('half'));
assert.ok(lonely.grid.includes('md:grid-cols-12'));
assert.ok(lonely.cells[0].outer.includes('md:col-span-6'));

// ── Las opciones que ve la clienta cubren los valores del tipo ───
// Si alguien añade un valor y olvida la opción, el mando se queda mudo.
const spanValues   = SPAN_OPTIONS.map(o => o.value);
const widthValues  = WIDTH_OPTIONS.map(o => o.value);
const revealValues = REVEAL_OPTIONS.map(o => o.value);
assert.ok(spanValues.includes(DEFAULT_BLOCK_STYLE.span));
assert.ok(widthValues.includes(DEFAULT_BLOCK_STYLE.width));
assert.ok(revealValues.includes(DEFAULT_BLOCK_STYLE.reveal));
assert.equal(new Set(spanValues).size, spanValues.length, 'sin reparticiones duplicadas');
assert.equal(new Set(widthValues).size, widthValues.length, 'sin anchos duplicados');
assert.equal(new Set(revealValues).size, revealValues.length, 'sin entradas duplicadas');
assert.ok(SPAN_OPTIONS.every(o => o.hint), 'cada reparto explica para qué sirve');
assert.ok(SURFACE_OPTIONS.every(o => o.hint), 'cada superficie explica qué hace');
assert.ok(REVEAL_OPTIONS.every(o => o.hint), 'cada animación explica cuándo usarla');

// Toda combinación produce clases, ninguna cae en undefined.
for (const span of spanValues)
  for (const w of widthValues)
    for (const r of revealValues) {
      const l = rowLayout([{ style: { span, width: w, reveal: r } }, { style: { span } }]);
      const all = l.band + l.grid + l.cells.map(c => c.outer + c.inner).join('');
      assert.ok(!all.includes('undefined'), `combinación rota: ${span}/${w}/${r}`);
    }


// ── Soltar un bloque al lado de otro ─────────────────────────────
// Lo que pidió la clienta después de probarlo: "no entiendo cómo sería el mover
// la organización para que el texto se mueva y de otro lado esté una imagen...
// requiero que sea más fácil y effortless". Arrastrar la foto al lado del
// párrafo es el gesto entero; la aritmética la hace esto.
const named = (...ids: string[]) => ids.map(id => ({ id, style: {} }));
const seen = (list: { id: string; style?: BlockStyle }[]) =>
  list.map(b => `${b.id}:${spanOf(b.style)}`).join(' ');

// La foto (b) cae a la derecha del texto (a): quedan medias filas, en ese orden.
assert.equal(seen(placeBeside(named('a', 'b'), 'b', 'a', 'right')), 'a:half b:half');
// Y a la izquierda, al otro lado.
assert.equal(seen(placeBeside(named('a', 'b'), 'b', 'a', 'left')), 'b:half a:half');
// Traer uno de lejos también lo coloca al lado, no al final.
assert.equal(seen(placeBeside(named('a', 'b', 'c'), 'c', 'a', 'right')), 'a:half c:half b:full');

// Un tercero que cae sobre una pareja reparte la fila en tres, no deja huérfano.
const pareja = placeBeside(named('a', 'b', 'c'), 'b', 'a', 'right');
assert.equal(seen(placeBeside(pareja, 'c', 'a', 'right')), 'a:third c:third b:third');
// Un cuarto ya no cabe: se rechaza entero en vez de inventar algo.
const trio = placeBeside(pareja, 'c', 'a', 'right');
const cuatro = placeBeside([...trio, { id: 'd', style: {} }], 'd', 'a', 'right');
assert.equal(seen(cuatro), seen([...trio, { id: 'd', style: {} }]), 'un cuarto en la fila no se acepta');

// Entradas imposibles devuelven la lista tal cual, sin romper nada.
assert.equal(seen(placeBeside(named('a', 'b'), 'a', 'a', 'right')), 'a:full b:full', 'soltarse encima de sí mismo no hace nada');
assert.equal(seen(placeBeside(named('a', 'b'), 'zzz', 'a', 'right')), 'a:full b:full', 'un id que no existe no hace nada');

// ── Y deshacerlo ─────────────────────────────────────────────────
// La salida tiene que ser tan fácil como la entrada, o una fila hecha sin
// querer es una fila para siempre.
// pareja es [a:half b:half c:full] y trio es [a:third c:third b:third].
assert.equal(seen(separate(pareja, 'b')), 'a:full b:full c:full', 'separar deshace la pareja del todo');
// El separado baja debajo de su fila, y los dos que quedan se juntan de verdad.
assert.equal(seen(separate(trio, 'c')), 'a:half b:half c:full',
  'al salir uno de tres, los dos que quedan quedan pegados y se reparten la fila');
assert.equal(seen(separate(named('a'), 'a')), 'a:full', 'separar un bloque ya solo no lo estropea');
assert.equal(seen(separate(named('a', 'b'), 'zzz')), 'a:full b:full', 'un id que no existe no toca nada');

// Ninguna fila resultante se pasa de doce, hagas lo que hagas.
for (const l of [pareja, trio, separate(trio, 'c'), placeBeside(trio, 'b', 'c', 'left')])
  for (const row of packRows(l)) assert.ok(rowFill(row) <= 12, `fila de ${rowFill(row)}`);

// ── Insertar una combinación entera ──────────────────────────────
// EL FALLO QUE ESTO PROTEGE: las filas se reparten en avalancha sobre la lista
// plana, así que meter la pareja "Photo + text" justo detrás de un bloque que
// estaba solo a media fila emparejaba la FOTO con ese bloque y dejaba el TEXTO
// tirado en otra fila. Pulsas "foto + texto" y no obtienes foto junto a texto,
// que es la única promesa del botón.
const filas = (l: { id: string; style?: BlockStyle }[]) =>
  packRows(l).map(r => r.map(b => b.id).join('+')).join(' | ');

type Test = { id: string; style: BlockStyle };
const suelto: Test[] = [{ id: 'A', style: { span: 'half' } }];
const pareja2: Test[] = [{ id: 'C', style: { span: 'half' } }, { id: 'D', style: { span: 'half' } }];
assert.equal(filas([...suelto, ...pareja2]), 'A+C | D', 'así se rompía antes');
assert.equal(filas(insertBlocks(suelto, pareja2, 'A')), 'A | C+D',
  'la fila de arriba se cierra y la pareja entra entera');

// Detrás de una fila ya llena no hace falta tocar nada.
const llena: Test[] = [{ id: 'A', style: { span: 'half' } }, { id: 'B', style: { span: 'half' } }];
assert.equal(filas(insertBlocks(llena, pareja2, 'B')), 'A+B | C+D');
assert.deepEqual(insertBlocks(llena, pareja2, 'B').slice(0, 2), llena, 'no toca lo que ya estaba bien');

// Al principio de la página no hay nada que cerrar.
assert.equal(filas(insertBlocks(suelto, pareja2, null)), 'C+D | A');

// Un bloque suelto se inserta sin reordenar nada de lo de arriba.
const uno: Test[] = [{ id: 'X', style: {} }];
assert.deepEqual(insertBlocks(suelto, uno, 'A').map(b => b.id), ['A', 'X']);
assert.equal(spanOf(insertBlocks(suelto, uno, 'A')[0].style), 'half',
  'añadir un solo bloque no reescribe la fila de arriba');

// Un id que ya no existe mete la combinación al final, sin perderla.
assert.deepEqual(insertBlocks(suelto, pareja2, 'zzz').map(b => b.id), ['A', 'C', 'D']);

// Tres tercios detrás de una fila a medias también entran enteros.
const tercios: Test[] = ['C', 'D', 'E'].map(id => ({ id, style: { span: 'third' } }));
assert.equal(filas(insertBlocks(suelto, tercios, 'A')), 'A | C+D+E');

// Y jamás sale una fila de más de doce.
for (const l of [insertBlocks(suelto, pareja2, 'A'), insertBlocks(suelto, tercios, 'A'),
                 insertBlocks(llena, tercios, 'A')])
  for (const row of packRows(l)) assert.ok(rowFill(row) <= 12, `fila de ${rowFill(row)}`);

// ── Arrastrar no puede descolocar lo que ella no tocó ────────────
// EL FALLO QUE ESTO PROTEGE: al sacar un bloque de su fila, los que se quedan
// mantenían su media/tercio, así que esa fila quedaba corta — y el reparto
// avaricioso se tragaba el bloque siguiente para rellenarla. Mover una foto
// movía además una sección que ella no había tocado. Reproducido de verdad:
// [P1a P1b][P2a P2b] soltando P1b a la derecha de P2a daba [P1a P2a][P1b P2b].
const H = (id: string): Test => ({ id, style: { span: 'half' } });
const dosParejas: Test[] = [H('P1a'), H('P1b'), H('P2a'), H('P2b')];

assert.equal(filas(placeBeside(dosParejas, 'P1b', 'P2a', 'right')), 'P1a | P2a+P1b+P2b',
  'la fila de origen se cierra y P1b aterriza a la derecha de P2a');
assert.equal(filas(placeBeside(dosParejas, 'P1b', 'P2a', 'left')), 'P1a | P1b+P2a+P2b',
  'y a la izquierda, del otro lado');
// Nadie más se mueve de fila: P1a se queda donde estaba, ahora a fila entera.
assert.equal(spanOf(placeBeside(dosParejas, 'P1b', 'P2a', 'right')[0].style), 'full');
for (const side of ['left', 'right'] as const)
  for (const row of packRows(placeBeside(dosParejas, 'P1b', 'P2a', side)))
    assert.ok(rowFill(row) === 12, `fila a medias tras arrastrar: ${rowFill(row)}`);

// Mover dentro de la propia fila sólo intercambia los lados.
assert.equal(filas(placeBeside([H('A'), H('B')], 'B', 'A', 'left')), 'B+A');
assert.equal(filas(placeBeside([H('A'), H('B')], 'B', 'A', 'right')), 'A+B');

// ── Lo que no cabe se dice antes, no después ─────────────────────
// Enseñar la barra de "aquí cae" y luego no hacer nada es peor que no dejarla.
const tresAncho: Test[] = ['A', 'B', 'C'].map(id => ({ id, style: { span: 'third' } }));
const conCuarto: Test[] = [...tresAncho, { id: 'D', style: {} }];
assert.equal(canPlaceBeside(conCuarto, 'D', 'A'), false, 'un cuarto no cabe en una fila de tres');
assert.equal(filas(placeBeside(conCuarto, 'D', 'A', 'right')), filas(conCuarto), 'y no hace nada');
assert.equal(canPlaceBeside([H('A'), H('B')], 'B', 'A'), true, 'dentro de la pareja sí cabe');
assert.equal(canPlaceBeside(dosParejas, 'P1b', 'P2a'), true, 'de una pareja a otra, tres caben');
assert.equal(canPlaceBeside(dosParejas, 'P1a', 'P1a'), false, 'sobre sí mismo no');
assert.equal(canPlaceBeside(dosParejas, 'P1a', 'zzz'), false, 'sobre un id que no existe no');

// ── Separar tiene que dejar la página cerrada ────────────────────
// EL FALLO QUE ESTO PROTEGE: sacar el bloque del medio de tres re-anchaba a los
// otros dos a mitad... pero el bloque separado seguía FÍSICAMENTE entre ellos,
// así que no podían juntarse y quedaban dos filas a medias. Ahora baja debajo.
assert.equal(filas(separate(tresAncho, 'B')), 'A+C | B',
  'el de en medio baja y los otros dos se juntan');
assert.equal(filas(separate(tresAncho, 'A')), 'B+C | A');
assert.equal(filas(separate([H('A'), H('B')], 'A')), 'B | A', 'de una pareja salen dos filas enteras');
for (const id of ['A', 'B', 'C'])
  for (const row of packRows(separate(tresAncho, id)))
    assert.ok(rowFill(row) === 12, `separar dejó una fila a medias: ${rowFill(row)}`);

// ── Borrar tampoco puede dejar hueco ─────────────────────────────
// Borrar la mitad de una pareja dejaba a la superviviente a media fila con la
// otra media en blanco para siempre: el hueco que ella pidió quitar, devuelto
// por el botón de borrar.
assert.equal(filas(removeBlock([H('A'), H('B')], 'B')), 'A', 'la superviviente recupera la fila entera');
assert.equal(spanOf(removeBlock([H('A'), H('B')], 'B')[0].style), 'full');
assert.equal(filas(removeBlock(tresAncho, 'B')), 'A+C', 'de tres a dos, mitades');
assert.equal(removeBlock([H('A'), H('B')], 'zzz').length, 2, 'un id que no existe no borra nada');
assert.equal(removeBlock([H('A')], 'A').length, 0);
for (const row of packRows(removeBlock(tresAncho, 'B')))
  assert.ok(rowFill(row) === 12, 'borrar dejó una fila a medias');

console.log('blockStyle OK — 136 casos');
