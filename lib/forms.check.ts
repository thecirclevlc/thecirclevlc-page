// Check ejecutable de la lógica de formularios múltiples. Node 24 corre TS nativo:
//   node lib/forms.check.ts
// Falla con código != 0 si algo se rompe.
import assert from 'node:assert/strict';
import {
  formPath, formKeyForSlug, slugFromFormKey,
  isFieldBlank, uniqueFormSlug,
  DEFAULT_FORM_SLUG,
} from './database.types.ts';
import { slugify } from './slugify.ts';

// ── Rutas ────────────────────────────────────────────────────────
// /form debe seguir funcionando: hay enlaces vivos apuntando ahí.
assert.equal(formPath(DEFAULT_FORM_SLUG), '/form');
assert.equal(formPath('artists'), '/form/artists');

// La clave y el slug tienen que ser reversibles, o el buzón no sabe
// de qué formulario viene cada respuesta.
for (const slug of ['join', 'artists', 'djs', 'who-we-are']) {
  assert.equal(slugFromFormKey(formKeyForSlug(slug)), slug, `ida y vuelta rota para "${slug}"`);
}

// ── Validación de obligatorio ────────────────────────────────────
const cb = { type: 'checkbox' as const };
const txt = { type: 'text' as const };

// EL BUG QUE ESTO PROTEGE: 'no' es una cadena no vacía. Con un !v.trim()
// pelado, una casilla obligatoria sin marcar pasaba la validación.
assert.equal(isFieldBlank(cb, 'no'), true,  'casilla sin marcar debe contar como vacía');
assert.equal(isFieldBlank(cb, 'yes'), false, 'casilla marcada debe contar como rellena');
assert.equal(isFieldBlank(cb, ''),   true);
assert.equal(isFieldBlank(txt, 'no'), false, 'el texto "no" es una respuesta válida');
assert.equal(isFieldBlank(txt, '   '), true, 'solo espacios cuenta como vacío');
assert.equal(isFieldBlank(txt, ''),   true);

// ── Slugs únicos ─────────────────────────────────────────────────
// EL BUG QUE ESTO PROTEGE: reutilizar un slug sobrescribe la fila del
// formulario existente y lo destruye sin avisar.
assert.equal(uniqueFormSlug('Artists', [], slugify), 'artists');
assert.equal(uniqueFormSlug('Artists', ['artists'], slugify), 'artists-2');
assert.equal(uniqueFormSlug('Artists', ['artists', 'artists-2'], slugify), 'artists-3');

// Un nombre que slugify vacía no puede devolver cadena vacía: sería la
// clave 'form_schema_', que colisiona con el prefijo.
assert.equal(uniqueFormSlug('???', [], slugify), 'form');
assert.equal(uniqueFormSlug('!!!', ['form'], slugify), 'form-2');

// Acentos y mayúsculas, que es como los va a escribir la clienta.
assert.equal(uniqueFormSlug('Solicitud de Artistas', [], slugify), 'solicitud-de-artistas');

// Nunca puede chocar con el formulario principal por accidente.
assert.notEqual(uniqueFormSlug('Join', ['join'], slugify), DEFAULT_FORM_SLUG);

console.log('forms OK — 18 casos');
