import { PALETTE, SPRITES } from '../utils/PixelArt.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // --- Generación de Pixel Art Procedural ---
        // Generamos las texturas basándonos en los arrays de SPRITES

        this.createPixelTexture('hero_texture', SPRITES.hero);
        this.createPixelTexture('enemy_texture', SPRITES.slime);
        this.createPixelTexture('floor_wood', SPRITES.floor_wood);
        this.createPixelTexture('wall', SPRITES.wall_stone);
        this.createPixelTexture('bookshelf', SPRITES.bookshelf);

        // Cama (caso especial, tal vez reusar o crear textura más grande)
        // Por simplicidad, usamos el 16x16 escalado
        this.createPixelTexture('bed', SPRITES.bed);

        // Mesa redonda (Manual, porque círculo es difícil en grid de 16x16 estricto sin verse raro)
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        graphics.fillStyle(0x5d4037);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0xd7ccc8);
        graphics.fillCircle(16, 16, 8);
        graphics.generateTexture('table', 32, 32);

        // Alfombra de Salida (Manual simple)
        graphics.clear();
        graphics.fillStyle(0xc0392b);
        graphics.fillRect(0, 0, 32, 24);
        graphics.lineStyle(2, 0xf1c40f);
        graphics.strokeRect(0, 0, 32, 24);
        graphics.generateTexture('rug_exit', 32, 24);

        // Background Batalla (Procedural)
        graphics.clear();
        graphics.fillStyle(0x2c3e50);
        graphics.fillRect(0, 0, 800, 600);
        graphics.generateTexture('background', 800, 600);

        // --- Carga de Assets Reales ---
        // Aquí cargamos la imagen de referencia para probar el motor
        this.load.image('bg_forest', 'assets/backgrounds/bg_forest.jpg');

        // --- Barra de carga ---
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
        console.log('BootScene complete. Starting ForestScene...');
        this.scene.start('ForestScene');
    }

    createPixelTexture(key, spriteData, scale = 2) {
        // spriteData es array de strings 16x16
        // scale define qué tan grandes son los "píxeles" en la textura final
        // (Aunque Phaser puede escalar el Sprite, hacerlo aquí da textura crisp)

        const width = spriteData[0].length;
        const height = spriteData.length;

        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');

        for (let y = 0; y < height; y++) {
            const row = spriteData[y];
            for (let x = 0; x < width; x++) {
                const char = row[x];
                const color = PALETTE[char];

                if (color !== null && color !== undefined) {
                    // Convertir hex 0xRRGGBB a string "#RRGGBB"
                    const colorStr = '#' + color.toString(16).padStart(6, '0');
                    ctx.fillStyle = colorStr;
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }

        this.textures.addCanvas(key, canvas);
    }
}
