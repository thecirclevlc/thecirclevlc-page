// Check ejecutable del vocabulario de composición:
//   node lib/blockStyle.check.ts
import assert from 'node:assert/strict';
import {
  sectionClasses, contentClasses, isWordReveal,
  DEFAULT_BLOCK_STYLE, WIDTH_OPTIONS, REVEAL_OPTIONS, SURFACE_OPTIONS,
} from './blockStyle.ts';

// ── Un bloque sin estilo tiene que verse como siempre ────────────
// Es lo que garantiza que las páginas ya creadas no cambien de aspecto.
const bare = sectionClasses(undefined);
assert.ok(bare.includes('px-5'),      'sin estilo mantiene el margen lateral estándar');
assert.ok(bare.includes('py-12'),     'sin estilo mantiene el espaciado normal');
assert.equal(contentClasses(undefined), 'max-w-4xl mx-auto');
assert.deepEqual(sectionClasses({}), bare, 'un estilo vacío es igual que no tener estilo');

// ── Ancho ────────────────────────────────────────────────────────
assert.ok(contentClasses({ width: 'narrow' }).includes('max-w-2xl'));
assert.ok(contentClasses({ width: 'wide' }).includes('max-w-6xl'));
assert.ok(contentClasses({ width: 'full' }).includes('max-w-none'));
// A ancho completo el margen lateral desaparece, o no sería a sangre.
assert.ok(sectionClasses({ width: 'full' }).includes('px-0'));
assert.ok(!sectionClasses({ width: 'full' }).includes('px-5'));

// ── Alineación ───────────────────────────────────────────────────
assert.ok(contentClasses({ align: 'center' }).includes('text-center'));
assert.ok(!contentClasses({ align: 'left' }).includes('text-center'));

// ── Superficie ───────────────────────────────────────────────────
// Invertido tiene que forzar texto negro, o el acento sobre el acento
// se vuelve ilegible.
assert.ok(sectionClasses({ surface: 'invert' }).includes('bg-primary'));
assert.ok(sectionClasses({ surface: 'invert' }).includes('text-black'));
assert.ok(sectionClasses({ surface: 'line' }).includes('border-t'));
assert.ok(!sectionClasses({ surface: 'none' }).includes('bg-primary'));

// ── Espaciado ────────────────────────────────────────────────────
assert.ok(sectionClasses({ spacing: 'tight' }).includes('py-6'));
assert.ok(sectionClasses({ spacing: 'roomy' }).includes('py-20'));

// ── Reveal por palabras ──────────────────────────────────────────
assert.equal(isWordReveal({ reveal: 'words' }), true);
assert.equal(isWordReveal({ reveal: 'fade' }), false);
assert.equal(isWordReveal(undefined), false, 'el defecto no parte en palabras');

// ── Las opciones que ve la clienta cubren los valores del tipo ───
// Si alguien añade un valor y olvida la opción, el mando se queda mudo.
const widthValues  = WIDTH_OPTIONS.map(o => o.value);
const revealValues = REVEAL_OPTIONS.map(o => o.value);
assert.ok(widthValues.includes(DEFAULT_BLOCK_STYLE.width));
assert.ok(revealValues.includes(DEFAULT_BLOCK_STYLE.reveal));
assert.equal(new Set(widthValues).size, widthValues.length, 'sin anchos duplicados');
assert.equal(new Set(revealValues).size, revealValues.length, 'sin entradas duplicadas');
assert.ok(SURFACE_OPTIONS.every(o => o.hint), 'cada superficie explica qué hace');
assert.ok(REVEAL_OPTIONS.every(o => o.hint), 'cada animación explica cuándo usarla');

// Toda combinación produce clases, ninguna cae en undefined.
for (const w of widthValues)
  for (const r of revealValues) {
    const c = sectionClasses({ width: w, reveal: r }) + contentClasses({ width: w });
    assert.ok(!c.includes('undefined'), `combinación rota: ${w}/${r}`);
  }

console.log('blockStyle OK — 26 casos');
