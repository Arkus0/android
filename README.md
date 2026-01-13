# RPG Phaser - Prototipo Escalable

Este es un prototipo de un RPG por turnos estilo Final Fantasy desarrollado con **Phaser 3** y **JavaScript moderno (ES Modules)**.

## 🚀 Cómo Ejecutar el Juego

Debido a que el juego utiliza módulos de ES6 y carga de recursos, **no funcionará si simplemente haces doble clic en `index.html`** (debido a políticas de seguridad CORS de los navegadores).

Necesitas un servidor web local. Aquí tienes la forma más rápida de hacerlo:

### Opción 1: Usando Python (Recomendado)
Si tienes Python instalado (lo cual es muy probable):

1. Abre una terminal/consola en la carpeta de este proyecto.
2. Ejecuta el siguiente comando:
   ```bash
   python3 -m http.server
   ```
   (O `python -m http.server` en Windows).
3. Abre tu navegador y ve a: `http://localhost:8000`

### Opción 2: Extensión de VS Code
Si usas Visual Studio Code, instala la extensión "Live Server", haz clic derecho en `index.html` y selecciona "Open with Live Server".

### Opción 3: Node.js (http-server)
Si tienes Node.js instalado:
1. `npx http-server .`
2. Ve a la URL que te indique.

## 🎮 Controles
*   **Mouse:** Usa el cursor para seleccionar comandos en el menú de batalla.

## 🛠️ Arquitectura
El proyecto está estructurado para ser escalable:
*   `src/main.js`: Configuración del juego y punto de entrada.
*   `src/scenes/`: Contiene las escenas del juego.
    *   `BootScene.js`: Carga de assets (procedurales en este caso).
    *   `BattleScene.js`: Lógica principal del combate.
    *   `UIScene.js`: Interfaz de usuario (HUD, Menús) superpuesta.
*   `src/prefabs/`: Clases de objetos de juego.
    *   `Unit.js`: Clase base para Héroe y Enemigos.

## 🔮 Futuras Mejoras
*   Añadir spritesheets y animaciones reales.
*   Sistema de menús anidados (Magia, Objetos).
*   Múltiples enemigos y party de héroes.
*   Sistema de experiencia y niveles.
