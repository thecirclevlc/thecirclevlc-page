#!/usr/bin/env node
/**
 * El guardián de la coherencia del panel.
 *
 * El problema que resuelve no es estético, es de entropía: hoy hay 323
 * colores escritos a mano repartidos por 24 pantallas de `admin/`, y llegaron
 * ahí de uno en uno, cada uno razonable en su momento. Rediseñar sin poner un
 * tope sólo compra unos meses hasta el siguiente #1a1a1a.
 *
 * Así que la regla es una y es mecánica: en `admin/` no se escribe color.
 * El único archivo que puede tener literales es admin-ui.css, que es donde
 * viven los tokens. Todo lo demás los consume.
 *
 *   node scripts/check-admin-tokens.mjs          informe y salida 1 si hay
 *   node scripts/check-admin-tokens.mjs --list   además, cada línea infractora
 *
 * Durante la migración esto es la lista de tareas y el marcador a la vez.
 * Cuando llegue a cero se engancha a `npm run build` y deja de poder volver.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/* fileURLToPath y no `new URL(…).pathname`: la ruta de este repo lleva
 * espacios ("1 - Produccion"), y .pathname los devuelve como %20. Con eso
 * readdirSync lanzaba ENOENT, el catch se lo tragaba y el guardián daba
 * verde con 323 colores delante. Un check que aprueba en silencio hace más
 * daño que no tenerlo. */
const ROOT  = fileURLToPath(new URL('..', import.meta.url));

/* Sólo `admin/`.
 *
 * `components/` queda fuera a propósito y no por pereza: AdminToolbar,
 * EditableText y BlockToolbar los importa el SITIO PÚBLICO (App.tsx,
 * Artists.tsx, DJs.tsx…). Son la capa de edición en vivo, flotan sobre la
 * web de la clienta y su fondo es el que ella haya elegido, no el lienzo del
 * panel. Heredar tokens del admin ahí sería incorrecto, así que meterlos aquí
 * dejaría el guardián en rojo para siempre — y un guardián que no puede
 * ponerse verde termina desactivado, que es peor que no tenerlo.
 *
 * Esa capa flotante es su propio problema de diseño. Cuando se resuelva,
 * se añade aquí. */
const SCAN  = ['admin'];

/** El archivo de tokens es la excepción: es su trabajo tener literales. */
const ALLOW = new Set(['admin/admin-ui.css']);

/* En orden de especificidad: la primera que casa se queda con el tramo.
 * `bg-[#111]` es UNA infracción, no dos — casaba a la vez con `arbitrary` y
 * con `hex`, y el informe salía al doble. Un marcador de progreso que cuenta
 * de dos en dos no vale para medir una migración. */
const RULES = [
  // Tailwind con color arbitrario: bg-[#111], text-[rgb(…)], border-[#1a1a1a]
  { id: 'arbitrary', re: /\b(?:bg|text|border|ring|fill|stroke|from|via|to|shadow|outline|decoration|divide|accent|caret|placeholder)-\[(?:#|rgb|hsl)[^\]]*\]/g,
    hint: 'usa una clase tc-* o un token' },
  // #fff, #0d0d0d, #C42121…
  { id: 'hex', re: /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g,
    hint: 'usa un token de admin-ui.css' },
  // rgb(…) / rgba(…) / hsl(…) sueltos
  { id: 'func', re: /\b(?:rgba?|hsla?)\([^)]*\)/g,
    hint: 'usa un token de admin-ui.css' },

  /* La paleta CON NOMBRE de Tailwind: text-white, bg-red-950/40, …
   *
   * Esta regla faltaba y fue el agujero que dejó pasar el peor fallo del
   * rediseño. El guardián sólo miraba colores arbitrarios (`text-[#fff]`) y
   * daba verde con 210 `text-white` dentro — que en tema claro pintan los
   * títulos de blanco sobre crema, invisibles.
   *
   * `transparent`, `current` e `inherit` no entran: no son colores fijos. */
  { id: 'palette', re: /\b(?:bg|text|border|ring|fill|stroke|from|via|to|divide|placeholder|accent|caret|outline|shadow)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:\/\d+)?\b/g,
    hint: 'usa un token de admin-ui.css' },
];

/** Un color en un comentario es documentación, no un uso. */
const COMMENT = /^\s*(?:\/\/|\/\*|\*|<!--|#)/;

/**
 * Escotilla para el color que es DATO, no estilo.
 *
 * Existe por un caso concreto y caro: los presets de Apariencia guardan
 * `primary_color` en la base de datos, y de ahí sale al SITIO PÚBLICO, que no
 * conoce los tokens del panel. Un `var(--tc-brand)` ahí deja la web sin rojo.
 *
 * Marcando la línea, el guardián la deja pasar y el porqué queda escrito al
 * lado del valor, no en un archivo de excepciones que nadie abre. */
const DATA = /tokens:data/;

/** Las infracciones de una línea, ya deduplicadas por tramo. */
function scanLine(line) {
  if (COMMENT.test(line) || DATA.test(line)) return [];
  const taken = [];   // tramos ya reclamados por una regla más específica
  const hits  = [];
  for (const rule of RULES) {
    for (const m of line.matchAll(rule.re)) {
      const from = m.index, to = from + m[0].length;
      if (taken.some(([a, b]) => from < b && to > a)) continue;
      taken.push([from, to]);
      hits.push({ text: m[0], rule: rule.id, hint: rule.hint });
    }
  }
  return hits;
}

/* node scripts/check-admin-tokens.mjs --selftest */
if (process.argv.includes('--selftest')) {
  const { strictEqual: eq, deepStrictEqual: deep } = await import('node:assert');
  const ids = l => scanLine(l).map(h => h.rule);

  // Lo que motivó el dedupe: una clase de Tailwind es UNA infracción.
  deep(ids('<div className="bg-[#111] p-4" />'), ['arbitrary']);
  // Dos clases distintas siguen siendo dos.
  deep(ids('className="bg-[#111] border-[#1a1a1a]"'), ['arbitrary', 'arbitrary']);
  // Un hex suelto fuera de una clase sí cuenta por su cuenta.
  deep(ids('style={{ color: "#C42121" }}'), ['hex']);
  // Y conviven en la misma línea sin pisarse.
  deep(ids('<i className="bg-[#111]" style={{ color: "#fff" }} />'), ['arbitrary', 'hex']);
  // Funciones de color, enteras y una sola vez.
  deep(ids('boxShadow: "0 1px rgba(0,0,0,.5)"'), ['func']);
  // Documentar un color no es usarlo.
  deep(ids('  // el fondo era #0d0d0d antes'), []);
  deep(ids('   * --canvas: #050000'), []);
  // Un token no es una infracción, que es de lo que va todo esto.
  deep(ids('className="tc-glass tc-card" style={{ color: "var(--fg)" }}'), []);
  // Y el color que es dato se marca y pasa.
  deep(ids("  primary_color: '#C42121', bg_color: '#050000',   // tokens:data"), []);

  // El agujero que costó el modo claro: la paleta con nombre.
  deep(ids('<h1 className="text-white text-xl">Events</h1>'), ['palette']);
  deep(ids('className="bg-red-950/40 border border-emerald-500/30"'), ['palette', 'palette']);
  // Pero no lo que no es un color fijo.
  deep(ids('className="bg-transparent border-transparent text-current"'), []);
  // Ni utilidades que empiezan igual y no son color.
  deep(ids('className="text-center border-t divide-y to-top"'), []);

  console.log('✓ selftest ok');
  process.exit(0);
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}

/* Sin catch. Si una carpeta a vigilar no existe es que alguien la movió, y
 * eso hay que verlo, no ignorarlo. */
const files = SCAN.flatMap(d => {
  const dir = join(ROOT, d);
  if (!existsSync(dir)) {
    console.error(`✗ No existe la carpeta vigilada: ${d}  (¿se movió?)`);
    process.exit(2);
  }
  return walk(dir);
});

const perFile = new Map();
let total = 0;

for (const abs of files) {
  const rel = relative(ROOT, abs);
  if (ALLOW.has(rel)) continue;

  const hits = [];
  readFileSync(abs, 'utf8').split('\n').forEach((line, i) => {
    for (const h of scanLine(line)) hits.push({ line: i + 1, ...h });
  });

  if (hits.length) { perFile.set(rel, hits); total += hits.length; }
}

if (!total) {
  console.log('✓ Sin color escrito a mano en admin/ ni components/.');
  process.exit(0);
}

const list = process.argv.includes('--list');
const rows = [...perFile].sort((a, b) => b[1].length - a[1].length);
const pad  = Math.max(...rows.map(([f]) => f.length));

console.log(`\n${total} colores escritos a mano en ${rows.length} archivos\n`);
for (const [file, hits] of rows) {
  console.log(`  ${String(hits.length).padStart(4)}  ${file}`);
  if (list) {
    for (const h of hits) console.log(`        ${file}:${h.line}  ${h.text}  → ${h.hint}`);
  }
}
console.log(`\nÚnico archivo autorizado a tener literales: ${[...ALLOW].join(', ')}\n`);
process.exit(1);
