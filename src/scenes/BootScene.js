import { PALETTE, SPRITES } from '../utils/PixelArt.js';
import { SNES_PALETTE, UI_ASSETS, FOREST_ASSETS, VILLAGE_ASSETS } from '../utils/PixelAssets.js';
import { BUILDING_ASSETS } from '../utils/BuildingAssets.js';
import { NPC_SPRITES } from '../utils/NPCAssets.js';

export class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        // --- Load Assets from Pack ---
        this.load.image('ui_base', 'assets/images/ui/text_box.png');

        // Tiles
        this.load.image('tile_grass', 'assets/images/tiles/grass.png');
        this.load.image('tile_grass_var', 'assets/images/tiles/grass_var.png');
        this.load.image('tile_dirt', 'assets/images/tiles/dirt.png');

        // Props
        this.load.image('obj_tree', 'assets/images/props/tree.png');
        this.load.image('obj_crate', 'assets/images/props/crate.png');
        this.load.image('obj_fence', 'assets/images/props/fence.png');
        this.load.image('obj_flower', 'assets/images/props/flower.png');
        this.load.image('obj_rock', 'assets/images/props/rock.png');

        // Mobs & Hero
        this.load.spritesheet('enemy_texture', 'assets/images/mobs/slime.png', {
            frameWidth: 16,
            frameHeight: 24
        }); // Slime Spritesheet
        this.load.spritesheet('hero', 'assets/images/chars/hero.png', {
            frameWidth: 24,
            frameHeight: 24
        });

        // Audio
        this.load.audio('bgm_village', 'assets/audio/Red Carpet Wooden Floor.mp3');
        this.load.audio('bgm_forest', 'assets/audio/Foggy Woods.mp3');

        // --- Keep Procedural Generation for Missing Assets ---

        // Old Procedural Assets (Retained if no replacement)
        // this.createPixelTexture('floor_wood', SPRITES.floor_wood); // Keeping procedural wood floor
        // this.createPixelTexture('wall', SPRITES.wall_stone); // Keeping procedural wall
        // this.createPixelTexture('bookshelf', SPRITES.bookshelf); // Keeping procedural bookshelf

        // --- SNES Assets Generation (High Quality) ---
        // Village Tiles (Walls, Roofs - retained as no replacements found)
        const tileScale = 1;
        this.createSNESTexture('roof_red_l', VILLAGE_ASSETS.roof_red_l, tileScale);
        this.createSNESTexture('roof_red_c', VILLAGE_ASSETS.roof_red_c, tileScale);
        this.createSNESTexture('roof_red_r', VILLAGE_ASSETS.roof_red_r, tileScale);
        this.createSNESTexture('wall_plaster', VILLAGE_ASSETS.wall_plaster, tileScale);
        this.createSNESTexture('wall_window', VILLAGE_ASSETS.wall_window, tileScale);
        this.createSNESTexture('wall_door', VILLAGE_ASSETS.wall_door, tileScale);
        // this.createSNESTexture('obj_fence', VILLAGE_ASSETS.fence, tileScale); // Replaced by obj_fence image

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
        // this.createSNESTexture('obj_crate', BUILDING_ASSETS.crate, tileScale); // Replaced by obj_crate image

        // NPC Procedural Generation (Keep for variety)
        this.generateNPCTextures(tileScale);

        // Misc Procedural (Bed, Table, Rug) - Keep as no direct replacement
        this.createPixelTexture('bed', SPRITES.bed);

        const graphics = this.make.graphics({ x: 0, y: 0, add: false });
        // Table
        graphics.fillStyle(0x5d4037);
        graphics.fillCircle(16, 16, 14);
        graphics.fillStyle(0xd7ccc8);
        graphics.fillCircle(16, 16, 8);
        graphics.generateTexture('table', 32, 32);

        // Rug
        graphics.clear();
        graphics.fillStyle(0xc0392b);
        graphics.fillRect(0, 0, 32, 24);
        graphics.lineStyle(2, 0xf1c40f);
        graphics.strokeRect(0, 0, 32, 24);
        graphics.generateTexture('rug_exit', 32, 24);

        // Background Batalla
        graphics.clear();
        graphics.fillStyle(0x2c3e50);
        graphics.fillRect(0, 0, 800, 600);
        graphics.generateTexture('background', 800, 600);

        // --- Loading Bar ---
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
        // Generate Sliced UI Textures from loaded image
        this.sliceUI('ui_base', 8); // Assume 8px borders

        // Generate procedural textures that needed to be created
        // (Move procedural calls here? No, textures.addCanvas works immediately but preload is better for logical flow.
        // However, addCanvas during preload is fine.)

        this.createProceduralWood(); // Moved here to keep preload clean-ish

        this.createAnimations();
        console.log('BootScene complete. Starting VillageScene...');
        this.scene.start('VillageScene');
    }

    createProceduralWood() {
         this.createPixelTexture('floor_wood', SPRITES.floor_wood);
         this.createPixelTexture('wall', SPRITES.wall_stone);
         this.createPixelTexture('bookshelf', SPRITES.bookshelf);
    }

    createAnimations() {
        // Hero Animations (Gabe)
        // 24x24 frames. File 168x24. 7 frames.
        // Assume: 0-3 Idle? 4-6 Run?
        // Or: 0 Idle. 1-6 Run?
        // Let's try: Idle: 0. Walk: 1,2,3,4,5,6.

        this.anims.create({
            key: 'hero-idle-side',
            frames: [ { key: 'hero', frame: 0 } ],
            frameRate: 10
        });

        this.anims.create({
            key: 'hero-walk-side',
            frames: this.anims.generateFrameNumbers('hero', { start: 1, end: 6 }),
            frameRate: 10,
            repeat: -1
        });

        // Reusing side for Up/Down for now (Gabe sprite is side-view)
        this.anims.create({
            key: 'hero-idle-down',
            frames: [ { key: 'hero', frame: 0 } ],
            frameRate: 10
        });
        this.anims.create({
            key: 'hero-walk-down',
            frames: this.anims.generateFrameNumbers('hero', { start: 1, end: 6 }),
            frameRate: 10,
            repeat: -1
        });

        this.anims.create({
            key: 'hero-idle-up',
            frames: [ { key: 'hero', frame: 0 } ],
            frameRate: 10
        });
        this.anims.create({
            key: 'hero-walk-up',
            frames: this.anims.generateFrameNumbers('hero', { start: 1, end: 6 }),
            frameRate: 10,
            repeat: -1
        });
    }

    sliceUI(key, corner) {
        // Create 9 textures from the base image
        const src = this.textures.get(key).getSourceImage();
        const w = src.width;
        const h = src.height;

        // Parts
        // tl, t, tr
        // l, c, r
        // bl, b, br

        const regions = {
            'ui_window_tl': [0, 0, corner, corner],
            'ui_window_t':  [corner, 0, w - 2*corner, corner],
            'ui_window_tr': [w - corner, 0, corner, corner],
            'ui_window_l':  [0, corner, corner, h - 2*corner],
            'ui_window_c':  [corner, corner, w - 2*corner, h - 2*corner],
            'ui_window_r':  [w - corner, corner, corner, h - 2*corner],
            'ui_window_bl': [0, h - corner, corner, corner],
            'ui_window_b':  [corner, h - corner, w - 2*corner, corner],
            'ui_window_br': [w - corner, h - corner, corner, corner]
        };

        for (const [newKey, rect] of Object.entries(regions)) {
            const canvas = document.createElement('canvas');
            canvas.width = rect[2];
            canvas.height = rect[3];
            const ctx = canvas.getContext('2d');
            ctx.drawImage(src, rect[0], rect[1], rect[2], rect[3], 0, 0, rect[2], rect[3]);
            this.textures.addCanvas(newKey, canvas);
        }
    }

    createPixelTexture(key, spriteData, scale = 2) {
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
