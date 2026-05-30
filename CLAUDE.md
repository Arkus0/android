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
- Versión con **13 modos** (5 de **pulsar** + 8 de **escribir/leer**),
  **3 niveles**, teclado físico + táctil, voz por nombre/sonido, colección de
  27 letras, **Cuentos**, **perfiles por niño** (con copia exportable) y
  **PWA** instalable/offline.

## 3. Stack y archivos

Sitio **estático, sin build, sin frameworks, sin dependencias en runtime**.
Pensado para abrirse incluso con **doble clic** en `index.html` (por eso se usa
JavaScript clásico con `<script src>`, **no ES modules**, que romperían por CORS
en `file://`).

La lógica está **separada en 3 scripts clásicos** que comparten el espacio de
nombres global **`LV`** y se cargan EN ORDEN (`data.js` → `core.js` → `modos.js`).
No son módulos: cada uno escribe/lee en `LV`.

```
index.html        #app (juego), #controles (teclado táctil), #fx (confeti) + metas/manifest PWA
style.css         Apariencia, animaciones, layout responsive, teclado en pantalla y juegos de pulsar
data.js           DATOS: LV.INFO, LV.PALABRAS, LV.FRASES, LV.CUENTOS, layouts, niveles, avatares…
core.js           MOTOR: perfiles+persistencia, audio, DOM/personajes, efectos, HUD, controles,
                  detección PC/tablet, registro del SW. Expone helpers en LV.
modos.js          MODOS: menú, pantalla de perfiles y los 13 juegos + manejarTecla() (entrada única).
manifest.webmanifest  Manifiesto PWA (icono, display fullscreen, theme).
sw.js             Service worker: cachea la app shell para offline (sube CACHE al cambiar archivos).
icon.svg / icon-*.png  Iconos de la app (PNG generados con tools/gen-icons.js).
tools/gen-icons.js     Generador de los PNG del icono (Node puro, zlib; herramienta de un solo uso).
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

## 4. Mapa del código (data.js / core.js / modos.js)

Todo comparte el objeto global **`LV`**. Orden de carga obligatorio:
`data.js` → `core.js` → `modos.js`.

**`data.js`** — solo datos en `LV.*`: `INFO` (cada letra: `n` nombre, `p`
profesión, `e` emoji, `s` sonido), `PALABRAS` (`w/e/d` dificultad 0/1/2),
`FRASES`, `CUENTOS` (título + páginas), `CONS_SIL`, `TRABADAS`,
`LAYOUT_QWERTY`/`LAYOUT_ABC`, `NIVELES`, `ABECEDARIO`, `ORDEN_ABC`, `VOCALES`,
`AVATARES`.

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
- **CONTROLES** — `pintarControles(tipo)` (`none|teclado|galeria|frases`); el
  teclado de letras solo se pinta si `tecladoEnPantalla()` y entonces añade
  `body.con-teclado` (el CSS comprime el juego para que no tape letras).
- **PWA** — `registrarSW()` (solo bajo http/https; en `file://` no hace nada).

**`modos.js`** (IIFE; toma helpers de `LV`):
- `MODOS` (lista de los 13 modos; cada `card` lleva `data-modo`), `INICIAR`
  (mapa id→`iniciar*`), `abrirModo()`.
- Pantallas: `pantallaIntro/Home/Perfil` + una `iniciar*`/`nueva*` por modo.
- **ENTRADA** — **clave**: `manejarTecla(k)` es el router central por
  `S.pantalla`; se expone como `LV.manejarTecla` (lo invocan el `keydown`
  físico y cada botón/tecla táctil del núcleo). Para añadir teclas, edita ahí.
- **ARRANQUE** — `pintarHud()` → `LV.registrarSW()` → `pantallaIntro()`.

### Los 13 modos (`S.pantalla`)
**Pulsar (sin teclear):** `explora` · `toca` (toca dibujo → palabra) ·
`empieza` (¿cuál empieza por…?) · `caza` (toca la letra pedida) ·
`parejas` (memory letra↔dibujo).
**Escribir/leer:** `galeria` · `busca` · `silabas` · `palabras` ·
`falta` · `dictado` · `frases` · `cuentos`.

- Los juegos de **pulsar** usan `pintarControles("none")` (sin teclado; tienen
  sus propios objetivos grandes tocables). Aun así aceptan teclado físico
  donde tiene sentido (p. ej. `caza` y `empieza` por la letra; `toca` con
  Espacio para barajar).
- **`frases`** = lectura guiada (Espacio/"Siguiente ▶", no se teclea).
- **`cuentos`** = lectura ACTIVA: el niño **teclea cada palabra entera**.
  Cada cuento = `{ titulo, e, paginas:[{t, e}] }` con frases CORTAS. El texto
  mostrado puede llevar tildes; `normaliza()` las pasa a letras base (conserva
  la `ñ`). Añadir cuentos = entradas en `CUENTOS` (en `data.js`).

### Ajustes (en el menú, tecla o tocar el badge)
`P` perfil (quién juega) · `V` voz on/off · `F` nombre/sonido · `L` abc/ABC ·
`N` nivel (Fácil/Medio/Difícil) · `T` teclado QWERTY/ABC · `K` teclado en
pantalla (Auto/Siempre/Nunca).

## 5. Cómo probar

No hay navegador en el entorno, pero hay un **test de humo con jsdom** que
carga los 3 scripts y simula teclado físico **y** toques en los 13 modos
(incluidos los 4 juegos de pulsar), más perfiles y la separación PC/tablet.

```bash
node --check data.js && node --check core.js && node --check modos.js  # sintaxis

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
  (`data.js` → `core.js` → `modos.js`). Debe seguir funcionando con doble clic
  en `index.html` (por eso el SW solo se registra bajo http/https).
- **PWA:** si añades/renombras archivos del runtime, **actualízalos en
  `sw.js` (`ASSETS`) y sube `CACHE`** (p. ej. `v1`→`v2`) para forzar la
  actualización offline. Los iconos se regeneran con `node tools/gen-icons.js`.
- **Perfiles:** no escribas en `localStorage` a mano; cambia `S.*` y llama a
  `LV.persistir()` (vuelca al perfil activo). El progreso es **por niño**.
- **Tamaños:** usa `personaje(letra, rem, ...)`; el `rem` se limita con vmin
  para que quepa en tablet/móvil (`tam()`).
- **Añadir contenido** = editar las tablas de **`data.js`** (`INFO`, `PALABRAS`,
  `FRASES`, `CUENTOS`, `CONS_SIL`, `TRABADAS`). Añadir un **modo** = entrada en
  `MODOS` + función `iniciar*` (en `modos.js`) + `INICIAR[id]` + rama en
  `manejarTecla` + (si teclea) `pintarControles` + **recorrido en `smoke.js`**.
- **Secretos:** nunca commitear tokens/keys. (El usuario compartió un token de
  Vercel en el chat que debe **revocar**; no se usó porque la red lo bloquea.)
- **No** incluir identificadores de modelo ni metadatos de la sesión en
  commits/PRs/código.

## 8. Roadmap / próximas ideas (acordadas con el usuario)

### Hecho recientemente
- **Refactor en `data.js` / `core.js` / `modos.js`** (sigue siendo doble-clic).
- **4 juegos de pulsar** (lo que más engancha): `toca`, `empieza`, `caza`,
  `parejas`. El niño se cansa de teclear muchas letras seguidas.
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
