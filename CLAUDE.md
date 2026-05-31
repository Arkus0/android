# CLAUDE.md — Guía para continuar el proyecto

> Documento para futuras sesiones de Claude Code (y para humanos). Resume qué
> es esto, cómo está montado, cómo probarlo y cómo se despliega, para poder
> seguir trabajando sin el contexto de la conversación original.

## 1. Qué es

**Las Letras Vivas**: un juego web para que un niño **aprenda a leer jugando**.
El usuario es un peque con **altas capacidades** que está aprendiendo a leer
(lee despacio y le cuesta), al que **le encanta pulsar letras**. Diseño:

- **Cada letra es un personaje** con ojos, boca y una **profesión que empieza
  por esa letra** ("la M de **M**ago", "la P de **P**intor") → refuerza el
  sonido inicial mientras juega.
- **Sin frustración**: nunca hay "has perdido"; el error solo da un sonidito
  suave y, tras 2 intentos, una pista. Refuerzo con ⭐ y colección de letras.
- **Se juega con teclado físico Y táctil** (tablet): trae su propio teclado en
  pantalla; no usa el teclado del sistema ni necesita ratón.

> Nota: el repo se llama `android` por motivos históricos (era un proyecto
> Phaser abandonado que se borró). **No es un proyecto Android**; es web estática.

## 2. Estado actual (live)

- **Producción:** https://android-coral-ten.vercel.app (rama `main`).
- Versión con **17 modos** (4 de **pulsar** + 6 de **letras/escribir** + 2 de
  **vocabulario** + 2 de **leer** + 3 de **bloques**), menú **agrupado por
  secciones** (categorías), **3 niveles**, teclado físico + táctil, voz por
  nombre/sonido, colección de 27 letras, **vocabulario sin emoji** (banco curado
  `VOCAB`, validado contra el diccionario de +364k), **Cuentos**, **sistema de
  bloques** (🧱 Taller libre, 🏗️ Construir y 🚂 Tren), **perfiles por
  niño** (con copia exportable) y **PWA** instalable/offline.

## 3. Stack y archivos

Sitio **estático, sin build, sin frameworks, sin dependencias en runtime**.
Pensado para abrirse incluso con **doble clic** en `index.html` (por eso se usa
JavaScript clásico con `<script src>`, **no ES modules**, que romperían por CORS
en `file://`).

La lógica está **separada en scripts clásicos** que comparten el espacio de
nombres global **`LV`** y se cargan EN ORDEN (`data.js` → `core.js` →
`bloques.js` → `modos.js`; `diccionario.js` con `defer`). No son módulos: cada
uno escribe/lee en `LV`.

```
index.html        #app (juego), #controles (teclado táctil), #fx (confeti) + metas/manifest PWA
style.css         Apariencia, animaciones, layout responsive, teclado en pantalla, juegos de pulsar y BLOQUES
data.js           DATOS: LV.INFO, LV.PALABRAS, LV.VOCAB, LV.BLOQUES_PALABRAS, LV.FRASES, LV.CUENTOS, layouts, niveles…
core.js           MOTOR: perfiles+persistencia, audio, DOM/personajes, efectos, HUD, controles,
                  detección PC/tablet, registro del SW. Expone helpers en LV.
bloques.js        SISTEMA DE BLOQUES (reutilizable): crearBloque/bloqueFantasma, descomponer, silabear
                  (best-effort), colorBloque, encajar, normalizar, esPalabra (LV.DIC), inventarios de piezas.
modos.js          MODOS: menú (por secciones/CATS), pantalla de perfiles y los 17 juegos + manejarTecla() (entrada única).
diccionario.js    AUTOGENERADO: +364k palabras del español (front-coding) → LV.DIC (Set). Carga con defer.
manifest.webmanifest  Manifiesto PWA (icono, display fullscreen, theme).
sw.js             Service worker: cachea la app shell para offline (sube CACHE al cambiar archivos).
icon.svg / icon-*.png  Iconos de la app (PNG generados con tools/gen-icons.js).
tools/gen-icons.js        Generador de los PNG del icono (Node puro, zlib; herramienta de un solo uso).
tools/gen-diccionario.js  Generador de diccionario.js (filtra+comprime an-array-of-spanish-words, MIT).
test/smoke.js     Test de humo con jsdom (ver §5)
README.md         Guía para el usuario/jugador + estado + roadmap
CLAUDE.md         Este documento
```

- **Gráficos:** emojis (no hay imágenes). Fuente: Comic Sans / redondeada.
- **Voz:** Web Speech API (`speechSynthesis`), español (`es-ES`).
- **Sonidos:** WebAudio (osciladores), sin archivos de audio.
- **Persistencia:** `localStorage` clave `"letrasVivas"` → **multi-perfil**:
  `{ v:2, activo:<id>, perfiles:{ <id>:{nombre, emoji, voz, modoVoz, minus,
  nivel, kbLayout, kbModo, estrellas, desc[], stats{letra:{ok,fail}} } } }`.
  El formato plano antiguo se **migra** a un perfil "Peque" al cargar.
  `core.js` mantiene `S` (espejo del perfil activo) y `persistir()` lo vuelca.

## 4. Mapa del código (data.js / core.js / bloques.js / modos.js)

Todo comparte el objeto global **`LV`**. Orden de carga obligatorio:
`data.js` → `core.js` → `bloques.js` → `modos.js` (+ `diccionario.js` con
`defer`, que solo rellena `LV.DIC`).

**`data.js`** — solo datos en `LV.*`: `INFO` (cada letra: `n` nombre, `p`
profesión, `e` emoji, `s` sonido), `PALABRAS` (`w/e/d` dificultad 0/1/2),
`VOCAB` (`w/d`: vocabulario SIN emoji y sin tildes para los modos avanzados;
cada `w` debe existir en `LV.DIC`, 2-10 letras — lo verifica `smoke.js`),
`BLOQUES_PALABRAS` (`w/e/sil/d`: palabras con sílabas CURADAS y sin tildes para
los modos Construir/Tren; cada `sil.join("")===w`), `FRASES`, `CUENTOS` (título
+ páginas), `CONS_SIL`, `TRABADAS`, `LAYOUT_QWERTY`/`LAYOUT_ABC`, `NIVELES`,
`ABECEDARIO`, `ORDEN_ABC`, `VOCALES`, `AVATARES`.

**`core.js`** (IIFE; expone helpers en `LV`):
- **PERFILES + persistencia** — `cargarBD()` (con migración del formato
  antiguo), `S` (espejo del perfil activo), `aplicarPerfil()`, `persistir()`,
  `crearPerfil/cambiarPerfil/renombrarPerfil/borrarPerfil`,
  `exportarTexto()/importarTexto()` (copia JSON), `registrar(letra, ok)` (stats).
- **DISPOSITIVO** — `tabletProbable()` (matchMedia pointer coarse/fine + touch)
  y `tecladoEnPantalla()` (respeta `S.kbModo`: auto/si/no).
- **AUDIO** — `hablar/cancelarVoz/decirLetra/pedirLetra`, `sfx*` (+`sfxPop`).
- **DOM + personajes** — `el/limpiar/mostrar/azar/barajar`, `tap()`,
  `personaje()`, `ranura()`, `revelar()`, `tam(rem)`.
- **EFECTOS** — `confeti/cartel/sumarEstrella/descubrir`.
- **HUD** — `hudVisible()`, `pantallaCompleta()`. ⛶ siempre; ⬅️/⭐ en juego.
- **CONTROLES** — `pintarControles(tipo)` (`none|teclado|galeria|frases|bloques|
  taller`); el teclado de letras se pinta (si `tecladoEnPantalla()`) en
  `teclado`/`galeria`/`bloques`, y entonces añade `body.con-teclado` (el CSS
  comprime el juego). `taller` solo pinta una barra (🔊 Leer · ⬅️ Quitar ·
  🗑️ Vaciar); su entrada de piezas es la PALETA en `#app`.
- **PWA** — `registrarSW()` (solo bajo http/https; en `file://` no hace nada).

**`bloques.js`** (IIFE; toma helpers de `LV`) — **SISTEMA DE BLOQUES reutilizable**
(base para futuros juegos: tetris, construcciones…). NO conoce objetivos ni
victorias; solo piezas y reconocimiento de palabras:
- `crearBloque(spec,opts)` / `bloqueFantasma(spec,opts)` → nodo `.bloque` (Lego,
  con estuds), `dataset.texto/tipo`, color, `opts.onTap`. `spec = {tipo:
  "letra"|"silaba"|"palabra", texto, color?, e?}`.
- `descomponer(item,gran)` → specs por `"letra"|"silaba"|"palabra"` (sílaba usa
  `item.sil` curado si existe, si no `silabear()`).
- `silabear(palabra)` → silabeador heurístico español **best-effort** (acentos
  fuera, ñ dentro). **OJO**: los modos guiados NO lo usan (usan `sil` curado).
- `colorBloque/encajar/normalizar`. `esPalabra(w)` → consulta `LV.DIC` (Set del
  diccionario; si aún no cargó, `false`). `invLetras/invSilabas/invPalabras` →
  inventarios de piezas para la paleta del taller.

**`modos.js`** (IIFE; toma helpers de `LV`):
- `MODOS` (lista de los 17 modos; cada uno con `id`, `cat`, `icono`, `nombre`,
  `voz`; cada `card` lleva `data-modo`), `CATS` (orden y título de las secciones
  del menú), `INICIAR` (mapa id→`iniciar*`), `abrirModo()`.
- Pantallas: `pantallaIntro/Home/Perfil` + una `iniciar*`/`nueva*` por modo.
  `pantallaHome` agrupa las tarjetas por `cat` bajo cada título de `CATS`,
  conservando el índice GLOBAL en `MODOS` (selMenu, números 1-9, navegación).
- **ENTRADA** — **clave**: `manejarTecla(k)` es el router central por
  `S.pantalla`; se expone como `LV.manejarTecla` (lo invocan el `keydown`
  físico y cada botón/tecla táctil del núcleo). Para añadir teclas, edita ahí.
- **ARRANQUE** — `pintarHud()` → `LV.registrarSW()` → `pantallaIntro()`.

### Los 17 modos (`S.pantalla`), por categoría (`cat`)
**Toca y juega (`toca`, sin teclear):** `explora` · `toca` (toca dibujo →
palabra) · `caza` (toca la letra pedida) · `parejas` (memory letra↔dibujo).
**Conoce las letras (`letras`):** `galeria` · `busca`.
**Sílabas y palabras (`escribe`):** `silabas` · `palabras` · `falta` · `dictado`.
**Vocabulario nuevo (`vocab`, SIN emoji, fuente `VOCAB`):** `lee` (lectura
rápida: Espacio/"Siguiente ▶", no se teclea) · `vocab` (lee y TECLEA la palabra).
**Lee historias (`lee`):** `frases` · `cuentos`.
**Construye con bloques (`bloques`, motor `bloques.js`):** `taller` · `construir`
· `tren`.

- Los juegos de **pulsar** usan `pintarControles("none")` (sin teclado; tienen
  sus propios objetivos grandes tocables). Aun así aceptan teclado físico
  donde tiene sentido (p. ej. `caza` por la letra; `toca` con Espacio para
  barajar).
- **`palabras`/`dictado`/`falta`** usan `poolEscritura()` = `PALABRAS` (con
  emoji) **+** `VOCAB` (sin emoji), filtrado por nivel: al subir la dificultad
  entran palabras nuevas/largas. Quien pinte el dibujo debe tolerar `item.e`
  ausente (ya lo hacen: `pintarEscritura` y `nuevaFalta` con guardas). `toca`
  sigue usando `poolPalabras()` (solo emoji).
- **`lee`/`vocab`** usan `poolVocab()` (solo `VOCAB`); `vocab` reutiliza
  `pintarEscritura/escribirLetra/completarEscritura` (con `dibujo=null`).
- **`frases`** = lectura guiada (Espacio/"Siguiente ▶", no se teclea).
- **`cuentos`** = lectura ACTIVA: el niño **teclea cada palabra entera**.
  Cada cuento = `{ titulo, e, paginas:[{t, e}] }` con frases CORTAS. El texto
  mostrado puede llevar tildes; `normaliza()` las pasa a letras base (conserva
  la `ñ`). Añadir cuentos = entradas en `CUENTOS` (en `data.js`).
- **`taller`** (🧱 libre, MÁXIMA libertad): paleta con pestañas (Sílabas/Letras/
  Palabras); toca piezas (o teclea letras) y se acumulan en el **muro** (`S.taller
  = {piezas, cat, ultima}`). Si la concatenación es palabra de verdad (`esPalabra`)
  → ✨ celebra + lee + ⭐; si no, se lee igual (inventada). Hitos de altura cada
  10 piezas. Sin `S.celebrando` (flujo libre). Acciones: Enter=leer, Backspace=
  quitar, Delete=vaciar (botones de la barra `taller`).
- **`construir`** (🏗️ torre) y **`tren`** (🚂 horizontal): guiados con palabra
  objetivo de `BLOQUES_PALABRAS`. Comparten `nuevaObra/pintarObraGuiada/
  colocarSilaba/completarObra` y ramifican por `S.pantalla`. Tap en la pieza
  correcta o teclear sus letras (`teclearLetraBloque`) la **encaja** en orden;
  error = sonidito + pista a los 2 intentos. Distractores en bandeja = `S.nivel`.

### Ajustes (en el menú, tecla o tocar el badge)
`P` perfil (quién juega) · `V` voz on/off · `F` nombre/sonido · `L` abc/ABC ·
`N` nivel (Fácil/Medio/Difícil) · `T` teclado QWERTY/ABC · `K` teclado en
pantalla (Auto/Siempre/Nunca).

## 5. Cómo probar

No hay navegador en el entorno, pero hay un **test de humo con jsdom** que
carga los scripts (incl. `bloques.js` y `diccionario.js`) y simula teclado
físico **y** toques en los 17 modos (incluidos los 2 de vocabulario y los 3 de
bloques), más perfiles
y la separación PC/tablet. También verifica el diccionario (`LV.DIC`,
`esPalabra`) y la integridad de las sílabas curadas (`sil.join("")===w`).

```bash
node --check data.js && node --check core.js && node --check bloques.js && node --check modos.js  # sintaxis

# instalar jsdom (la red a npm SÍ funciona; vercel.com NO, ver §6)
npm install jsdom --no-save --prefix /tmp/jsdomtest

# el test busca jsdom en node_modules o en /tmp/jsdomtest
JSDOM_DIR=/tmp/jsdomtest node test/smoke.js
```

Debe imprimir `✅ SIN ERRORES`. El test stubea `speechSynthesis`,
`AudioContext`, `requestAnimationFrame`, `getBoundingClientRect`, la
Fullscreen API y **`matchMedia`** (simula una tablet de puntero "grueso" para
que se pinte el teclado en pantalla). **Ejecútalo siempre tras tocar el JS.**
Al añadir un modo nuevo, **añade su recorrido** al test (las tarjetas se
seleccionan por `data-modo`).

> Verificación visual real (opcional): servir con `python3 -m http.server` y
> abrir en el navegador, o usar el preview de Vercel (§6).

## 6. Despliegue (IMPORTANTE)

- **Cómo se despliega:** integración **GitHub → Vercel**. Push a una rama crea
  un *preview*; merge a **`main`** actualiza **producción**. No hay que tocar
  Vercel a mano.
- **Restricción de red del entorno Claude:** este sandbox **bloquea
  `vercel.com` / `api.vercel.com`** ("Host not in allowlist"). Por eso **NO se
  puede** usar el CLI ni la API de Vercel desde aquí. (npm sí funciona.)
- **MCP de Vercel:** hay un servidor MCP de Vercel conectado a la cuenta del
  usuario que **sí** llega a Vercel (corre fuera del sandbox). Sirve para
  **leer** despliegues y **verificar** URLs, no para desplegar:
  - `list_deployments`, `get_project`, `list_projects`, `list_teams`.
  - `web_fetch_vercel_url` → descarga una URL de Vercel (autenticando como el
    usuario) para comprobar el contenido desplegado.
  - `deploy_to_vercel` **NO despliega**: solo devuelve instrucciones.
- **IDs útiles:**
  - Team: `team_l8PhmvuV6TYXf87kaVVxX8zV` (slug `arkus0s-projects`).
  - Proyecto `android`: `prj_a0hm9namX6bi1uPtdVthwfvR4GdS`.
  - Dominio producción: `android-coral-ten.vercel.app`.

### Flujo de trabajo git
- **Desarrollar en** la rama `claude/magical-heisenberg-0ongL` (o la que indique
  la sesión), commit + push.
- Para actualizar producción: **abrir PR a `main` y hacer merge** (con permiso
  del usuario). Cada merge a `main` dispara el deploy de producción.
- Tras desplegar, verificar con `web_fetch_vercel_url` sobre el dominio de
  producción (revisar un marcador del cambio, p.ej. en `index.html` o `modos.js`).

## 7. Convenciones y gotchas

- **Una sola vía de entrada:** todo pasa por `manejarTecla(k)`. Los botones
  táctiles y el teclado en pantalla solo llaman a esa función. No dupliques
  lógica en los handlers de clic.
- **Tildes:** en `PALABRAS` y sílabas (se teclean directamente) **no** se usan
  tildes. En `FRASES` (solo lectura) sí. En `CUENTOS` el texto mostrado puede
  llevar tildes, pero al teclear se normalizan con `normaliza()` (quita tildes,
  conserva la `ñ`). Para añadir un modo nuevo donde se teclee, normaliza igual.
- **Mantener clásico:** nada de `import`/`export`, `fetch` ni dependencias en
  runtime. Comparten el objeto global `LV`; **respeta el orden de carga**
  (`data.js` → `core.js` → `bloques.js` → `modos.js`; `diccionario.js` defer).
  Debe seguir funcionando con doble clic en `index.html` (por eso el SW solo se
  registra bajo http/https).
- **Bloques:** el motor (`bloques.js`) NO conoce objetivos/victorias (solo
  piezas + `esPalabra`); la lógica de cada juego vive en `modos.js`. El silabeo
  de los modos guiados usa el `sil` **curado** de `BLOQUES_PALABRAS`, nunca
  `silabear()` (heurístico best-effort, solo para reutilización futura).
- **Diccionario:** `diccionario.js` está **autogenerado** (no editar a mano);
  regenerar con `node tools/gen-diccionario.js` (instala antes
  `an-array-of-spanish-words`, MIT). Es grande (~1,2 MB) y se carga con `defer`;
  `esPalabra()` tolera que `LV.DIC` aún no esté. Si lo regeneras, **sube `CACHE`**.
- **PWA:** si añades/renombras archivos del runtime, **actualízalos en
  `sw.js` (`ASSETS`) y sube `CACHE`** (p. ej. `v1`→`v2`) para forzar la
  actualización offline. (Ya está en `v2`.) Los iconos se regeneran con
  `node tools/gen-icons.js`.
- **Perfiles:** no escribas en `localStorage` a mano; cambia `S.*` y llama a
  `LV.persistir()` (vuelca al perfil activo). El progreso es **por niño**.
- **Tamaños:** usa `personaje(letra, rem, ...)`; el `rem` se limita con vmin
  para que quepa en tablet/móvil (`tam()`).
- **Añadir contenido** = editar las tablas de **`data.js`** (`INFO`, `PALABRAS`,
  `VOCAB`, `FRASES`, `CUENTOS`, `CONS_SIL`, `TRABADAS`). Añadir un **modo** =
  entrada en `MODOS` (con su `cat`, que debe existir en `CATS`) + función
  `iniciar*` (en `modos.js`) + `INICIAR[id]` + rama en `manejarTecla` + (si
  teclea) `pintarControles` + **recorrido en `smoke.js`** (y la cuenta de
  tarjetas). Palabras de `VOCAB`: sin tildes, 2-10 letras y en `LV.DIC`.
- **Secretos:** nunca commitear tokens/keys. (El usuario compartió un token de
  Vercel en el chat que debe **revocar**; no se usó porque la red lo bloquea.)
- **No** incluir identificadores de modelo ni metadatos de la sesión en
  commits/PRs/código.

## 8. Roadmap / próximas ideas (acordadas con el usuario)

### Hecho recientemente
- **Sistema de bloques reutilizable** (`bloques.js`) + 3 modos: **🧱 Taller
  libre** (máxima libertad; reconoce palabras reales con diccionario de +364k),
  **🏗️ Construir palabras** (torre) y **🚂 Tren de palabras** (horizontal).
  Diccionario autogenerado (`tools/gen-diccionario.js` → `diccionario.js`).
- **Refactor en `data.js` / `core.js` / `modos.js`** (sigue siendo doble-clic).
- **Juegos de pulsar** (lo que más engancha): `toca`, `caza`, `parejas`. El
  niño se cansa de teclear muchas letras seguidas. (El antiguo `empieza` se
  retiró: con pocos emojis no se distinguía qué dibujo era cada palabra.)
- **Vocabulario sin emoji** (`VOCAB`): banco curado por nivel, validado contra
  el diccionario. Modos `lee` (lectura rápida) y `vocab` (lee y teclea); además
  `palabras`/`dictado`/`falta` mezclan ese vocabulario al subir de dificultad.
- **Menú por secciones** (categorías con título) para navegar mejor los modos.
- **Perfiles por niño** con exportar/importar copia (botones 💾/📂 en Perfil).
- **PWA real** (manifest + `sw.js` offline + icono propio).
- **Separación PC/tablet** del teclado en pantalla (`kbModo` auto/si/no) y
  ajuste para que en tablet no tape las letras (`body.con-teclado` + tamaños
  de tecla por vw/vh).

### Pendientes
- **Más cuentos** (al usuario le ilusiona especialmente: "leer = conocer
  historias"). Hay 9 (clásicos, Grimm y uno de un ratón); se pueden añadir más
  o más largos en `CUENTOS`. Nota IP: evitar personajes con copyright (p. ej.
  Mickey) usando equivalentes genéricos.
- **Panel para padres**: ya se registran aciertos/fallos por letra
  (`stats{letra:{ok,fail}}` en cada perfil, vía `LV.registrar()`); falta la
  **pantalla** que muestre qué letras cuestan más.
- **Más juegos de pulsar** y temas de palabras (animales, espacio…).
- **Forma la palabra** (anagramas) y **adivinanzas**.
```
