# The Circle — Plan de ejecución
**Agosto 2026** · plan interno de trabajo · auditoría de 11 áreas con verificación adversarial

> Alcance: la lista de la clienta (WhatsApp, dos tandas) contrastada contra el código real.
> Referencia comercial: `PROPUESTA-plataforma-2026-07.md` (bloques A–F, 3.550 €).
> Este documento manda sobre la propuesta cuando hay discrepancia técnica.

---

## 0. Lo que YA existe y solo hay que enseñarle

No se construye. No se cobra dos veces. Se le manda un vídeo de 3 minutos.

| Ella pide | Dónde está ya |
|---|---|
| Instagram en el footer | `/admin/navigation` → Social Links. **Verificado: la fila existe, visible, y el footer la pinta** (`components/Footer.tsx:65-86`) |
| Múltiples géneros | `admin/AdminDJForm.tsx:285-305` y `AdminArtistForm.tsx:261-281`. Editor de pills en los dos |
| Que las fotos no pesen | `lib/imageUpload.ts:19-72` ya convierte a WebP y reescala en cada subida |
| Deshacer si rompo algo | `admin/AdminHistory.tsx` — botón del reloj en cada ficha |
| Cambiar textos de home, manifiesto y CTAs | Edición en línea sobre la propia web (barra flotante de admin) |
| Menú, orden, etiquetas, enlaces del footer | `/admin/navigation` → Menu / Footer |
| Fondos de DJs, artistas y eventos | `/admin/settings` → Backgrounds (imagen y vídeo) |
| Categorías de artistas | `/admin/settings` → Categories |
| Términos y privacidad | `/admin/legal` |
| Exportar quién rellenó el formulario | `/admin/submissions` → Export CSV |
| Borrador / publicado en eventos | `/admin/events` → icono del ojo |

**Diagnóstico de por qué no las encuentra:** el panel está en inglés, las pantallas se llaman
*Visual Editor* / *Form Builder* / *Navigation*, y las claves `nav_hamburger`, `footer_config`
y `meta_seo` **no existen en la base de datos** — corren con los valores por defecto del código.
Una pantalla vacía sobre un valor por defecto es indistinguible de una rota.

---

## 1. Bugs vivos en producción, encontrados durante la auditoría

Ninguno estaba en la lista de la clienta. Los tres afectan a lo que ella ve.

1. **Editar un texto en línea borra los de al lado.**
   `useSiteContent.ts:116` sustituye el objeto entero en vez de fusionarlo con los defaults.
   `EditableText.tsx:66` guarda solo el campo editado.
   *Comprobado en vivo:* `content_cta_events` tiene solo `title`, así que el subtítulo del CTA
   de `/past-events` (`PastEvents.tsx:326`) sale en blanco **ahora mismo**.

2. **Compartir cualquier página que no sea la home enseña el marcador crudo.**
   `vercel.json:12` manda todo salvo `/` al HTML estático, que conserva
   `<!--META:og_title-->THE CIRCLE`. Además todas las rutas declaran el canonical de la home,
   así que Google descarta `/djs`, `/artists` y cada evento.

3. **`RECAPTCHA_SECRET_KEY` en claro en 6 ficheros versionados**
   (`QUICK-START.md`, `SECURITY-SETUP.md`, `SECURITY-SUMMARY.md`, `VERCEL-DEPLOY.md`,
   `README.md`, `setup-env.sh`). Borrarla no basta — sigue en el histórico. **Hay que rotarla.**

4. **"Submissions no funciona"** (reportado por la clienta). Descartado contra producción:
   las formas de lectura y escritura coinciden, la tabla existe, la sitekey está en el bundle
   y `/api/verify-captcha` responde `invalid-input-response` — o sea, el secret es válido.
   **Hipótesis viva:** la bandeja está vacía porque las candidaturas anteriores a mayo vivían
   en SheetDB y el cambio a Supabase no las migró. Confirmar con sesión iniciada.
   Independientemente del resultado, el arreglo de producto es el de la fase 8: **un estado
   vacío explícito**. Una lista en blanco es indistinguible de una pantalla rota — es
   exactamente el mismo mecanismo que la hizo pedir cosas que ya existen.

**Verificado con la API REST usando la anon key:** `site_settings` es de **lectura pública**
(18 filas legibles sin autenticar), escritura bloqueada (401), `form_submissions` protegida.
→ Ninguna clave de Mailchimp o Stripe puede vivir en `site_settings`. Van a Vercel.

---

## 2. Fases

9 fases · ~19 días. Cada una entrega algo que la clienta puede ver funcionando.
El orden es por dependencia técnica, no por precio ni por bloque de la propuesta.

### Fase 1 · Cimientos (1 día)
> El bug de fusión bloquea por igual el tema, las etiquetas de perfil, los CTA y la newsletter.
> Dos líneas aquí evitan cinco parches después.

- [ ] Verificar en el dashboard las políticas RLS de `site_settings`, `artist_categories`, `event_djs`, `event_artists`
- [ ] `pg_dump` completo antes de tocar nada (plan Free = sin PITR)
- [ ] Fusionar fallback con valor de BD en `useSiteBlock` — **el bug de arriba**
- [ ] Borrar filas fantasma: `content_home_hero`, `content_form_intro`, `content_form_event`
- [ ] Rotar `RECAPTCHA_SECRET_KEY` y limpiarla de los 6 ficheros + crear `.env.example`
- [ ] Declarar `VITE_SUPABASE_*` en `vite-env.d.ts`, quitar `VITE_SHEETDB_API_URL`
- [ ] Borrar sin importadores: `ASCIICircle`, `ASCIIParticles`, `CustomCursor`, `CircularLightbox`, los dos `.backup.tsx`
- [ ] Borrar `isValidRoute()` (cero llamadas) y el `interface FormSubmission` muerto
- [ ] Purgar `audit_log` a 90 días

**Entrega:** editar un texto deja de borrar los de al lado. Repo limpio, clave rotada.

---

### Fase 2 · Tema real: color y tipografía (2,5 días)
> Hoy el panel dice "Colors saved!" y no cambia nada. Las 411 apariciones de `#C42121`
> son clases arbitrarias de Tailwind que compilan a hex estático.
> Va antes que cualquier componente, o habría que repasarlos todos otra vez.

- [ ] Tokens en bloque `@theme static` (**nunca** `@theme inline`, hornea el literal)
- [ ] Codemod `-[#C42121]` → `-primary` y `-[#050000]` → `-bg` en los 20 ficheros públicos vivos
- [ ] Token `fg` separado del acento para cuerpo de texto (o las legales quedan ilegibles)
- [ ] Derivar hover y superficies con `color-mix`, no con más mandos en el panel
- [ ] A mano: 19 usos no-clase (fills de SVG, 4 `box-shadow`, keyframes de `Form`)
- [ ] Color del shader GLSL de la home como `uniform` desde el tema
- [ ] Autoalojar fuentes en `public/fonts` con `@font-face`; borrar el `<link>` a Google Fonts
- [ ] Borrar `* { font-family: Poppins !important }` y el override de `.font-mono`
- [ ] Ampliar `site_theme` a `{primary_color, fg_color, bg_color, font}`
- [ ] Pantalla **Apariencia**: 3 colores + fuente + 3 presets + aviso WCAG en vivo
- [ ] Borrar `admin/AdminVisualEditor.tsx` entero (704 líneas) tras confirmar las 10 claves vivas
- [ ] Pasada visual por las 9 rutas públicas, dos temas, móvil

**Entrega:** elige color y fuente en el panel y cambia toda la web, fondo animado incluido.
**Dato duro:** `#C42121` sobre `#050000` = 3.56:1, falla WCAG AA. El `#D95C5C` que ya usa
el footer = 5.83:1 y pasa. Tiene razón objetivamente.

---

### Fase 3 · Cabecera con botones + accesibilidad (1,5 días)
> Después del tema para no escribirla con el color quemado.
> Antes de SEO porque los `<Link>` de la cabecera son la única navegación en HTML del sitio.

- [ ] Reescribir `StandardHeader`: nav en línea desde `lg`, hamburguesa por debajo, tope de 6 items
- [ ] Subir `useSiteBlock(nav_hamburger)` a la cabecera, pasar items a `HamburgerMenu` como prop
- [ ] Items del menú → `<Link>` reales con `aria-current` (hoy son `<div onClick>`, inusables con teclado)
- [ ] `aria-expanded`, `role=dialog`, cierre con Escape, `inert` al cerrar, devolución del foco
- [ ] Unificar las **4 cabeceras distintas**: `Form.tsx` (x2), `NotFound`, `Terms`, `Privacy` → `StandardHeader`
- [ ] Traducir el sidebar del panel al castellano; *Visual Editor* → **Apariencia**
- [ ] Aviso en la pestaña Menu: solo los 6 primeros salen en la barra

**Entrega:** los tres puntos fuera en escritorio, misma cabecera en todo el sitio, menú con teclado.
**Es diff negativo:** se borra más de lo que se escribe.

---

### Fase 4 · SEO: una sola arquitectura de meta (1,5 días)
> Decisión de infraestructura que tres áreas quieren tomar por separado.
> Se toma UNA vez y antes de crear rutas nuevas, o cada ruta nace sin meta.

- [ ] Catch-all de `vercel.json` a `/api/index`; rewrite de `/sitemap.xml` **antes** (gana el primero que casa)
- [ ] Resolver de meta por `req.url`: mapa de rutas estáticas + consulta por slug para eventos
- [ ] Marcadores META en `canonical`, `og:url`, `twitter:url`
- [ ] JSON-LD de `Event` con escape propio de `<`
- [ ] Sitemap dinámico; borrar el estático en el **mismo** commit
- [ ] Heroes de `PastEvents`/`DJs`/`Artists` → `h1`; `usePageTitle` en la home
- [ ] `noindex` en el 404; `loading=lazy` en tarjetas de listado
- [ ] Verificar en preview: `/`, `/djs`, `/form`, `/admin/login`, `/past-events/vol.IV`, `/robots.txt`, `/sitemap.xml`
- [ ] Search Console: verificar propiedad y enviar sitemap

**Entrega:** compartir cualquier enlace enseña su título e imagen. Google indexa cada página.
**Contrapartida honesta:** el sitio entero pasa a depender de la función serverless. Se mitiga
con el `try/catch` que ya existe y verificando en preview antes de producción.

---

### Fase 5 · Perfiles a página completa y editables (2,5 días)
> Lo ha reclamado dos veces. Hoy es un panel de 640px sin URL: cero enlaces indexables,
> cero forma de compartir un DJ. Después de SEO para que nazcan compartibles.

- [ ] **SQL primero, TypeScript después** — solo el bloque nuevo de `ALTER`, nunca el fichero entero
- [ ] Sanear slugs vacíos o duplicados antes de publicar las rutas
- [ ] Tipos nuevos: `ProfileLink`, `ProfileFact`, campos de vídeo
- [ ] `ProfileDetail` con prop `type`, secciones condicionadas a que haya dato
- [ ] Portar "Appeared in" desde `ProfileModal` **antes** de borrarlo
- [ ] Rutas `/djs/:slug` y `/artists/:slug`; los 3 puntos abren navegación, no modal
- [ ] Borrar `ProfileModal.tsx` (si se deja "de preview", la queja vuelve)
- [ ] Helper `embedUrl` con 4 asserts en el propio fichero (YouTube, youtu.be, Vimeo, mp4)
- [ ] Nivelar el formulario de artista con el de DJ: encuadre, `based_in`, press kit, galería
- [ ] Editores de enlaces, datos libres y vídeos en los dos formularios
- [ ] Perfiles al resolver de meta y al sitemap; botón "Ver ficha pública"

**Entrega:** `/djs/nombre` a pantalla completa con bio, géneros, galería, vídeos, botones propios,
press kit y eventos. Compartirlo enseña su foto.

---

### Fase 6 · Formularios múltiples, consentimiento y newsletter (3 días)
> Es la misma maquinaria: el formulario de artistas, el de DJs, el checkbox "acepto recibir
> correos" y la caja de suscripción son todos formularios con clave propia sobre la misma tabla.

- [ ] Tipos `date`, `checkbox`, `radio` en `FormFieldType` + render + validación de obligatorio
- [ ] `terms_required` configurable; guardar `_terms_accepted` y `_terms_text` en el payload
- [ ] Convención `form_schema_<slug>` + ruta `/form/:slug` con 404
- [ ] Constructor: selector de formulario, Nuevo, Duplicar, Borrar, historial, "Ver formulario"
- [ ] Bloque **"Aparece en"**: escribe `form_slug` y `cta_label` en los `content_cta_*`
- [ ] Leer `form_slug` en los 4 CTA con fallback a lo actual
- [ ] `/api/submit`: captcha en servidor, honeypot, escritura con service role
- [ ] Retirar la política de INSERT público en el **mismo** despliegue, nunca antes
- [ ] Bloque de suscripción en la home con casilla de consentimiento
- [ ] Empuje opcional a Mailchimp con `status: pending`, activado solo por variables de entorno
- [ ] Bandeja filtrada por formulario; `form_key` en el CSV
- [ ] Añadir newsletter y Mailchimp a la política de privacidad (fichero **y** fila `legal_privacy`)

**Entrega:** crea un formulario para artistas y otro para DJs, con casilla sí/no, y elige desde
el constructor en qué CTA aparece cada uno. Home con caja de suscripción.
**Arregla un agujero legal vivo:** hoy se exige aceptar los términos y no se guarda prueba ninguna.

---

### Fase 7 · Autonomía de páginas, cards de eventos y botón de donación (3 días)
> Reutiliza casi todo lo anterior: vídeo usa el `embedUrl` de la 5, botones usan el editor de
> enlaces de la 3, texto usa `LegalBody`, meta y sitemap ya existen de la 4.

> **El listón no es "existe un CRUD de páginas".** El objetivo es autonomía: que la clienta
> cree páginas **y las organice como quiera** —orden, menú, publicar, despublicar, reordenar
> secciones— sin escribirme nunca. Si para mover una página de sitio tiene que llamarme,
> la fase no está hecha. Se prueba así: **que cree "Who we are" entera, la coloque donde
> quiera en el menú y la reordene, sin ayuda y sin documentación.**

- [ ] Tabla `pages` con RLS, CHECK de slug con reservados, triggers de auditoría
- [ ] `PageBlock` de 5 tipos; `null` para tipos desconocidos
- [ ] `DynamicPage` sobre el catch-all existente, cortando si empieza por `/admin` o `/api`
- [ ] **No** filtrar `status` en la consulta: la RLS ya da vista previa gratis a la clienta logueada
- [ ] Editor de páginas copiando `AdminEvents` + secciones de `AdminLegal`, con historial
- [ ] **Reordenar secciones dentro de la página** (arrastre + flechas, el `GalleryEditor` de la fase 8)
- [ ] **Reordenar las páginas entre sí** y su posición exacta en el menú, desde la propia lista
- [ ] Duplicar una página como punto de partida (crear desde cero asusta; copiar no)
- [ ] URL final en vivo mientras escribe el título
- [ ] Casilla "Añadir al menú" al publicar; avisar de enlaces antes de despublicar
- [ ] Extraer `EventCard`; sección de eventos en la home ordenada por `featured` + fecha, límite 3
- [ ] Badge FEATURED en la lista de eventos del panel

**Entrega:** crea "Who we are" con texto, fotos, vídeos y botones; la publica; **decide dónde va
en el menú y lo cambia de opinión dos veces sin llamarme**; y se comparte con su propia
previsualización. La home muestra los 3 últimos eventos y `featured` por fin sirve para algo.
**Sin mandos:** nada de `enabled` ni `count` para los eventos. Tres, ocultos si no hay ninguno.

---

### Fase 8 · Panel en castellano, avisos coherentes y galería ordenable (1,5 días)
> Al final para traducir una sola vez sobre los textos definitivos.

- [ ] Traducir el panel (dejando intactos los valores de enum de estado)
- [ ] Agrupar el sidebar en 4 bloques: Contenido / Diseño / Captación / Ajustes
- [ ] Botón "Editar esta sección" en la barra de admin → lleva a su pantalla
- [ ] Un solo toast, un solo estado vacío, una sola confirmación de borrado
- [ ] `GalleryEditor` con flechas + arrastre HTML5 + numeración, usado en evento, DJ y artista
- [ ] Validar tamaño y tipo **antes** del `Promise.all` de la galería; detectar HEIC y GIF animado
- [ ] Corregir el fallback de anchura de `djs/gallery` (hoy sube a 1200 en vez de 800)
- [ ] Límite de tamaño y MIME en el bucket
- [ ] Reducir el dashboard a lo que no duplica el sidebar
- [ ] Sincronizar `supabase-schema.sql` con la base real y hacerlo re-ejecutable

---

### Fase 9 · Donaciones con Stripe — CONDICIONAL (2,5 días)
> Solo si abre cuenta. El bloque de botones de la fase 7 ya cubre "donaciones"
> enlazando a PayPal.me o Ko-fi con cero código y cero mantenimiento.

- [ ] Tabla `donations` con RLS de solo lectura autenticada, sin ninguna política de escritura
- [ ] Endpoint de checkout con importe validado en servidor y `success_url` fijo
- [ ] Webhook con verificación de firma sobre el cuerpo crudo y upsert idempotente
- [ ] Acotar el `Access-Control-Allow-Origin: *` de `/api/*` **antes** de exponer pagos
- [ ] Bloque público con importes sugeridos; pantalla de donaciones en el panel
- [ ] Probar firma inválida, evento reenviado y donación real de 1 € con reembolso
- [ ] Stripe como encargado de tratamiento en la política de privacidad

> Reutilizable: el proyecto Oray ya tiene `orders`, `order_payments` y `stripe_events` montados.

---

## 3. Decisiones que necesito de la clienta

Bloquean calendario, no código.

| Decisión | Recomendación | Bloquea |
|---|---|---|
| **Tipografía** | **League Spartan.** Syne solo llega a peso 800 en Google Fonts y el proyecto usa `font-black` (900) 61 veces + 4 SVG: con Syne todos esos titulares se sintetizan y se ven peor | Cierre fase 2 |
| **Semántica del color** | **Tres tokens** (acento / texto / fondo) + 3 presets con nombre y aviso de contraste. Con un solo color no se puede resolver su frase: quiere acentos rojos **y** cuerpo legible | Diseño del codemod, fase 2 |
| **Tres puntos** | Fuera en escritorio, se quedan en móvil (allí son la única navegación). Es el elemento más reconocible de la cabecera: **enseñarle una captura antes** | Fase 3 |
| **Mailchimp** | Que abra ella la cuenta y pase clave + audience ID. Van a **variables de entorno de Vercel**, nunca a `site_settings` (verificado: la lee el navegador de cada visitante) | Solo el empuje automático de la fase 6 |
| **Donaciones** | Empezar por el botón. La pasarela solo si quiere importes sugeridos y ver lo recaudado en el panel — y exige cuenta de Stripe a su nombre y decisión fiscal: si a cambio se da entrada o merch, legalmente es **venta**, no donación | Fase 9 entera |
| **Páginas en el menú** | Casilla "Añadir al menú" al publicar, no automático. La propuesta promete "aparecen solas"; automático deja enlaces rotos al despublicar. **Decírselo antes** | Fase 7 |
| **Vídeos** | Solo enlace de YouTube/Vimeo. Un vídeo de 1 min en 1080p son 30-80 MB: diez llenan el 80% del GB del plan Free | Fases 5 y 7 |
| **Plan Supabase** | Pro (25 $/mes) si entra la fase 9. En Free no hay PITR —justo lo que faltó cuando se perdió el evento #2— y el proyecto se pausa a los 7 días sin actividad | Fase 9 |

---

## 4. Reglas de ejecución

Se incumplen y se rompe producción.

1. **SQL antes que TypeScript, siempre.** Los formularios mandan el objeto completo a
   `insert/update`: una clave en el tipo sin columna en la tabla rompe **todos** los guardados
   de esa entidad con un 400. Al revés no rompe nada.
2. **`supabase-schema.sql` no es la base de datos real.** Le faltan 4 tablas que el código usa
   a diario y 4 columnas. No se puede ejecutar de principio a fin. Ejecutar solo los bloques
   nuevos en el editor SQL.
3. **`@theme static`, nunca `@theme inline`.** Es el fallo que invalida la fase 2 en silencio.
4. **Retirar la política de INSERT público en el mismo despliegue que sube `/api/submit`**,
   nunca en orden inverso, o el formulario queda roto.
5. **Ningún secreto en `site_settings`.** Verificado: lectura pública sin autenticar.
6. **Nada se verifica en local hoy**: `node_modules` no está instalado, `npm run type-check`
   no corre, y `dist/` está versionado con artefactos viejos que confunden cualquier comprobación.
