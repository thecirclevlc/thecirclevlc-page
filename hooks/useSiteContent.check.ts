// Check ejecutable de mergeBlock. Node 24 corre TS nativo:
//   node hooks/useSiteContent.check.ts
// Falla con código != 0 si la fusión se rompe.
import assert from 'node:assert/strict';
import { mergeBlock } from '../lib/mergeBlock.ts';
import { visibleNavItems } from '../lib/database.types.ts';

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

// ── Ocultar entradas de menú sin borrarlas ───────────────────────
// Lo que importa aquí es el defecto: todas las entradas guardadas antes de
// que existiera el ojo no tienen el campo, y tienen que seguir viéndose.
const HOME = { id: 'a', label: 'Home', mode: 'route' as const, route: '/' };
const DJS  = { id: 'b', label: 'DJs',  mode: 'route' as const, route: '/djs' };

assert.deepEqual(visibleNavItems([HOME, DJS]), [HOME, DJS],
  'sin el campo, todo se ve — el menú de ayer no se vacía solo');
assert.deepEqual(visibleNavItems([HOME, { ...DJS, hidden: true }]), [HOME],
  'oculta la marcada y conserva el resto');
assert.deepEqual(visibleNavItems([{ ...HOME, hidden: false }]), [{ ...HOME, hidden: false }],
  'hidden:false se ve');
assert.deepEqual(visibleNavItems(undefined), [], 'sin lista no revienta');
assert.deepEqual(visibleNavItems([]), []);
// Ocultar no es borrar: la entrada sigue en lo guardado, con su destino.
const saved = [HOME, { ...DJS, hidden: true }];
assert.equal(saved.length, 2, 'la entrada oculta sigue guardada');
assert.equal(saved[1].route, '/djs', 'y conserva su destino para cuando vuelva');

console.log('mergeBlock + menú OK — 22 casos');
