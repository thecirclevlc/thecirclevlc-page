# Estado de la sesión — retomar aquí

**Última actualización:** 12 agosto 2026
**Para retomar:** `claude --continue` en este directorio. Aceptar el `.mcp.json` del proyecto
cuando pregunte (es el MCP de Supabase apuntando a `ifpikoyetqafzllqloyr`).

Plan completo: **`PLAN-plataforma-2026-08.md`**. Este fichero es solo dónde nos quedamos.

---

## ✅ RESUELTO — "submissions no funciona" era pérdida de datos en producción

**Causa raíz:** la migración de mayo 2026 usaba `CREATE TABLE IF NOT EXISTS form_submissions`.
La tabla **ya existía** con la forma plana antigua (`full_name`, `age`, `where_from`, …), así que
el `IF NOT EXISTS` fue un **no-op silencioso**. Las columnas `form_key` / `data` / `ip_hash` /
`user_agent` nunca se crearon.

**Consecuencia:** `Form.tsx:403` insertaba contra columnas inexistentes → 400 → `catch` → error
genérico en pantalla. **El formulario público llevaba roto desde mayo y cada candidatura se
perdía.** La tabla tenía 0 filas.

`social_links` y `audit_log` sí se crearon (por eso Instagram funciona). Solo `form_submissions`
se quedó atrás, precisamente porque era la única que ya existía.

**Reparado** con dos migraciones aditivas (sin borrar nada):
- `add_form_submissions_jsonb_columns` — las 4 columnas + 3 índices (incluido `form_key`, que la fase 6 necesita)
- `form_submissions_data_no_default` — quita el `DEFAULT '{}'` para que un insert sin `data` reviente en vez de guardar una candidatura vacía

**Verificado por el camino real, no solo por "el SQL no dio error":**
`POST /rest/v1/form_submissions` como `anon` con `Prefer: return=minimal` → **HTTP 201**.
La fila se lee con la forma exacta que espera `AdminSubmissions.tsx` (`data.fullName`,
`data.email`, `status:'new'`). Fila de prueba borrada, tabla a 0.

> Nota: un primer intento con `Prefer: return=representation` dio 401. No era la base:
> `return=representation` obliga a un `RETURNING` que exige `SELECT`, y `anon` no lo tiene.
> `supabase-js` usa `return=minimal`. La prueba estaba mal, no el esquema.

**Corrección a la fase 1:** borré el `interface FormSubmission` dándolo por muerto según la
auditoría. Era la forma **viva** de la tabla. La migración hace que el borrado sea correcto,
pero el razonamiento era falso. Lección: verificar contra la base, no contra la documentación.

**Pendiente de este hilo (fase 2, no antes):** quitar las 8 columnas planas vacías. No corre
prisa y un `DROP COLUMN` en producción merece ir con el resto de la limpieza.

---

## Estado real de la base (verificado 12 ago 2026 vía MCP)

| Tabla | Filas | Nota |
|---|---|---|
| `events` | 4 | esquema completo ✓ |
| `djs` | 16 | con `based_in`, `press_kit_url`, `gallery_images`, `photo_position` ✓ |
| `artists` | 10 | **sin** esos 4 campos — es el trabajo de la fase 5 |
| `site_settings` | 18 | lectura **pública** confirmada (`qual: true`) |
| `event_djs` / `event_artists` | 17 / 9 | ✓ |
| `artist_categories` | 8 | ✓ |
| `social_links` | 1 | Instagram, visible ✓ |
| `audit_log` | 102 | sin purga necesaria — YAGNI |
| `form_submissions` | 0 | reparada hoy |

**`form_submissions` era la única tabla desalineada.** Todas las demás coinciden con los tipos.

**Avisos de seguridad pendientes** (`get_advisors`, ninguno crítico):
- `log_audit_changes()` es `SECURITY DEFINER` y **ejecutable por `anon` vía RPC**. Es una función
  de trigger, llamarla suelta falla, pero no debería estar expuesta → `REVOKE EXECUTE`.
- `update_updated_at_column` y `log_audit_changes` con `search_path` mutable.
- Protección de contraseñas filtradas desactivada en Auth.

**Las 3 filas fantasma NO se borran todavía.** Están confirmadas como no leídas
(`useSiteContent` solo se llama con `content_events_hero`, `content_artists_hero` y
`content_djs_hero`; `Form.tsx:512-527` lee de `form_schema_join`). Pero quien las escribe es
`AdminVisualEditor.tsx`: borrarlas ahora es inútil porque la clienta las recrea al guardar.
Se borran en la fase 2, en el mismo cambio que elimina el editor.

---

## Consultas de diagnóstico (ya ejecutadas — no repetir)

```sql
-- 1) ¿Por qué "submissions no funciona"? Hipótesis principal: la bandeja está VACÍA
--    porque las candidaturas viejas vivían en SheetDB y el cambio de mayo no las migró.
SELECT form_key, status, count(*), min(created_at), max(created_at)
FROM form_submissions GROUP BY 1,2 ORDER BY 1,2;

-- 2) RLS de las tablas creadas a mano en el dashboard (no están en supabase-schema.sql).
--    CRÍTICO: ya está probado que anon puede LEER site_settings. Falta confirmar que NO
--    puede escribir por otra vía y ver qué políticas tienen las otras tres.
SELECT tablename, policyname, cmd, roles::text, qual::text, with_check::text
FROM pg_policies
WHERE schemaname='public'
ORDER BY tablename, cmd;

-- 3) Inventario real de site_settings (18 filas legibles por anon; faltan
--    nav_hamburger, footer_config y meta_seo → el sitio corre con los defaults del código)
SELECT id, jsonb_object_keys(value) FROM site_settings ORDER BY 1;
```

---

Descartadas por el camino (no repetir): las formas de lectura/escritura del código sí
coincidían, la tabla sí existía, la sitekey sí está en el bundle de producción
(`assets/Form-Bq5p2Jnl.js`, fp `6b90bb38`) y `/api/verify-captcha` responde
`invalid-input-response` → el secret de reCAPTCHA es válido. El fallo estaba solo en el esquema.

**Sigue en pie el arreglo de producto de la fase 8:** un estado vacío que diga "aún no hay
candidaturas" en vez de una lista en blanco. Una lista vacía es indistinguible de una pantalla
rota — es el mismo mecanismo que la hizo pedir cosas que ya existen. Ahora además sabemos que
puede tapar una pérdida de datos real durante meses.

---

## FASE 1 — hecha en código (sin commitear)

`−1.755 / +26` líneas. `npm run build` verde. `node hooks/useSiteContent.check.ts` verde.
`npm run type-check` da 14 errores, **todos preexistentes** (patrón `.catch()` sobre
`PromiseLike` ya documentado en `ADMIN-SYSTEM.md` §9, más `useAutosave`). No añadí ninguno.

- `lib/mergeBlock.ts` **(nuevo)** — fusiona el valor guardado sobre los defaults. Sin dependencias
  a propósito, para que el check corra con `node` pelado.
- `hooks/useSiteContent.ts:116` — usa `mergeBlock`. **Arregla el subtítulo en blanco del CTA
  de `/past-events`**, que estaba roto en producción.
- `hooks/useSiteContent.check.ts` **(nuevo)** — 8 casos. Falla con el código anterior, que es
  lo que lo hace valer algo.
- Clave reCAPTCHA fuera de `QUICK-START.md`, `SECURITY-SETUP.md`, `SECURITY-SUMMARY.md`,
  `VERCEL-DEPLOY.md`, `setup-env.sh`.
- Borrados (0 importadores verificados): `ASCIICircle`, `ASCIIParticles`, `CustomCursor`,
  `CircularLightbox`, `EventDetail.backup`, `PastEvents.backup` + los comentarios muertos
  de `CustomCursor` en `App.tsx`.
- Fuera `isValidRoute()` (0 llamadas) y el `interface FormSubmission` de mayo.
- `vite-env.d.ts` declara `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`; fuera `VITE_SHEETDB_API_URL`.
- `.env.example` **(nuevo)**.
- `.mcp.json` **(nuevo)** — MCP de Supabase, scope project. El `project_ref` no es secreto.

### Pendiente de fase 1 — solo lo puede hacer Alberto

- [ ] **Rotar `RECAPTCHA_SECRET_KEY`** — ⏸️ **APLAZADO**: Alberto no tiene acceso a esa cuenta
      de Google hoy. **No bloquea nada**: la clave sigue funcionando y el formulario va bien.
      El riesgo es que está expuesta en el histórico de git (commit `485c28f`), así que
      alguien podría resolver captchas en nombre del sitio. Impacto real: spam en el
      formulario. Se rota cuando haya acceso; la fase 6 monta `/api/submit` con verificación
      en servidor, que es el sitio natural para hacerlo de una vez.
- [ ] `pg_dump` completo antes de tocar esquema (plan Free = sin PITR).
- [ ] En el editor SQL:
      ```sql
      DELETE FROM site_settings WHERE id IN ('content_home_hero','content_form_intro','content_form_event');
      DELETE FROM audit_log WHERE changed_at < NOW() - INTERVAL '90 days';
      ```
      (`site_theme` **sí** existe y está bien — la auditoría se equivocaba en eso.)

---

## FASE 2 — decidida, sin empezar

**Decisiones tomadas por Alberto:**
- **Dos controles en el panel: acento y fondo.** El `#f5f5f0` del cuerpo de texto se queda como
  token **fijo** `--color-fg`, no editable. Se construye el token, no el control.
- **League Spartan**, autoalojada (llega a peso 900; el proyecto usa `font-black` 61 veces + 4 SVG).

**Inventario ya hecho** (48 ficheros públicos, excluido `admin/`):

| | |
|---|---|
| `#C42121` | **363** — 341 en forma de clase Tailwind, ~22 en objetos de estilo/animación |
| `#050000` | 37 · `#f5f5f0` 16 · `#D95C5C` 14 · `#ff3333` 6 · `#0d0000` 5 · `#8B1A1A` 1 |

Reparto de las clases: `text-[#C42121]/N` 104 · `border-[#C42121]/N` 98 · `text-[#C42121]` 70 ·
`bg-[#C42121]` 28 · `bg-[#C42121]/N` 16 · `border-[#C42121]` 15 · más `placeholder-`,
`from-`, `to-`, `fill-`, `accent-`.

**Sitios que NO son clase y hay que editar a mano:**
- `fill="#C42121"` en 4 SVG del logo (`App.tsx:681`, `Form.tsx:434,495`, `StandardHeader.tsx:42`)
  → `fill="var(--color-primary)"`.
- **Shader GLSL** `App.tsx:138`: `vec3 red = vec3(0.769, 0.129, 0.129);` → pasar como `uniform`
  desde el tema.
- **Keyframes de framer-motion** (`Form.tsx:215,226,241,266,476,600`, `HamburgerMenu.tsx:223,238`,
  `NotFound.tsx:178,205`): framer **no interpola `var()`**. Hay que leer el valor computado
  una vez con un helper `cssVar()`. Ceiling conocido: no reacciona a un cambio de tema en
  caliente, se resuelve al remontar. Marcar con comentario `ponytail:`.
- `rgba(196,33,33,…)` en `HamburgerMenu.tsx:168` y `NotFound.tsx:181`.
- **`components/AdminToolbar.tsx` se queda en rojo fijo a propósito** — es chrome de admin sobre
  el sitio público y el rojo señala "modo edición". Excluido del codemod, igual que `admin/`.

**Trampa que invalida la fase entera en silencio:** usar `@theme inline` en vez de `@theme`.
Con `inline` Tailwind hornea el literal y el cambio en caliente deja de funcionar.

---

## Fases 3–9

Sin empezar. Están detalladas en `PLAN-plataforma-2026-08.md`.

**Matiz que Alberto subrayó y manda sobre la fase 7:** el objetivo no es "poder crear páginas",
es **autonomía**. La clienta tiene que poder crear páginas **y organizarlas como quiera**:
orden en el menú, reordenar, mover, publicar y despublicar sin llamar a nadie. El editor de
páginas se diseña contra ese listón, no contra "existe un CRUD de páginas".

---

## Contexto que costó averiguar — no repetir el trabajo

- **`site_settings` es de lectura pública.** 18 filas legibles por `anon` sin autenticar; escritura
  bloqueada (401). → Ninguna clave de Mailchimp o Stripe puede vivir ahí. Van a Vercel.
- **Faltan `nav_hamburger`, `footer_config` y `meta_seo`.** El menú y el footer corren con los
  defaults del código, y `api/index.ts:38` no encuentra `meta_seo` y cae al meta estático.
  El editor de SEO nunca se ha usado.
- **Instagram en el footer ya está**: fila existente y visible (`https://www.instagram.com/thecirclevlc/`),
  y `components/Footer.tsx:65-86` la pinta. Esa petición está servida.
- **`vercel.json:12`** manda `/((?!api).*)` al HTML estático. Solo `/` pasa por `api/index.ts`.
  Por eso compartir `/djs` enseña el marcador crudo `<!--META:og_title-->`.
- **`#C42121` sobre `#050000` = 3.56:1**, falla WCAG AA. El `#D95C5C` del footer = 5.83:1 y pasa.
- **`supabase-schema.sql` no es la base real.** Faltan `site_settings`, `event_djs`,
  `event_artists`, `artist_categories`. No se puede ejecutar entero. Solo bloques nuevos.
- **Node 24 corre TypeScript nativo** → los `.check.ts` se ejecutan sin instalar nada.
  (`.nvmrc` dice 18 y está obsoleto.)
- Alberto tiene **Stripe ya montado en el proyecto Oray** (`orders`, `order_payments`,
  `stripe_events`) — la fase 9 se copia de ahí en vez de escribirla.
- La auditoría completa (11 áreas, 23 agentes) está en
  `.claude/projects/…/subagents/workflows/wf_b6a5614e-189/journal.jsonl`.

---

## Reglas que no se saltan

1. **SQL antes que TypeScript.** Los formularios mandan el objeto completo a `insert/update`:
   una clave en el tipo sin columna en la tabla rompe todos los guardados de esa entidad con un 400.
2. **`@theme`, nunca `@theme inline`.**
3. **Retirar la política de INSERT público en el mismo despliegue que sube `/api/submit`**, jamás antes.
4. **Ningún secreto en `site_settings`.** Comprobado: lectura pública.
5. No commitear sin que Alberto lo pida.
