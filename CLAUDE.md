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
- Versión con **9 modos**, **3 niveles**, teclado físico + táctil, voz por
  nombre/sonido, colección de 27 letras y modo **Cuentos**.

## 3. Stack y archivos

Sitio **estático, sin build, sin frameworks, sin dependencias en runtime**.
Pensado para abrirse incluso con **doble clic** en `index.html` (por eso se usa
JavaScript clásico con `<script src>`, **no ES modules**, que romperían por CORS
en `file://`).

```
index.html   Estructura: #app (juego), #controles (teclado táctil), #fx (confeti) + metas PWA
style.css    Apariencia, animaciones de las letras, layout responsive y teclado en pantalla
game.js      TODA la lógica (IIFE, ES5: var + function declarations)
test/smoke.js  Test de humo con jsdom (ver §5)
README.md    Guía para el usuario/jugador + estado + roadmap
CLAUDE.md    Este documento
```

- **Gráficos:** emojis (no hay imágenes). Fuente: Comic Sans / redondeada.
- **Voz:** Web Speech API (`speechSynthesis`), español (`es-ES`).
- **Sonidos:** WebAudio (osciladores), sin archivos de audio.
- **Persistencia:** `localStorage` clave `"letrasVivas"` → `{voz, modoVoz, minus,
  nivel, kbLayout, estrellas, desc[]}`.

## 4. Mapa de `game.js`

Es un único IIFE con secciones numeradas:

1. **DATOS** — `INFO` (cada letra: `n` nombre, `p` profesión, `e` emoji,
   `s` sonido fonético), `PALABRAS` (`w` palabra, `e` emoji, `d` dificultad 0/1/2),
   `FRASES`, `CUENTOS` (título + páginas), `CONS_SIL`, `TRABADAS`,
   `LAYOUT_QWERTY`/`LAYOUT_ABC`, `NIVELES`, `ABECEDARIO`.
2. **ESTADO** — objeto `S` (pantalla actual, ajustes, sub-estados por modo) +
   `persistir()`.
3. **AUDIO** — `hablar()`, `decirLetra()` (respeta nombre/sonido),
   `pedirLetra()`, efectos `sfx*`.
4. **UTILIDADES DOM** — `el/limpiar/mostrar/azar`, `tap()` (asocia toque/clic),
   `personaje()` (letra viva), `ranura()` (hueco oculto), `revelar()`,
   `tam(rem)` (tamaño responsive `min(rem, 1.7*vmin)`).
5. **EFECTOS** — `confeti()`, `cartel()`, `sumarEstrella()`, `descubrir()`.
6. **HUD** — `hudVisible()`, `pantallaCompleta()` (Fullscreen API con prefijo
   webkit). El botón **⛶ está siempre**; ⬅️ y ⭐ solo dentro de un juego.
7. **CONTROLES TÁCTILES** — `teclado()` (genera el teclado en pantalla según
   `S.kbLayout` y `S.minus`), `pintarControles(tipo)` con tipos
   `none | teclado | galeria | frases`.
8. **PANTALLAS/MENÚ** — `MODOS` (lista de los 9 modos) y una función
   `iniciar*`/`nueva*` por modo que renderiza dentro de `#app`.
9. **ENTRADA** — **clave**: `manejarTecla(k)` es el router central por
   `S.pantalla`. Tanto el `keydown` físico como cada botón táctil llaman a
   `manejarTecla(...)`. Para añadir teclas/acciones, edita ahí.
10. **ARRANQUE** — `pantallaIntro()`.

### Los 9 modos (`S.pantalla`)
`explora` · `galeria` · `busca` · `silabas` · `palabras` · `falta` (letra que
falta) · `dictado` (escucha y escribe) · `frases` · `cuentos`.

- **`frases`** = lectura guiada: se pulsa Espacio / "Siguiente ▶" y oye cada
  palabra (no se teclea).
- **`cuentos`** = lectura ACTIVA: el niño **teclea cada palabra entera** para
  avanzar (decisión del usuario), oye la palabra al completarla, avanza por
  páginas y celebra al terminar la historia. Usa controles de **teclado**.
  Cada cuento = `{ titulo, e, paginas:[{t, e}] }` con frases CORTAS. El texto
  mostrado puede llevar tildes/mayúsculas; `normaliza()` las pasa a letras base
  para teclear (conserva la `ñ`). Añadir cuentos = añadir entradas a `CUENTOS`.

### Ajustes (en el menú, tecla o tocar el badge)
`V` voz on/off · `F` nombre/sonido · `L` abc/ABC · `N` nivel (Fácil/Medio/Difícil)
· `T` teclado QWERTY/ABC.

## 5. Cómo probar

No hay navegador en el entorno, pero hay un **test de humo con jsdom** que
simula teclado físico **y** toques en los 9 modos.

```bash
node --check game.js            # comprueba sintaxis

# instalar jsdom (la red a npm SÍ funciona; vercel.com NO, ver §6)
npm install jsdom --no-save --prefix /tmp/jsdomtest

# el test busca jsdom en node_modules o en /tmp/jsdomtest
JSDOM_DIR=/tmp/jsdomtest node test/smoke.js
```

Debe imprimir `✅ SIN ERRORES`. El test stubea `speechSynthesis`,
`AudioContext`, `requestAnimationFrame`, `getBoundingClientRect` y la
Fullscreen API. **Ejecútalo siempre tras tocar `game.js`.**

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
  producción (revisar un marcador del cambio, p.ej. en `index.html` o `game.js`).

## 7. Convenciones y gotchas

- **Una sola vía de entrada:** todo pasa por `manejarTecla(k)`. Los botones
  táctiles y el teclado en pantalla solo llaman a esa función. No dupliques
  lógica en los handlers de clic.
- **Tildes:** en `PALABRAS` y sílabas (se teclean directamente) **no** se usan
  tildes. En `FRASES` (solo lectura) sí. En `CUENTOS` el texto mostrado puede
  llevar tildes, pero al teclear se normalizan con `normaliza()` (quita tildes,
  conserva la `ñ`). Para añadir un modo nuevo donde se teclee, normaliza igual.
- **Mantener clásico:** nada de `import`/`export`, `fetch` ni dependencias.
  Debe seguir funcionando con doble clic en `index.html`.
- **Tamaños:** usa `personaje(letra, rem, ...)`; el `rem` se limita con vmin
  para que quepa en tablet/móvil (`tam()`).
- **Añadir contenido** = editar las tablas de la sección 1 (`INFO`, `PALABRAS`,
  `FRASES`, `CUENTOS`, `CONS_SIL`, `TRABADAS`). Añadir un **modo** = entrada en
  `MODOS` + función `iniciar*` + rama en `manejarTecla` + (si toca)
  `pintarControles`.
- **Secretos:** nunca commitear tokens/keys. (El usuario compartió un token de
  Vercel en el chat que debe **revocar**; no se usó porque la red lo bloquea.)
- **No** incluir identificadores de modelo ni metadatos de la sesión en
  commits/PRs/código.

## 8. Roadmap / próximas ideas (acordadas con el usuario)

- **Más cuentos** (al usuario le ilusiona especialmente: "leer = conocer
  historias"). Hay 9 (clásicos, Grimm y uno de un ratón); se pueden añadir más
  o más largos en `CUENTOS`. Nota IP: evitar personajes con copyright (p. ej.
  Mickey) usando equivalentes genéricos.
- **Panel para padres**: qué letras/sílabas le cuestan más (registrar aciertos
  /fallos por letra en `localStorage` y mostrar un resumen).
- **Forma la palabra** (anagramas con letras desordenadas).
- **Adivinanzas** (pista + escribir la respuesta).
- **Temas de palabras** elegibles (animales, espacio, dinosaurios…).
```
