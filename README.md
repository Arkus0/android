# 🅰️ Las Letras Vivas

Un juego para que los peques **aprendan a leer jugando**.
Cada letra es un personaje con ojos, sonrisa y su propia **profesión**
("la **M** de **M**ago 🪄", "la **P** de **P**intor 🎨"), lo que ayuda a
asociar cada letra con su sonido inicial.

Está pensado para niños que **ya empiezan a leer pero les cuesta**:
sin prisa, sin "has perdido", con voz que lo lee todo en alto y muchos
ánimos. Hay **juegos de pulsar** rápidos (tocar dibujos, cazar letras,
parejas…) para cuando se cansa de teclear, y juegos de escribir/leer para
practicar más a fondo.

**Funciona con teclado físico Y en tablet/móvil** (trae su propio teclado
en pantalla con botones grandes, no hace falta ratón ni el teclado del
sistema). En **PC el teclado en pantalla no aparece** (se usa el físico) y
en **tablet** se ajusta para no tapar el juego.

Es además una **app instalable (PWA)**: tiene icono propio, **funciona sin
internet** y se abre a pantalla completa. Guarda **un perfil por niño** (con
su progreso) y permite **exportar/importar** una copia para no perderlo.

## ▶️ Cómo jugar

- **En ordenador:** doble clic en `index.html` (o abre la web). Se juega con
  el teclado o tocando.
- **En tablet/móvil:** abre la web y toca. Para jugar a **pantalla completa**,
  usa el botón **⛶** (arriba a la derecha) o **instala la app** ("Añadir a
  inicio" / "Instalar app"): aparece con su icono propio, se abre a pantalla
  completa y **funciona sin internet** (PWA con service worker).

No necesita internet (tras la primera carga) ni instalar nada obligatorio.
La voz funciona en Chrome, Edge y Safari modernos.

> Si abres el archivo local y no se oye la voz, ábrelo con un servidor:
> `python3 -m http.server` y entra en `http://localhost:8000`.

## 🎮 Controles (teclado o pantalla táctil)

Todo lo del teclado tiene su equivalente **tocable** en pantalla (teclado de
letras, flechas, botón "Siguiente ▶" y "🔊 Repetir", y las tarjetas del menú).

| Tecla / Toque | Qué hace |
|---------------|----------|
| **Una letra** (física o en pantalla) | Acción principal del juego |
| **Tocar una tarjeta** / Flechas + Enter / **1…9** | Elegir modo |
| **Espacio** / botón **Siguiente ▶** | Pasar a lo siguiente · avanzar palabra (Frases y Cuentos) |
| **Enter** / botón **🔊** | Repetir la voz |
| **Esc** / botón **⬅️** | Volver al menú |
| Botón **⛶** | Pantalla completa |

### Ajustes (en el menú: toca el badge o pulsa la tecla)

| Tecla | Ajuste |
|-------|--------|
| **P** | **Perfil**: quién juega (crear/cambiar de niño, guardar/cargar copia) |
| **V** | Activar / quitar la voz |
| **F** | La voz dice el **Nombre** (eme) o el **Sonido** (mmm) de la letra |
| **L** | Letras en minúsculas `abc` o MAYÚSCULAS `ABC` |
| **N** | Nivel: **Fácil → Medio → Difícil** |
| **T** | Teclado en pantalla en **QWERTY** o en orden **ABC** |
| **K** | Teclado en pantalla: **Auto** (PC no / tablet sí) · **Siempre** · **Nunca** |

## 🧩 Los 13 modos (de pulsar a leer)

**Juegos de pulsar** (rápidos, sin teclear — para cuando se cansa de escribir):

1. **🅰️ Explorar** — Pulsa cualquier letra y cobra vida: la dice en alto y
   enseña su profesión. Ideal para perder el miedo al teclado.
2. **🖐️ Toca y descubre** — Un tablero de dibujos; toca uno y **aparece su
   palabra** escrita con letras-personaje y se oye. Pulsar y descubrir.
3. **🔤 ¿Empieza por…?** — Sale una letra grande y varios dibujos; toca el que
   **empieza por esa letra** (🎨 Pintor → P). Refuerza el sonido inicial.
4. **⚡ Caza la letra** — Varias letras en pantalla; toca, rápido, la que se
   pide. Versión ágil de "Encuentra la letra", solo a toques.
5. **🃏 Parejas** — Memoria: encuentra la pareja **letra ↔ dibujo**.

**Juegos de escribir y leer:**

6. **📚 Conoce las letras** — Galería del abecedario completo: con las flechas
   recorre las 27 letras (o pulsa una tecla para saltar a ella) y descúbrelas.
7. **🔎 Encuentra la letra** — Aparece una letra; hay que pulsar esa tecla.
   Empieza solo con las vocales y va añadiendo letras según acierta.
8. **🧩 Sílabas** — Lee y escribe sílabas (ma, pe, li...). En Difícil aparecen
   sílabas trabadas (bra, pla, tro...).
9. **📖 Palabras** — Dibujo + palabra; la escribe letra a letra.
10. **🕵️ Letra que falta** — Una palabra con un hueco (en Difícil, dos); hay que
    pulsar la letra que falta. Razonar + leer.
11. **👂 Escucha y escribe** — Oye la palabra y la escribe sin verla (con dibujo
    de ayuda; en Difícil, sin dibujo: dictado puro).
12. **💬 Frases** — Lee una frase, palabra a palabra: cada Espacio resalta y lee
    la siguiente palabra. Fluidez y comprensión.
13. **📕 Cuentos** — Lee cuentos enteros **escribiendo cada palabra** para
    avanzar (así aprende qué letras la forman) y oyéndola al completarla.
    Incluye clásicos y de los Hermanos Grimm (Los tres cerditos, Caperucita,
    Los músicos de Bremen, Ricitos de oro, El patito feo…). ✨

En todos los modos: si se equivoca **no pasa nada malo**, solo un sonidito
suave; tras un par de intentos el juego le da una pista. Cada acierto suma
una ⭐ (fiesta de confeti cada 10) y va completando la colección 📚 de las
27 letras. **El progreso y los ajustes se guardan por perfil en el
navegador**, y puedes **descargar una copia** (botón 💾 en Perfil) para
pasarla a otro dispositivo o recuperarla con 📂.

### Niveles
- **Fácil:** palabras de 3 letras, sílabas simples, un hueco, dictado con dibujo.
- **Medio:** palabras de 4-5 letras.
- **Difícil:** palabras con sílabas trabadas, sílabas trabadas, dos huecos y
  dictado sin dibujo.

## 🛠️ Para quien quiera tocar el código

Sin frameworks ni compilación (sigue abriéndose con doble clic en
`index.html`). La lógica está separada en **tres scripts clásicos** que se
cargan en orden:

- `index.html` — estructura (`#app`, `#controles`, `#fx`) + metas PWA.
- `style.css` — apariencia, animaciones y layout responsive/táctil.
- `data.js` — **datos** del juego (letras, palabras, frases, cuentos…).
- `core.js` — **motor**: perfiles, persistencia, audio, efectos, HUD,
  controles táctiles y detección PC/tablet.
- `modos.js` — **modos**: menú, perfiles (pantalla) y los 13 juegos, con la
  entrada unificada `manejarTecla()`.
- `manifest.webmanifest` + `sw.js` + `icon*.png/svg` — la PWA (instalable,
  offline). Los iconos se generan con `node tools/gen-icons.js`.

Para cambiar el contenido, edita las tablas de `data.js`: `INFO` (letras,
profesiones y sonidos), `PALABRAS` (palabras + dibujo + dificultad),
`FRASES`, `CUENTOS`, `CONS_SIL` y `TRABADAS`.

### Probar los cambios
```bash
node --check data.js && node --check core.js && node --check modos.js
npm install jsdom --no-save --prefix /tmp/jsdomtest
JSDOM_DIR=/tmp/jsdomtest node test/smoke.js   # simula teclado y toques en los 13 modos
```

## 📦 Estado y despliegue

- **En producción:** https://android-coral-ten.vercel.app
- Se publica solo: **push a `main` → Vercel despliega producción** (integración
  GitHub↔Vercel). Las ramas generan *previews*.
- Versión actual: 13 modos (5 de pulsar + 8 de escribir/leer), 3 niveles,
  teclado físico + táctil, voz nombre/sonido, colección de letras, cuentos,
  perfiles por niño (con copia exportable) y PWA instalable/offline.

## 🧭 Cómo continuar

Toda la guía técnica para retomar el desarrollo (arquitectura de
`data.js`/`core.js`/`modos.js`, reglas, pruebas, despliegue e IDs de Vercel)
está en **[`CLAUDE.md`](CLAUDE.md)**.

### Ideas pendientes
- Aún más cuentos (y más largos).
- **Panel para padres**: ya se registran aciertos/fallos por letra en cada
  perfil (`stats`); falta una pantalla que muestre qué letras cuestan más.
- "Forma la palabra" (anagramas) y adivinanzas.
- Más juegos de pulsar y temas de palabras elegibles (animales, espacio…).
