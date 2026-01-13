export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // Aquí cargaríamos assets reales (imágenes, spritesheets, audio)
        // Como no tenemos archivos externos, crearemos texturas procedurales para el prototipo

        // Crear gráficos placeholder
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Héroe (Cuadrado Azul)
        graphics.fillStyle(0x3498db);
        graphics.fillRect(0, 0, 64, 64); // 64x64 sprite
        graphics.generateTexture('hero_texture', 64, 64);

        // Enemigo (Cuadrado Rojo)
        graphics.clear();
        graphics.fillStyle(0xe74c3c);
        graphics.fillRect(0, 0, 64, 64);
        graphics.generateTexture('enemy_texture', 64, 64);

        // Fondo de batalla simple
        graphics.clear();
        graphics.fillStyle(0x2c3e50);
        graphics.fillRect(0, 0, 800, 600);
        graphics.generateTexture('background', 800, 600);

        // Barra de carga simulada
        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(240, 270, 320, 50);

        this.load.on('progress', function (value) {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(250, 280, 300 * value, 30);
        });

        this.load.on('complete', function () {
            progressBar.destroy();
            progressBox.destroy();
        });
    }

    create() {
        console.log('BootScene complete. Starting BattleScene...');
        this.scene.start('BattleScene');
    }
}
