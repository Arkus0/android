# Próximos Pasos: Integración de Leonardo.ai y Gameplay

Este documento detalla la hoja de ruta para evolucionar el prototipo actual hacia un juego completo, con énfasis en la creación de assets mediante IA.

## 1. Flujo de Trabajo con Leonardo.ai

Para reemplazar los gráficos procedimentales actuales con assets de alta calidad generados por IA, seguiremos este proceso:

### A. Escenarios (Fondos)
1.  **Generación:** Crear imágenes panorámicas (ej. "RPG forest clearing top down view snes style").
2.  **Integración:**
    -   Guardar la imagen en `assets/backgrounds/`.
    -   Cargarla en `BootScene.js`.
    -   Crear una nueva Escena (o actualizar existente) y usar `this.add.image(0, 0, 'key')`.
3.  **Colisiones:** Usar el método `addObstacle()` para dibujar "paredes invisibles" sobre los elementos no transitables de la imagen generada.

### B. Personajes y Enemigos (Sprites)
1.  **Generación:** Crear "Sprite Sheets" (ej. "Pixel art character sprite sheet fantasy warrior walking animation white background").
2.  **Procesado:**
    -   Es crucial **eliminar el fondo** para que sea transparente.
    -   Asegurar que los frames estén alineados en una rejilla (ej. 32x32 o 64x64 píxeles).
3.  **Código:**
    -   Reemplazar la llamada a `createPixelTexture` por `this.load.spritesheet`.
    -   Definir las animaciones en Phaser (`this.anims.create`) basadas en los frames de la hoja.

### C. Interfaz de Usuario (UI)
1.  **Generación:** Crear marcos de ventanas, botones y cursores (estilo "Fantasy GUI").
2.  **Integración:** Actualizar `UIScene.js` para usar estas imágenes en lugar de los rectángulos de colores `graphics.fillStyle`.

## 2. Hoja de Ruta de Desarrollo (Gameplay)

### Fase 1: Profundidad en Combate (Prioridad Alta)
- [ ] **Lógica de Turnos:** Implementar una cola de turnos real (basada en velocidad o turnos estrictos).
- [ ] **Estadísticas:** Añadir HP, MP, Ataque y Defensa a las entidades.
- [ ] **Acciones Reales:** Que el comando "Atacar" reduzca la vida del enemigo y muestre una animación o efecto.
- [ ] **Condición de Victoria/Derrota:** Volver al mapa tras ganar, o pantalla de "Game Over".

### Fase 2: Interacción y Narrativa
- [ ] **NPCs:** Añadir personajes estáticos en el mapa con los que se pueda hablar.
- [ ] **Sistema de Diálogo:** Una ventana de texto que aparece al interactuar con NPCs u objetos.
- [ ] **Transiciones:** Poder entrar y salir de casas/zonas (cambiar de `ForestScene` a `HouseScene`).

### Fase 3: Audio
- [ ] **Música:** Temas de fondo para exploración y batalla.
- [ ] **SFX:** Sonidos de pasos, golpes y menús.

## 3. Recomendación Inmediata
Una vez tengas los primeros assets de Leonardo.ai (especialmente un Sprite Sheet de personaje), el siguiente paso técnico debería ser **implementar el cargador de Sprite Sheets** para reemplazar al héroe procedimental y darle vida con animaciones reales.
