import { PALETTE, SPRITES } from '../utils/PixelArt.js';
import { SNES_PALETTE, UI_ASSETS, FOREST_ASSETS, VILLAGE_ASSETS } from '../utils/PixelAssets.js';
import { BUILDING_ASSETS } from '../utils/BuildingAssets.js';
import { NPC_SPRITES } from '../utils/NPCAssets.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // --- Generación de Pixel Art Procedural ---
        // Generamos las texturas basándonos en los arrays de SPRITES

        // Old Procedural Assets
        this.createPixelTexture('hero_texture', SPRITES.hero);
        this.createPixelTexture('enemy_texture', SPRITES.slime);
        this.createPixelTexture('floor_wood', SPRITES.floor_wood);
        this.createPixelTexture('wall', SPRITES.wall_stone);
        this.createPixelTexture('bookshelf', SPRITES.bookshelf);

        // --- SNES Assets Generation (High Quality) ---
        // UI Window (9-Slice)
        const uiScale = 1; // 1:1 pixel mapping
        this.createSNESTexture('ui_window_tl', UI_ASSETS.window_tl, uiScale);
        this.createSNESTexture('ui_window_t', UI_ASSETS.window_t, uiScale);
        this.createSNESTexture('ui_window_tr', UI_ASSETS.window_tr, uiScale);
        this.createSNESTexture('ui_window_l', UI_ASSETS.window_l, uiScale);
        this.createSNESTexture('ui_window_c', UI_ASSETS.window_c, uiScale);
        this.createSNESTexture('ui_window_r', UI_ASSETS.window_r, uiScale);
        this.createSNESTexture('ui_window_bl', UI_ASSETS.window_bl, uiScale);
        this.createSNESTexture('ui_window_b', UI_ASSETS.window_b, uiScale);
        this.createSNESTexture('ui_window_br', UI_ASSETS.window_br, uiScale);

        // Forest Tiles
        const tileScale = 1;
        this.createSNESTexture('tile_grass', FOREST_ASSETS.grass, tileScale);
        this.createSNESTexture('tile_grass_var', FOREST_ASSETS.grass_var, tileScale);
        this.createSNESTexture('tile_dirt', FOREST_ASSETS.dirt, tileScale);
        this.createSNESTexture('obj_tree_trunk', FOREST_ASSETS.tree_trunk, tileScale);
        this.createSNESTexture('obj_tree_top', FOREST_ASSETS.tree_top, tileScale);

        // Village Tiles
        this.createSNESTexture('roof_red_l', VILLAGE_ASSETS.roof_red_l, tileScale);
        this.createSNESTexture('roof_red_c', VILLAGE_ASSETS.roof_red_c, tileScale);
        this.createSNESTexture('roof_red_r', VILLAGE_ASSETS.roof_red_r, tileScale);
        this.createSNESTexture('wall_plaster', VILLAGE_ASSETS.wall_plaster, tileScale);
        this.createSNESTexture('wall_window', VILLAGE_ASSETS.wall_window, tileScale);
        this.createSNESTexture('wall_door', VILLAGE_ASSETS.wall_door, tileScale);
        this.createSNESTexture('obj_fence', VILLAGE_ASSETS.fence, tileScale);

        // New Building Assets
        this.createSNESTexture('forge_anvil', BUILDING_ASSETS.forge_anvil, tileScale);
        this.createSNESTexture('wall_chimney', BUILDING_ASSETS.wall_chimney, tileScale);
        this.createSNESTexture('sign_weapon', BUILDING_ASSETS.sign_weapon, tileScale);
        this.createSNESTexture('sign_mug', BUILDING_ASSETS.sign_mug, tileScale);
        this.createSNESTexture('wall_wood', BUILDING_ASSETS.wall_wood, tileScale);
        this.createSNESTexture('window_stained', BUILDING_ASSETS.window_stained, tileScale);
        this.createSNESTexture('wall_stone', BUILDING_ASSETS.wall_stone, tileScale);
        this.createSNESTexture('cross_stone', BUILDING_ASSETS.cross_stone, tileScale);
        this.createSNESTexture('crop_wheat', BUILDING_ASSETS.crop_wheat, tileScale);
        this.createSNESTexture('crop_veg', BUILDING_ASSETS.crop_veg, tileScale);
        this.createSNESTexture('stall_roof', BUILDING_ASSETS.stall_roof, tileScale);
        this.createSNESTexture('obj_crate', BUILDING_ASSETS.crate, tileScale);

        // NPC Procedural Generation
        this.generateNPCTextures(tileScale);

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

        // Hero Sprites
        this.load.spritesheet('hero', 'assets/images/hero_spritesheet.png', {
            frameWidth: 154,
            frameHeight: 210
        });
        this.load.image('hero_portrait', 'assets/images/hero_portrait.png');

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
        this.createAnimations();
        console.log('BootScene complete. Starting VillageScene...');
        this.scene.start('VillageScene');
    }

    createAnimations() {
        // Hero Animations (Right facing only in sheet)
        this.anims.create({
            key: 'hero-idle-side',
            frames: [ { key: 'hero', frame: 0 } ],
            frameRate: 10
        });

        this.anims.create({
            key: 'hero-walk-side',
            frames: this.anims.generateFrameNumbers('hero', { frames: [2, 3, 4, 5] }),
            frameRate: 8,
            repeat: -1
        });

        // Mapped animations for Up/Down (reusing side)
        this.anims.create({
            key: 'hero-idle-down',
            frames: [ { key: 'hero', frame: 0 } ],
            frameRate: 10
        });
        this.anims.create({
            key: 'hero-walk-down',
            frames: this.anims.generateFrameNumbers('hero', { frames: [2, 3, 4, 5] }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'hero-idle-up',
            frames: [ { key: 'hero', frame: 0 } ],
            frameRate: 10
        });
        this.anims.create({
            key: 'hero-walk-up',
            frames: this.anims.generateFrameNumbers('hero', { frames: [2, 3, 4, 5] }),
            frameRate: 8,
            repeat: -1
        });
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

    createSNESTexture(key, spriteData, scale = 1) {
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
                const color = SNES_PALETTE[char];

                if (color !== null && color !== undefined) {
                    const colorStr = '#' + color.toString(16).padStart(6, '0');
                    ctx.fillStyle = colorStr;
                    ctx.fillRect(x * scale, y * scale, scale, scale);
                }
            }
        }
        this.textures.addCanvas(key, canvas);
    }

    generateNPCTextures(scale) {
        // Define palettes for different roles
        const palettes = {
            'blacksmith': { 'H': 0x000000, 'S': 0xffccaa, 'C': 0x5d4037, 'D': 0x3e2723, 'F': 0x111111, '@': 0x000000 },
            'villager_f': { 'H': 0x8d6e63, 'S': 0xffccaa, 'C': 0xe91e63, 'D': 0xc2185b, 'F': 0x3e2723, '@': 0x000000 },
            'child':      { 'H': 0xffe082, 'S': 0xffccaa, 'C': 0x4caf50, 'D': 0x388e3c, 'F': 0x3e2723, '@': 0x000000 },
            'priest':     { 'H': 0xeeeeee, 'S': 0xffccaa, 'C': 0x5c6bc0, 'D': 0x3949ab, 'F': 0x1a237e, '@': 0x000000 },
            'merchant':   { 'H': 0x3e2723, 'S': 0xffccaa, 'C': 0xffb300, 'D': 0xff6f00, 'F': 0x3e2723, '@': 0x000000 },
            'guard':      { 'H': 0x607d8b, 'S': 0xffccaa, 'C': 0x90a4ae, 'D': 0x546e7a, 'F': 0x263238, '@': 0x000000 }
        };

        for (const [role, pal] of Object.entries(palettes)) {
            const key = `npc_${role}`;
            const spriteData = NPC_SPRITES.base_idle;

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
                    let color = pal[char];

                    if (color !== undefined) {
                         const colorStr = '#' + color.toString(16).padStart(6, '0');
                         ctx.fillStyle = colorStr;
                         ctx.fillRect(x * scale, y * scale, scale, scale);
                    }
                }
            }
            this.textures.addCanvas(key, canvas);
        }
    }
}
