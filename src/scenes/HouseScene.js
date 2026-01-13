export class HouseScene extends Phaser.Scene {
    constructor() {
        super('HouseScene');
    }

    create() {
        // --- 1. Construir el Mapa (Casa) ---
        // Al no usar Tilemap externo, dibujamos tiles manualmente

        // Suelo (800x600 relleno)
        for (let y = 0; y < 600; y += 32) {
            for (let x = 0; x < 800; x += 32) {
                this.add.image(x + 16, y + 16, 'floor_wood');
            }
        }

        // Grupo de paredes (colisiones)
        this.walls = this.physics.add.staticGroup();

        // Bordes de la habitación
        this.createWalls();

        // --- 2. Muebles y Objetos ---
        this.interactables = this.physics.add.staticGroup();

        // Cama
        const bed = this.interactables.create(100, 100, 'bed');
        bed.setData('message', 'Es tu cama. Huele a aventuras.');

        // Librería
        const bookshelf = this.interactables.create(300, 80, 'bookshelf');
        bookshelf.setData('message', 'Libros antiguos... "Cómo programar en Phaser", "El arte de la guerra", "Recetas de Limo".');

        // Mesa
        const table = this.interactables.create(500, 300, 'table');
        table.setData('message', 'Una mesa de roble. Hay migas de pan.');

        // Salida (Alfombra) - Es un sensor, no bloquea
        this.exitZone = this.physics.add.sprite(400, 550, 'rug_exit');

        // --- 3. Jugador ---
        this.player = this.physics.add.sprite(400, 300, 'player_overworld');
        this.player.setCollideWorldBounds(true);

        // Colisiones
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.interactables);

        // Solapamiento para salir
        this.physics.add.overlap(this.player, this.exitZone, this.onExit, null, this);

        // --- 4. Inputs y UI ---
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // UI de texto (Caja de diálogo simple)
        this.dialogBox = this.add.graphics();
        this.dialogBox.fillStyle(0x000000, 0.8);
        this.dialogBox.fillRect(50, 450, 700, 100);
        this.dialogBox.lineStyle(2, 0xffffff);
        this.dialogBox.strokeRect(50, 450, 700, 100);
        this.dialogBox.visible = false;

        this.dialogText = this.add.text(70, 460, '', {
            fontSize: '20px',
            color: '#ffffff',
            wordWrap: { width: 660 }
        });
        this.dialogText.visible = false;

        // Texto de ayuda
        this.add.text(10, 10, 'Flechas: Mover | ESPACIO: Interactuar', { fontSize: '16px', fill: '#fff', backgroundColor: '#000' });
    }

    createWalls() {
        // Paredes del borde (Top, Bottom, Left, Right)
        // Top
        for (let x = 0; x < 800; x += 32) {
            this.walls.create(x + 16, 16, 'wall');
        }
        // Bottom (dejamos hueco para puerta en el centro)
        for (let x = 0; x < 800; x += 32) {
            if (x < 350 || x > 450) { // Hueco de puerta
                this.walls.create(x + 16, 584, 'wall');
            }
        }
        // Left & Right
        for (let y = 32; y < 584; y += 32) {
            this.walls.create(16, y + 16, 'wall');
            this.walls.create(784, y + 16, 'wall');
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
