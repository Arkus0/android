export class HouseScene extends Phaser.Scene {
    constructor() {
        super('HouseScene');
    }

    create() {
        // Zoom de cámara para dar sensación retro (sprites pequeños se ven grandes)
        this.cameras.main.setZoom(2);
        this.cameras.main.centerOn(400, 300); // Centrar en la habitación pequeña

        // --- 1. Construir el Mapa (Casa) ---

        // Suelo (Dibujamos tiles de 32x32 - generados por scale=2 de 16x16)
        // Reducimos el área dibujada para que quepa en el zoom
        const startX = 200;
        const endX = 600;
        const startY = 150;
        const endY = 450;

        for (let y = startY; y < endY; y += 32) {
            for (let x = startX; x < endX; x += 32) {
                this.add.image(x + 16, y + 16, 'floor_wood');
            }
        }

        // Grupo de paredes
        this.walls = this.physics.add.staticGroup();
        this.createWalls(startX, endX, startY, endY);

        // --- 2. Muebles y Objetos ---
        this.interactables = this.physics.add.staticGroup();

        // Cama
        const bed = this.interactables.create(startX + 60, startY + 60, 'bed');
        bed.setScale(1.5); // Un poco más grande
        bed.setData('message', 'Es tu cama. Huele a aventuras.');

        // Librería
        const bookshelf = this.interactables.create(startX + 150, startY + 40, 'bookshelf');
        bookshelf.setScale(1.5);
        bookshelf.setData('message', 'Libros antiguos... "Cómo programar en Phaser", "El arte de la guerra", "Recetas de Limo".');

        // Mesa
        const table = this.interactables.create(endX - 80, endY - 80, 'table');
        table.setData('message', 'Una mesa de roble. Hay migas de pan.');

        // Salida (Alfombra)
        this.exitZone = this.physics.add.sprite(startX + 200, endY - 20, 'rug_exit');

        // --- 3. Jugador ---
        // Usamos 'hero_texture' (generada en BootScene con pixel art) en lugar de 'player_overworld' antiguo
        this.player = this.physics.add.sprite(startX + 200, startY + 150, 'hero_texture');
        this.player.setCollideWorldBounds(false); // Bounds son las paredes ahora

        // Colisiones
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.interactables);

        // Solapamiento para salir
        this.physics.add.overlap(this.player, this.exitZone, this.onExit, null, this);

        // --- 4. Inputs y UI ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // UI de texto (Caja de diálogo simple)
        // IMPORTANTE: Al hacer zoom en la cámara principal, la UI también se hace zoom si está en world space.
        // Lo ideal sería una cámara separada para UI, pero para simplificar, escalaremos inversamente o
        // haremos la caja más pequeña y centrada en la visión.

        this.dialogBox = this.add.graphics();
        this.dialogBox.setScrollFactor(0); // Fija a la pantalla
        this.dialogBox.fillStyle(0x000000, 0.8);
        // Coordenadas ajustadas para pantalla de 800x600 sin zoom (ScrollFactor 0)
        this.dialogBox.fillRect(50, 450, 700, 100);
        this.dialogBox.lineStyle(4, 0xffffff);
        this.dialogBox.strokeRect(50, 450, 700, 100);
        this.dialogBox.visible = false;

        this.dialogText = this.add.text(70, 460, '', {
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: 660 }
        });
        this.dialogText.setScrollFactor(0);
        this.dialogText.visible = false;

        // Texto de ayuda
        this.add.text(10, 10, 'Flechas: Mover | ESPACIO: Interactuar', { fontSize: '20px', fill: '#fff', backgroundColor: '#000' }).setScrollFactor(0);
    }

    createWalls(startX, endX, startY, endY) {
        // Paredes del borde ajustadas al nuevo tamaño de habitación
        // Top
        for (let x = startX; x < endX; x += 32) {
            this.walls.create(x + 16, startY + 16, 'wall');
        }
        // Bottom
        for (let x = startX; x < endX; x += 32) {
            // Hueco puerta
            if (x < startX + 180 || x > startX + 220) {
                this.walls.create(x + 16, endY - 16, 'wall');
            }
        }
        // Left & Right
        for (let y = startY + 32; y < endY - 32; y += 32) {
            this.walls.create(startX + 16, y + 16, 'wall');
            this.walls.create(endX - 16, y + 16, 'wall');
        }
    }

    update() {
        // Movimiento
        const speed = 200;
        this.player.setVelocity(0);

        // Si hay diálogo activo, bloqueamos movimiento
        if (this.dialogBox.visible) {
            if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
                this.hideDialog();
            }
            return;
        }

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.angle = 180;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.angle = 0;
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            this.player.angle = -90;
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            this.player.angle = 90;
        }

        // Interacción (Solo si pulsamos Espacio y no nos movemos)
        if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            this.checkInteraction();
        }
    }

    checkInteraction() {
        // Buscamos objetos cercanos
        const distanceThreshold = 60;
        let found = false;

        this.interactables.children.iterate((child) => {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y) < distanceThreshold) {
                const msg = child.getData('message');
                if (msg) {
                    this.showDialog(msg);
                    found = true;
                }
            }
        });
    }

    showDialog(text) {
        this.dialogText.setText(text);
        this.dialogBox.visible = true;
        this.dialogText.visible = true;
    }

    hideDialog() {
        this.dialogBox.visible = false;
        this.dialogText.visible = false;
    }

    onExit() {
        // Transición a combate
        // Efecto visual simple: Fade out
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
            this.scene.start('BattleScene');
        });
    }
}
