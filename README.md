# 🅰️ Las Letras Vivas

Un juego para que los peques **aprendan a leer jugando con el teclado**.
Cada letra es un personaje con ojos, sonrisa y su propia **profesión**
("la **M** de **M**ago 🪄", "la **P** de **P**intor 🎨"), lo que ayuda a
asociar cada letra con su sonido inicial.

Está pensado para niños que **ya empiezan a leer pero les cuesta**:
sin prisa, sin "has perdido", con voz que lo lee todo en alto y muchos
ánimos. **Se juega solo con el teclado, no hace falta el ratón.**

## ▶️ Cómo jugar

Lo más fácil: **doble clic en `index.html`** y se abre en el navegador.
(No necesita internet ni instalar nada. La voz funciona en Chrome, Edge
y Safari modernos.)

> Si tu navegador no oye la voz al abrir el archivo directamente, ábrelo
> con un servidor local: en una terminal, dentro de esta carpeta, ejecuta
> `python3 -m http.server` y entra en `http://localhost:8000`.

## 🎮 Controles (todo con el teclado)

| Tecla | Qué hace |
|-------|----------|
| **Cualquier letra** | Es la acción principal del juego |
| **Flechas ⬅️ ➡️** y **Enter** | Elegir modo en el menú |
| **1 · 2 · 3 · 4** | Entrar directamente a un modo |
| **Enter / Espacio** | Repetir la voz · pasar a la siguiente |
| **Esc** | Volver al menú |
| **V** (en el menú) | Activar / quitar la voz |
| **L** (en el menú) | Cambiar entre minúsculas `abc` y MAYÚSCULAS `ABC` |

## 🧩 Los 4 modos (de menos a más difícil)

1. **🅰️ Explorar** — Pulsa cualquier letra y cobra vida: la dice en alto y
   enseña su profesión. Ideal para empezar y perder el miedo al teclado.
2. **🔎 Encuentra la letra** — Aparece una letra; hay que pulsar esa tecla.
   Empieza solo con las vocales y va añadiendo letras según acierta.
3. **🧩 Sílabas** — Lee y escribe sílabas (ma, pe, li, so, tu...), la base
   de la lectura en español.
4. **📖 Palabras** — Aparece un dibujo y la palabra; la escribe letra a letra.

En todos los modos: si se equivoca **no pasa nada malo**, solo un sonidito
suave; tras un par de intentos el juego le da una pista. Cada acierto suma
una ⭐ y cada 10 estrellas hay una gran fiesta de confeti. El progreso se
guarda en el propio navegador.

## 🛠️ Para quien quiera tocar el código

Solo tres archivos, sin frameworks ni compilación:

- `index.html` — estructura.
- `style.css` — apariencia y animaciones de las letras.
- `game.js` — toda la lógica (datos de las letras, modos, voz y efectos).

Para cambiar las palabras, las profesiones o las sílabas, edita las tablas
`INFO`, `PALABRAS` y `CONS_SIL` al principio de `game.js`.
