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

## 🧩 Los 17 modos (de pulsar a leer y a construir)

En el menú aparecen **agrupados por secciones** (de más fácil a más avanzado).

**👆 Toca y juega** (rápidos, sin teclear — para cuando se cansa de escribir):

1. **🅰️ Explorar** — Pulsa cualquier letra y cobra vida: la dice en alto y
   enseña su profesión. Ideal para perder el miedo al teclado.
2. **🖐️ Toca y descubre** — Un tablero de dibujos; toca uno y **aparece su
   palabra** escrita con letras-personaje y se oye. Pulsar y descubrir.
3. **⚡ Caza la letra** — Varias letras en pantalla; toca, rápido, la que se
   pide. Versión ágil de "Encuentra la letra", solo a toques.
4. **🃏 Parejas** — Memoria: encuentra la pareja **letra ↔ dibujo**.

**🔤 Conoce las letras:**

5. **📚 Conoce las letras** — Galería del abecedario completo: con las flechas
   recorre las 27 letras (o pulsa una tecla para saltar a ella) y descúbrelas.
6. **🔎 Encuentra la letra** — Aparece una letra; hay que pulsar esa tecla.
   Empieza solo con las vocales y va añadiendo letras según acierta.

**🧩 Sílabas y palabras** (escribir con dibujo de ayuda):

7. **🧩 Sílabas** — Lee y escribe sílabas (ma, pe, li...). En Difícil aparecen
   sílabas trabadas (bra, pla, tro...).
8. **📖 Palabras** — Lee la palabra y la escribe letra a letra. Al subir de
   nivel entran palabras **nuevas y más largas** (vocabulario sin dibujo).
9. **🕵️ Letra que falta** — Una palabra con un hueco (en Difícil, dos); hay que
   pulsar la letra que falta. Razonar + leer.
10. **👂 Escucha y escribe** — Oye la palabra y la escribe sin verla (con dibujo
    de ayuda; en Difícil, sin dibujo: dictado puro y más vocabulario).

**🆕 Vocabulario nuevo** (palabras de verdad, **sin dibujo**, para aprender
mucho vocabulario leyendo):

11. **👀 Lee palabras** — Lectura rápida: aparece una palabra nueva, se lee, y
    con **Siguiente ▶** salta a otra. Mucho vocabulario con poco esfuerzo.
12. **🔡 Palabras nuevas** — Lectura activa: lee la palabra y **la escribe** tú.
    Las palabras salen de un banco curado (cientos de palabras, por nivel).

**📖 Lee historias:**

13. **💬 Frases** — Lee una frase, palabra a palabra: cada Espacio resalta y lee
    la siguiente palabra. Fluidez y comprensión.
14. **📕 Cuentos** — Lee cuentos enteros **escribiendo cada palabra** para
    avanzar (así aprende qué letras la forman) y oyéndola al completarla.
    Incluye clásicos y de los Hermanos Grimm (Los tres cerditos, Caperucita,
    Los músicos de Bremen, Ricitos de oro, El patito feo…). ✨

**🧱 Construye con bloques** (piezas tipo Lego con letras / sílabas / palabras
que se juntan tocándolas):

15. **🧱 Taller de bloques** — **Máxima libertad**: junta letras, sílabas y
    palabras como quiera. Cuando forma una **palabra de verdad** salta un
    ✨ "¡es una palabra!" y la lee en alto (reconoce **+364.000 palabras** del
    español); las **palabras inventadas** también se leen y se celebran 🙂; y
    puede apilar una **torre gigante** de piezas sin ninguna meta. Sin "has
    perdido": aquí no hay forma de equivocarse.
16. **🏗️ Construir palabras** — Una palabra con su dibujo; toca las **sílabas
    en orden** (o teclea sus letras) y van **encajando** en una torre.
17. **🚂 Tren de palabras** — Igual pero en horizontal: engancha los
    **vagones-sílaba** en orden y, al completar la palabra, **el tren arranca**.

En todos los modos: si se equivoca **no pasa nada malo**, solo un sonidito
suave; tras un par de intentos el juego le da una pista. Cada acierto suma
una ⭐ (fiesta de confeti cada 10) y va completando la colección 📚 de las
27 letras. **El progreso y los ajustes se guardan por perfil en el
navegador**, y puedes **descargar una copia** (botón 💾 en Perfil) para
pasarla a otro dispositivo o recuperarla con 📂.

### Niveles
- **Fácil:** palabras cortas, sílabas simples, un hueco, dictado con dibujo.
- **Medio:** palabras de 4-5 letras y más vocabulario sin dibujo.
- **Difícil:** palabras con sílabas trabadas, dos huecos, dictado sin dibujo y
  vocabulario largo (elefante, biblioteca, dinosaurio…).

> La dificultad gradúa también el **vocabulario**: a más nivel, los modos de
> escribir/leer mezclan más palabras nuevas y largas (sin dibujo).

## 🛠️ Para quien quiera tocar el código

Sin frameworks ni compilación (sigue abriéndose con doble clic en
`index.html`). La lógica está separada en **tres scripts clásicos** que se
cargan en orden:

- `index.html` — estructura (`#app`, `#controles`, `#fx`) + metas PWA.
- `style.css` — apariencia, animaciones y layout responsive/táctil.
- `data.js` — **datos** del juego (letras, palabras, frases, cuentos…).
- `core.js` — **motor**: perfiles, persistencia, audio, efectos, HUD,
  controles táctiles y detección PC/tablet.
- `bloques.js` — **sistema de bloques** reutilizable (crear piezas Lego,
  descomponer/silabear, color, encaje y `esPalabra` con el diccionario).
- `modos.js` — **modos**: menú (agrupado por secciones), perfiles (pantalla) y
  los 17 juegos, con la entrada unificada `manejarTecla()`.
- `diccionario.js` — diccionario grande del español (+364.000 palabras,
  autogenerado y comprimido). Se carga con `defer` para no frenar el menú.
- `manifest.webmanifest` + `sw.js` + `icon*.png/svg` — la PWA (instalable,
  offline). Los iconos se generan con `node tools/gen-icons.js` y el
  diccionario con `node tools/gen-diccionario.js`.

Para cambiar el contenido, edita las tablas de `data.js`: `INFO` (letras,
profesiones y sonidos), `PALABRAS` (palabras + dibujo + dificultad), `VOCAB`
(vocabulario sin dibujo para los modos avanzados, por nivel),
`BLOQUES_PALABRAS` (palabras con sílabas cortadas para Construir/Tren),
`FRASES`, `CUENTOS`, `CONS_SIL` y `TRABADAS`.

### Probar los cambios
```bash
node --check data.js && node --check core.js && node --check bloques.js && node --check modos.js
npm install jsdom --no-save --prefix /tmp/jsdomtest
JSDOM_DIR=/tmp/jsdomtest node test/smoke.js   # simula teclado y toques en los 17 modos
```

## 📦 Estado y despliegue

- **En producción:** https://android-coral-ten.vercel.app
- Se publica solo: **push a `main` → Vercel despliega producción** (integración
  GitHub↔Vercel). Las ramas generan *previews*.
- Versión actual: 17 modos (4 de pulsar + 6 de letras/escribir + 2 de
  vocabulario + 2 de leer + 3 de bloques), menú **agrupado por secciones**,
  3 niveles, teclado físico + táctil, voz nombre/sonido, colección de letras,
  cuentos, **vocabulario sin dibujo** (banco curado + el diccionario de
  +364.000 palabras lo valida), **sistema de bloques** con **taller libre**,
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
