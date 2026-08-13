// Check ejecutable del cálculo de contraste:
//   node lib/contrast.check.ts
import assert from 'node:assert/strict';
import { contrastRatio, wcagVerdict, luminance } from './contrast.ts';
import { hexToRgb01 } from './cssVar.ts';

const near = (a: number, b: number, tol = 0.02) =>
  assert.ok(Math.abs(a - b) < tol, `esperaba ~${b}, obtuve ${a.toFixed(3)}`);

// ── Anclas conocidas ────────────────────────────────────────────
near(contrastRatio('#000000', '#FFFFFF'), 21);
near(contrastRatio('#FFFFFF', '#FFFFFF'), 1);
assert.equal(contrastRatio('#123456', '#654321'), contrastRatio('#654321', '#123456'),
  'el orden no puede cambiar el resultado');

// ── El caso real: la queja de la clienta, con número ────────────
// El rojo de lanzamiento sobre el fondo del sitio.
near(contrastRatio('#C42121', '#050000'), 3.56, 0.05);
assert.equal(wcagVerdict(contrastRatio('#C42121', '#050000')).pass, false,
  'el rojo original NO pasa AA — es exactamente lo que ella notó');

// El rojo claro del pie sí pasa.
assert.equal(wcagVerdict(contrastRatio('#D95C5C', '#050000')).pass, true);

// El titular invisible que encontramos en App.tsx.
assert.ok(contrastRatio('#330000', '#050000') < 1.5,
  'el titular a #330000 era prácticamente invisible');

// ── Umbrales ────────────────────────────────────────────────────
assert.equal(wcagVerdict(21).label,  'excellent (AAA)');
assert.equal(wcagVerdict(7).label,   'excellent (AAA)');
assert.equal(wcagVerdict(4.5).pass,  true);
assert.equal(wcagVerdict(4.49).pass, false);
assert.equal(wcagVerdict(3).label,   'large headings only');
assert.equal(wcagVerdict(1).label,   'too low — hard to read');

// ── Entradas rotas no pueden reventar el panel ──────────────────
assert.equal(luminance('no soy un color'), 0);
assert.equal(luminance(''), 0);
assert.ok(Number.isFinite(contrastRatio('basura', '#FFFFFF')));

// ── hex → vec3 del shader ───────────────────────────────────────
assert.deepEqual(hexToRgb01('#FFFFFF'), [1, 1, 1]);
assert.deepEqual(hexToRgb01('#000000'), [0, 0, 0]);
const [r, g, b] = hexToRgb01('#C42121');
near(r, 0.769); near(g, 0.129); near(b, 0.129);
// Sin '#' y en minúsculas, que es como puede llegar del selector.
assert.deepEqual(hexToRgb01('ffffff'), [1, 1, 1]);
// Basura → el rojo de marca, nunca negro (un shader negro parecería roto).
assert.deepEqual(hexToRgb01('nope'), [0.769, 0.129, 0.129]);

console.log('contrast + shader OK — 22 casos');
