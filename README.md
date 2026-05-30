# 🅰️ Las Letras Vivas

Un juego para que los peques **aprendan a leer jugando con el teclado**.
Cada letra es un personaje con ojos, sonrisa y su propia **profesión**
("la **M** de **M**ago 🪄", "la **P** de **P**intor 🎨"), lo que ayuda a
asociar cada letra con su sonido inicial.

Está pensado para niños que **ya empiezan a leer pero les cuesta**:
sin prisa, sin "has perdido", con voz que lo lee todo en alto y muchos
ánimos.

**Funciona con teclado físico Y en tablet/móvil** (trae su propio teclado
en pantalla con botones grandes, no hace falta ratón ni el teclado del
sistema).

## ▶️ Cómo jugar

- **En ordenador:** doble clic en `index.html` (o abre la web). Se juega con
  el teclado o tocando.
- **En tablet/móvil:** abre la web y toca. Para jugar a **pantalla completa**,
  usa el botón **⛶** (arriba a la derecha) o **añade la página a la pantalla
  de inicio** ("Añadir a inicio" / "Agregar a pantalla de inicio") y ábrela
  desde ese icono: se abre a pantalla completa, como una app.

No necesita internet ni instalar nada. La voz funciona en Chrome, Edge y
Safari modernos.

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
| **V** | Activar / quitar la voz |
| **F** | La voz dice el **Nombre** (eme) o el **Sonido** (mmm) de la letra |
| **L** | Letras en minúsculas `abc` o MAYÚSCULAS `ABC` |
| **N** | Nivel: **Fácil → Medio → Difícil** |
| **T** | Teclado en pantalla en **QWERTY** o en orden **ABC** |

## 🧩 Los 9 modos (de explorar a leer)

1. **🅰️ Explorar** — Pulsa cualquier letra y cobra vida: la dice en alto y
   enseña su profesión. Ideal para perder el miedo al teclado.
2. **📚 Conoce las letras** — Galería del abecedario completo: con las flechas
   recorre las 27 letras (o pulsa una tecla para saltar a ella) y descúbrelas.
3. **🔎 Encuentra la letra** — Aparece una letra; hay que pulsar esa tecla.
   Empieza solo con las vocales y va añadiendo letras según acierta.
4. **🧩 Sílabas** — Lee y escribe sílabas (ma, pe, li...). En Difícil aparecen
   sílabas trabadas (bra, pla, tro...).
5. **📖 Palabras** — Dibujo + palabra; la escribe letra a letra.
6. **🕵️ Letra que falta** — Una palabra con un hueco (en Difícil, dos); hay que
   pulsar la letra que falta. Razonar + leer.
7. **👂 Escucha y escribe** — Oye la palabra y la escribe sin verla (con dibujo
   de ayuda; en Difícil, sin dibujo: dictado puro).
8. **💬 Frases** — Lee una frase, palabra a palabra: cada Espacio resalta y lee
   la siguiente palabra. Fluidez y comprensión.
9. **📕 Cuentos** — Lee un cuento entero, página a página: descubre que leer
   sirve para conocer historias. ✨

En todos los modos: si se equivoca **no pasa nada malo**, solo un sonidito
suave; tras un par de intentos el juego le da una pista. Cada acierto suma
una ⭐ (fiesta de confeti cada 10) y va completando la colección 📚 de las
27 letras. **Todo el progreso y los ajustes se guardan en el navegador.**

### Niveles
- **Fácil:** palabras de 3 letras, sílabas simples, un hueco, dictado con dibujo.
- **Medio:** palabras de 4-5 letras.
- **Difícil:** palabras con sílabas trabadas, sílabas trabadas, dos huecos y
  dictado sin dibujo.

## 🛠️ Para quien quiera tocar el código

Solo tres archivos, sin frameworks ni compilación:

- `index.html` — estructura.
- `style.css` — apariencia y animaciones de las letras.
- `game.js` — toda la lógica (datos de las letras, modos, voz y efectos).

Para cambiar el contenido, edita al principio de `game.js` las tablas:
`INFO` (letras, profesiones y sonidos), `PALABRAS` (palabras + dibujo +
dificultad), `FRASES`, `CONS_SIL` y `TRABADAS`.
