# The Circle — Lista de verificación del encargo

**Agosto 2026.** Sale de inventariar ~600 elementos visibles del sitio, zona por zona,
y comprobar cuáles puede cambiar la clienta hoy.

## El objetivo

1. **Todo lo que ella nombró queda editable por ella.** Sin excepción, incluido lo que
   dijo de pasada ("crear nuevas informaciones", "añadir botones").
2. **Y además, mejorar lo que se pueda mejorar** — pero solo cuando la mejora resuelve un
   problema que se puede nombrar: algo roto, algo que no encuentra, o algo que la hará
   escribir la semana que viene.

**No es "editabilidad total".** Un panel con 200 mandos es peor que uno con 30, y ella ya
se perdió en el de 10 pantallas que tiene hoy. Lo que queda fuera está en el §4, con el
motivo escrito, para que sea una decisión y no un olvido.

**Punto de partida honesto:** de las 22 cosas concretas que nombró, hoy funcionan 3
(Instagram en el pie, varios géneros, y galería + press kit **solo para DJs**). Un 14%.
Y de ese 14%, la mitad ni lo sabe: lo pidió como si no existiera.

---

## 1 · Mapa de sus peticiones

Las 14 peticiones literales de las dos tandas. Ninguna fuera.

| # | Lo que pide | Estado | Bloque |
|---|---|---|---|
| 1 | "Optimizar google search" | a construir | 8 |
| 2 | "cambiar Font y color (rojo mas claro, mas leible)" | a construir — **hoy es un placebo** | 2 |
| 3 | "Quitar tres puntos y poner los botones en el heading" | a construir | 3 |
| 4 | "agregar card eventos en el home page" | a construir | 5 |
| 5 | "crear nuevas paginas con contenido, fotos, enlaces, donaciones" | a construir | 4 |
| 6 | "Crear newsletter (espacio para dejar el correo en la homepage)" | a construir | 5 + 6 |
| 7 | "Conectar el formulario a mailchimp" | a construir | 6 |
| 8 | "Anadir instagram en el footer" | ✅ **ya funciona — solo hay que enseñárselo** | 1 |
| 9 | "Perfiles artistas y dj en pagina entera, no half screen" | a construir | 7 |
| 10 | "cambiar todo en artistas y djs: botones, galeria, videos, presskit, multiple genres, nuevas informaciones" | parcial — ver abajo | 7 |
| 11 | "no puedo crear nuevos formularios" | a construir | 6 |
| 12 | "no me deja anadir otras tipologias de respuestas (acepto recibir correos si/no)" | a construir | 6 |
| 13 | "en esta pagina no me deja cambiar el formulario... otro solo para artistas, mismo para djs" | a construir | 6 |
| 14 | "no puedo crear la pagina 'who we are'" | a construir | 4 |

**Desglose del punto 10**, que no es una cosa sino seis:
`multiple genres` ✅ ya funciona · `galería` y `presskit` ⚠️ solo DJs (la tabla `artists`
no tiene esas columnas) · `botones`, `vídeos` y `campos libres` ❌ no existen para ninguno.

---

## 2 · Bloques de trabajo

Etiquetas: **[C]** lo pidió ella · **[R]** arregla algo roto · **[M]** mejora que evita
una queja concreta.

### Bloque 1 · Sacar a la luz lo que ya existe
> Cero código nuevo. Es el trabajo más barato y el que más queja quita: escribió "las cosas
> que dijimos no están todas" refiriéndose a cosas que **sí existen**.

- [x] **[C]** Sacar "Redes sociales" a su propia entrada del panel *(hoy: 3ª pestaña de Navigation — por eso pidió Instagram)*
- [x] **[M]** Renombrar las pantallas del panel por lo que contienen *(en inglés, por decisión tuya; agrupadas en 4 bloques)*
- [x] **[M]** Sacar "Pie de página" a su propia entrada *(marca, email, año viven dentro de Navigation)*
- [x] **[M]** Sacar "Google y compartir" a su propia entrada *(hoy: 3ª pestaña de Settings)*
- [x] **[M]** Fondos de página con entrada propia en el menú *(en vez de moverlos, se les dio destino propio)*
- [x] **[M]** Mover "Categorías de artistas" dentro de la pantalla Artistas
- [x] **[M]** Poner "Historial" en el menú — existe, con 102 cambios registrados, y es invisible
- [x] **[R]** Guardar una vez menú, pie y SEO: sus filas no existen y el panel parece que no hace nada
- [x] **[R]** Corregir el título de Eventos — *el defecto que lo pisaba ya no existe; la tarjeta de Artistas y DJs lee ahora la fila real de la página, así que no puede volver a separarse*
- [x] **[R]** Quitar el aviso amarillo "SQL required — Run the supabase-schema.sql"
- [x] **[R]** Borrar del Visual Editor "Home Page → Title/Subtitle", "Form Intro" y "Form Event Info": dicen guardado y no los lee nadie
- [x] **[R]** Dejar el email de contacto en un solo sitio — *manda el pie; el panel de legales lo enseña y enlaza a donde se cambia*
- [x] **[M]** Quitar los nombres técnicos ("content_home_join → title") de la edición en línea
- [x] **[M]** Hacer clicable el título grande de Eventos, DJs y Artistas *(hoy solo el subtítulo)*
- [x] **[M]** Añadir ojo de ocultar/mostrar a las entradas de menú y pie *(las guardadas antes siguen visibles; 7 casos de check)*
- [x] **[M]** Tutorial dentro del panel (`/admin/help`), no un documento aparte

### Bloque 2 · El color y la tipografía, de verdad
> Va antes que las pantallas nuevas: así cada bloque que se construya después nace ya con
> su color y su fuente, en vez de con otro hex a mano.

- [x] **[C]** Sustituir los **363 rojos escritos a mano en 22 ficheros** por el color que elige
- [x] **[R]** Aplicar el tema en **todas** las páginas *(`useSiteTheme()` solo corre en `App.tsx:546` — la portada)*
- [~] **[C]** Segundo tono legible — *token `fg` creado y aplicado; sin mando en el panel, por la decisión de dos controles*
- [x] **[R]** Subir el titular "MOMENTS THAT HAPPEN ONLY ONCE" — hoy `#330000` sobre `#050000`, contraste **1,3:1**, invisible *(`App.tsx:522`)*
- [x] **[C]** Selector de tipografía (League Spartan) y quitar el `!important` que la bloquea
- [x] **[M]** Pasar el color al fondo animado, al favicon y a la barra del móvil
- [x] **[M]** Vista previa real en la pantalla de color: un titular, un botón y un enlace
- [x] **[M]** Repaso página por página — *hecho comprobable en vez de a ojo: 0 rojos de marca escritos a mano fuera de los valores de reserva, 7 rutas servidas 200, y el inyector de metadatos simulado contra el HTML construido*

### Bloque 3 · Una sola cabecera, con botones
> Los tres puntos están en **6 copias distintas** de cabecera. Se hacen todas de una vez o
> hay que repetir cada cambio seis veces para siempre.

- [x] **[C]** Sustituir los tres puntos por los items del menú escritos en la cabecera
- [x] **[C]** Añadir un botón de acción con texto y destino editables
- [x] **[M]** Dejar **una** cabecera y borrar las otras cinco
- [x] **[R]** Poner cabecera en Aviso legal, Privacidad y 404 *(hoy desde las legales no se navega a ningún sitio)*
- [x] **[M]** Menú desplegable solo en móvil, con las mismas entradas
- [x] **[M]** La palabra del logo vive en una sola constante, con prop para cambiarla

### Bloque 4 · Páginas nuevas
> Lo ha pedido **tres veces con tres palabras distintas**. Los mismos bloques se reutilizan
> tal cual en la portada del bloque 5.

- [x] **[C]** Pantalla "Páginas": listado, crear, publicar/ocultar, duplicar, borrar
- [x] **[C]** Ruta que pinta cualquier página nueva por su dirección
- [x] **[C]** Seis tipos de bloque: texto, imagen, galería, vídeo, botón/enlace, formulario
- [x] **[C]** Reordenar, ocultar y borrar bloques dentro de la página
- [x] **[M]** Que las páginas nuevas salgan solas en el desplegable de destinos del menú y el pie
- [x] **[M]** Título de pestaña y descripción de Google por página — *bloque 8 cerrado; verificado ruta por ruta contra el HTML construido*
- [~] **[C]** Crear "Who We Are" — *creada como BORRADOR con contenido de ejemplo; queda enseñárselo y que la publique ella*

> El bloque botón/enlace es lo que cubre "donaciones" sin escribir una línea de pasarela.

### Bloque 5 · La portada deja de ser un molde cerrado
- [x] **[C]** Sección de tarjetas de eventos, eligiendo cuántas y cuáles *(los eventos ya están en la base y ya tienen `featured`)*
- [x] **[C]** Sección de newsletter: correo + botón + consentimiento
- [x] **[C]** Poder añadir a la portada los mismos bloques del bloque 4
- [x] **[C]** Hacer editable el texto del botón APPLY y a dónde lleva
- [x] **[M]** Reordenar y ocultar las secciones de la portada *(las seis de siempre se mueven y se ocultan, no se borran)*
- [x] **[M]** Foto o vídeo de fondo también en portada y formulario

### Bloque 6 · Formularios: varios, con más tipos, y que salgan del sitio
> Formularios nuevos, respuestas sí/no, formulario por página y Mailchimp son **la misma
> pieza**: en cuanto el formulario deja de ser único, lo demás cuelga de ahí.

- [x] **[C]** Crear formularios nuevos, cada uno con su nombre y su dirección
- [x] **[C]** Tipos que faltan: casilla sí/no, opción múltiple, fecha
- [ ] **[—]** ~~Subida de archivo~~ — fuera: ella nunca la nombró y arrastra almacenamiento, límites de tamaño y permisos. Se hace si la pide
- [x] **[C]** Selector de formulario en cada botón de llamada *(hoy los 4 tienen `/form` a mano)*
- [x] **[C]** Conectar los envíos de cada formulario a una lista de Mailchimp
- [x] **[C]** Conectar el newsletter de la portada a esa misma salida
- [x] **[R]** Guardar en cada respuesta que aceptó las condiciones, el texto que vio y la fecha
- [x] **[R]** Mensaje visible cuando el envío falla — *se queda hasta el siguiente intento y distingue estar sin conexión de un fallo al guardar*
- [x] **[R]** No pintar el formulario hasta que carguen sus textos *(hoy parpadea con la fecha vieja)*
- [x] **[R]** Esconder el "Name (key)" tras un "avanzado": cambiarlo rompe las respuestas antiguas
- [x] **[M]** Filtrar las respuestas por formulario en el buzón
- [x] **[M]** Texto de ayuda debajo de cada pregunta
- [~] **[M]** Aviso cuando llega una respuesta — *contador de solicitudes sin abrir en el menú del panel, que funciona sin configurar nada. El correo de verdad necesita un servicio de envío y su clave: ver §6*
- [x] **[R]** Captcha sin clave — *era un cepo, no un seguro: con el interruptor puesto y sin clave NINGÚN envío pasaba. Ahora solo se exige si puede mostrarse, y el panel avisa*

### Bloque 7 · Perfiles a página entera, con todo dentro
> El panel lateral de 640px es **el mismo componente** en DJs, Artistas y ficha de evento:
> convertirlo en página y meterle vídeos, botones y campos libres es una sola operación.

- [x] **[C]** Cada perfil, su propia página a pantalla completa con dirección propia
- [x] **[C]** Dar a los artistas los 4 campos que hoy solo tienen los DJs: ubicación, press kit, galería, encuadre
- [x] **[C]** Vídeos pegando el enlace de YouTube, SoundCloud o Mixcloud
- [x] **[C]** Botones libres (texto + enlace): contratar, portfolio, donar
- [x] **[C]** Campos de información libres: ella escribe la etiqueta y el valor
- [x] **[R]** Mostrar la hora y el botón de entradas del evento *(ya estaba hecho: el checklist iba por detrás del código)*
- [x] **[R]** Añadir el subidor de logo de partner que la ficha ya sabe pintar y el panel nunca guarda
- [x] **[R]** Sustituir las dos fotos de Unsplash por una imagen de marca subible
- [x] **[R]** Quitar de la web el mensaje de error crudo de la base de datos que ve el visitante
- [x] **[M]** Ampliar las redes del perfil de 4 a las 10 que ya soporta el pie
- [x] **[M]** Ampliar al pulsar las fotos de la galería del perfil *(el visor ya existe, aquí no se usa)*
- [x] **[M]** Reordenar los DJs y artistas del cartel *(el orden ya se guardaba y se leía; solo faltaban las flechas)*
- [x] **[M]** Ordenar a mano los perfiles en las rejillas
- [x] **[M]** Las 17 etiquetas fijas de la ficha de evento, en una sola lista

### Bloque 8 · Google
> El último a propósito: el mapa del sitio tiene que incluir las páginas y perfiles nuevos,
> y esos no existen hasta que los bloques 4 y 7 estén hechos.

- [x] **[R]** Que todas las páginas pasen por el inyector de metadatos, no solo la portada
- [x] **[R]** Quitar el título roto: hoy `/djs`, `/artists`, `/past-events`, `/form`, `/terms` y `/privacy` **salen literalmente con `<!--META:title-->THE CIRCLE`**
- [x] **[R]** Corregir la dirección canónica *(hoy todas se declaran ante Google como si fueran la portada)*
- [x] **[R]** Nombre del evento en la pestaña *(hoy las 4 fichas ponen "Event" — `EventDetail.tsx:176`)*
- [x] **[R]** Devolver "no encontrada" de verdad en las URL rotas *(hoy Google las indexa como buenas)*
- [x] **[C]** Título y descripción propios por página, evento y perfil
- [x] **[C]** Mapa del sitio generado solo, con eventos, perfiles y páginas nuevas
- [x] **[M]** Subir desde el panel la imagen de compartir y el icono de pestaña *(y el icono por defecto ya sigue al color de marca)*

---

## 3 · Lo que ya funciona (enseñárselo, no construirlo)

| Ella busca | Está en |
|---|---|
| Instagram en el pie | Navigation → 3ª pestaña "Social Links" |
| Marca, "Valencia, Spain", email, año | Navigation → "Footer" |
| Título de pestaña y textos al compartir | Settings → 3ª pestaña "SEO / Link Preview" |
| Fondos de Eventos, DJs, Artistas | Settings → "Page Backgrounds" |
| Categorías de artistas | Settings → "Artist Categories" |
| Deshacer un cambio | Historial — existe, **no está en el menú** |
| Varios géneros por perfil | La ficha del perfil → Genres, sin límite |
| Que las fotos no pesen | Automático en cada subida *(WebP + reescalado)* |

---

## 4 · No editable a propósito

Decisiones, no olvidos. Cada línea aquí es algo que no hay que construir, ni mantener,
ni explicarle.

| Elemento | Motivo |
|---|---|
| Crédito "By Alia Studio" | Fijo por contrato |
| Fichero de verificación de Search Console | Es la prueba de propiedad del dominio |
| Velocidad de giro del logo y su acelerón al hacer scroll | Un mando más para un efecto que nadie mira |
| Parámetros del fondo animado *(rejilla, onda, grosor)* | Van dentro del programa de la tarjeta gráfica. Se le pasa el **color** y nada más |
| Tiempos y curvas de las ~25 animaciones | 25 mandos para algo que nunca ha nombrado |
| Grano, viñeteado, cursor, barra de scroll | Textura al 3%. Un interruptor aquí solo sirve para romper el aspecto |
| Dibujo ASCII del 404 | La **frase** y el **botón** sí se hacen editables. El dibujo son dos matrices de texto |
| Tamaño de letra elemento por elemento | ~200 valores. Elige **fuente** y **dos tonos**, no un editor de CSS |
| Columnas de las rejillas y márgenes | La maquetación es el diseño. Abrirlo es romper la web en dos clics |
| Orden interno de la ficha de evento | Es una plantilla. Vaciar una sección para que desaparezca ya funciona |
| Efectos del botón APPLY *(imán, onda, glitch)* | Se hace editable el **texto** y el **destino**, que es lo que nombró |
| Formato y idioma de las fechas | La web está en inglés y no ha pedido castellano |
| Textos del propio panel | Solo los ve ella. Se traducen, no se hacen editables |

**Se borran, no se convierten en campos:** el "SCROLL TO BREACH" y el "VOL. II / SILENCE WAS
DEAFENING" *(comentados, hoy no se ven)*, la galería vertical antigua con "CLICK TO EXPAND"
*(código muerto)*, y el campo `lineup` de nombres sueltos *(resto de una versión anterior:
los DJs ya se enlazan por ficha)*.

---

## 5 · Dos límites, dichos antes de empezar

1. **Los perfiles serán páginas enteras con un esqueleto fijo + bloques que ella añade**
   (vídeos, botones, campos libres), no un editor libre pantalla a pantalla. Su propio
   *"(si posible)"* cubre esa raya.
2. **El crédito de Alia Studio no se toca.** Por contrato.

---

## 6 · Decisiones pendientes

| Decisión | Por qué importa |
|---|---|
| **Cuenta de Mailchimp** | Si la clave la pone Alberto en Vercel, el día que cambie de CRM vuelve a depender de él — justo lo que este encargo quiere terminar |
| **¿Sitio monolingüe para siempre?** | La web está en inglés, ella escribe en castellano, y va a rellenar cada campo editable en el idioma que quiera |
| **Consentimiento y RGPD** | Hoy la aceptación muere en el navegador. Con Mailchimp de por medio deja de ser un detalle. **Ella no lo ha nombrado** |
| **Almacenamiento** | El encargo añade subidas: imagen de compartir, favicon, logos, galerías de artistas, imagen y vídeo de páginas nuevas. Mirar el bucket **antes** |
| **Móvil** | Todo lo nuevo nace con dos maquetaciones que mantener. No hay revisión sistemática |
| **Servicio de envío de correo** | El aviso "te ha llegado una solicitud" necesita alguien que mande el correo (Resend, Postmark, SMTP). Hoy hay un contador en el panel que funciona sin nada, pero solo lo ve si entra. No se ha construido a ciegas: sin clave sería un camino que no se puede probar y que falla en silencio — exactamente el fallo que tenía el captcha |
| **Rotar `RECAPTCHA_SECRET_KEY`** | ⏸️ Aplazado: sin acceso a la cuenta. No bloquea nada; el riesgo real es spam |
