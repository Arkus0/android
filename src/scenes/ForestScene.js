export class ForestScene extends Phaser.Scene {
    constructor() {
        super('ForestScene');
    }

    create() {
        // 1. Fondo: La imagen de Chrono Trigger
        // La imagen original es 1000x563, la ajustamos para que sea el mapa
        const bg = this.add.image(0, 0, 'bg_forest').setOrigin(0, 0);

        // Ajustamos los límites del mundo al tamaño de la imagen
        this.physics.world.setBounds(0, 0, bg.width, bg.height);

        // Cámara sigue al jugador dentro de los límites de la imagen
        this.cameras.main.setBounds(0, 0, bg.width, bg.height);
        this.cameras.main.setZoom(2); // Zoom x2 para ver bien el pixel art

        // 2. Jugador
        // Posicionamos al jugador en el claro central (aprox x=500, y=350 basado en la imagen)
        this.player = this.physics.add.sprite(500, 350, 'hero_texture');
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10); // Siempre encima del fondo

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 3. Colisiones Invisibles (Obstáculos)
        this.walls = this.physics.add.staticGroup();

        // Definir rectángulos invisibles sobre los árboles/rocas
        // Esto es "a ojo" basándonos en la imagen para simular solidez

        // Bosque izquierda
        this.addObstacle(0, 0, 350, 600);
        // Bosque derecha
        this.addObstacle(650, 0, 350, 600);
        // Bosque arriba
        this.addObstacle(350, 0, 300, 150);
        // Bosque abajo (con hueco pequeño)
        this.addObstacle(350, 500, 100, 100);
        this.addObstacle(550, 500, 100, 100);

        this.physics.add.collider(this.player, this.walls);

        // 4. Salida a Batalla (Transición)
        // Zona abajo (simulando camino)
        this.exitZone = this.add.rectangle(500, 580, 100, 20, 0xff0000, 0); // Invisible (alpha 0)
        this.physics.add.existing(this.exitZone, true);

        this.physics.add.overlap(this.player, this.exitZone, this.onExit, null, this);

        // 5. Controles
        this.cursors = this.input.keyboard.createCursorKeys();

        // UI Info
        this.add.text(10, 10, 'Phaser 3 Engine Test', {
            fontSize: '16px',
            fill: '#fff',
            stroke: '#000', strokeThickness: 4
        }).setScrollFactor(0).setDepth(20);
    }

    addObstacle(x, y, w, h) {
        // Crea un obstáculo invisible
        // Phaser Arcade Physics usa el centro para posicionar, así que ajustamos
        const obstacle = this.add.rectangle(x + w/2, y + h/2, w, h, 0x00ff00, 0); // 0 alpha = invisible
        this.walls.add(obstacle);
    }

    update() {
        const speed = 150;
        this.player.setVelocity(0);

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
        }
    }

    onExit() {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
            this.scene.start('BattleScene');
        });
    }
}
