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

        // --- ASSETS PARA LA CASA (OVERWORLD) ---

        // 1. Suelo de madera
        graphics.clear();
        graphics.fillStyle(0x8e44ad); // Un color base (será sobreescrito visualmente por el patrón)
        // Fondo madera oscura
        graphics.fillStyle(0x5d4037);
        graphics.fillRect(0, 0, 32, 32);
        // Vetas madera clara
        graphics.lineStyle(2, 0x8d6e63);
        graphics.beginPath();
        graphics.moveTo(0, 10); graphics.lineTo(32, 10);
        graphics.moveTo(0, 22); graphics.lineTo(32, 22);
        graphics.strokePath();
        graphics.generateTexture('floor_wood', 32, 32);

        // 2. Pared
        graphics.clear();
        graphics.fillStyle(0xbdc3c7);
        graphics.fillRect(0, 0, 32, 32);
        graphics.lineStyle(2, 0x7f8c8d);
        graphics.strokeRect(0, 0, 32, 32);
        graphics.generateTexture('wall', 32, 32);

        // 3. Jugador Overworld (Más pequeño que en batalla)
        graphics.clear();
        graphics.fillStyle(0x3498db);
        graphics.fillRect(0, 0, 30, 30);
        // Ojos para ver dirección
        graphics.fillStyle(0xffffff);
        graphics.fillRect(5, 5, 8, 8);
        graphics.fillRect(17, 5, 8, 8);
        graphics.fillStyle(0x000000);
        graphics.fillRect(7, 7, 4, 4);
        graphics.fillRect(19, 7, 4, 4);
        graphics.generateTexture('player_overworld', 30, 30);

        // 4. Cama
        graphics.clear();
        graphics.fillStyle(0x8e44ad); // Sábana morada
        graphics.fillRect(0, 0, 40, 60);
        graphics.fillStyle(0xffffff); // Almohada
        graphics.fillRect(5, 5, 30, 15);
        graphics.generateTexture('bed', 40, 60);

        // 5. Librería
        graphics.clear();
        graphics.fillStyle(0x795548); // Madera mueble
        graphics.fillRect(0, 0, 40, 60);
        // Libros de colores
        const colors = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f];
        for(let i=0; i<4; i++) {
            graphics.fillStyle(colors[i]);
            graphics.fillRect(5, 10 + (i*12), 30, 8);
        }
        graphics.generateTexture('bookshelf', 40, 60);

        // 6. Mesa
        graphics.clear();
        graphics.fillStyle(0x5d4037); // Madera oscura
        graphics.fillCircle(20, 20, 20);
        graphics.fillStyle(0xd7ccc8); // Mantel/Plato
        graphics.fillCircle(20, 20, 10);
        graphics.generateTexture('table', 40, 40);

        // 7. Alfombra de Salida
        graphics.clear();
        graphics.fillStyle(0xc0392b); // Rojo
        graphics.fillRect(0, 0, 40, 30);
        graphics.lineStyle(2, 0xf1c40f); // Borde dorado
        graphics.strokeRect(0, 0, 40, 30);
        graphics.generateTexture('rug_exit', 40, 30);

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
        console.log('BootScene complete. Starting HouseScene...');
        this.scene.start('HouseScene');
    }
}
