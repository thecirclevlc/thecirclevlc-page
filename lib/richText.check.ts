// Check ejecutable del dialecto de texto:
//   node lib/richText.check.ts
import assert from 'node:assert/strict';
import { parseRichText, parseBold } from './richText.ts';

// ── EL FALLO REAL, tal cual estaba en producción ─────────────────
// Página "call-to-action-paris". Ella lo escribió correctamente y salía
// "We're open to: - Painters - Visual artists - Digital artists…" en una
// sola línea corrida.
{
  const nodes = parseRichText(
    "We're open to:\n- Painters\n- Visual artists\n- Digital artists");
  assert.equal(nodes.length, 2, 'la línea de entrada y la lista son dos cosas');
  assert.equal(nodes[0].kind, 'p');
  assert.deepEqual((nodes[0] as any).lines, ["We're open to:"]);
  assert.equal(nodes[1].kind, 'ul');
  assert.deepEqual((nodes[1] as any).items, ['Painters', 'Visual artists', 'Digital artists']);
}

// ── Y el texto de ejemplo que yo mismo dejé en "Who We Are" ──────
// Tampoco pintaba viñetas, que es lo que enseñaba a la clienta a escribirlas.
{
  const nodes = parseRichText(
    '**Replace this text with your own.** A blank line starts a new paragraph.\n'
    + '- a line starting with a dash becomes a bullet\n'
    + '- and **double stars** make text bold');
  assert.equal(nodes.length, 2);
  assert.equal(nodes[1].kind, 'ul');
  assert.equal((nodes[1] as any).items.length, 2);
}

// ── Saltos de línea sueltos ──────────────────────────────────────
// Tres frases en tres líneas se veían como una sola corrida.
{
  const nodes = parseRichText(
    "You don't need to be established.\nYou don't need thousands of followers.");
  assert.equal(nodes.length, 1);
  assert.deepEqual((nodes[0] as any).lines.length, 2, 'sus saltos de línea se respetan');
}

// ── Lo que ya funcionaba tiene que seguir funcionando ────────────
{
  const nodes = parseRichText('Uno\n\nDos');
  assert.equal(nodes.length, 2, 'la línea en blanco sigue separando párrafos');
  assert.deepEqual((nodes[0] as any).lines, ['Uno']);

  const solo = parseRichText('- a\n- b');
  assert.equal(solo.length, 1);
  assert.equal(solo[0].kind, 'ul', 'una lista suelta sigue siendo una lista');
}

// ── Volver a texto después de una lista ──────────────────────────
{
  const nodes = parseRichText('Intro:\n- uno\n- dos\nY seguimos hablando.');
  assert.deepEqual(nodes.map(n => n.kind), ['p', 'ul', 'p'],
    'un párrafo después de la lista no se cuela dentro de ella');
}

// ── Guion, asterisco y bolo valen como viñeta ────────────────────
{
  assert.equal(parseRichText('- a')[0].kind, 'ul');
  assert.equal(parseRichText('* a')[0].kind, 'ul');
  assert.equal(parseRichText('• a')[0].kind, 'ul');
  // Un guion sin espacio detrás es un guion, no una viñeta: "-5 grados".
  assert.equal(parseRichText('-5 grados')[0].kind, 'p');
  // Y una resta a mitad de frase tampoco.
  assert.equal(parseRichText('Valencia - Madrid')[0].kind, 'p');
}

// ── Bordes ───────────────────────────────────────────────────────
assert.deepEqual(parseRichText(''), []);
assert.deepEqual(parseRichText('\n\n\n'), []);
assert.deepEqual(parseRichText(undefined as any), []);
assert.equal(parseRichText('   \n  hola  ')[0].kind, 'p');
assert.deepEqual((parseRichText('  hola  ')[0] as any).lines, ['hola']);

// ── Negrita ──────────────────────────────────────────────────────
assert.deepEqual(parseBold('hola'), [{ text: 'hola', bold: false }]);
assert.deepEqual(parseBold('**hola**'), [{ text: 'hola', bold: true }]);
assert.deepEqual(
  parseBold('a **b** c'),
  [{ text: 'a ', bold: false }, { text: 'b', bold: true }, { text: ' c', bold: false }]);
assert.deepEqual(parseBold(''), [], 'sin texto no hay tramos vacíos que pintar');
// Asteriscos sueltos se quedan como están en vez de comerse la frase.
assert.deepEqual(parseBold('2 ** 3'), [{ text: '2 ** 3', bold: false }]);

console.log('richText OK — 26 casos');
