import { UI_ASSETS } from '../utils/PixelAssets.js';

export class HouseScene extends Phaser.Scene {
    constructor() {
        super('HouseScene');
    }

    init(data) {
        // Recibir datos de la aldea
        this.houseId = data.houseId || 'default';
        this.returnX = data.returnX || 22 * 16;
        this.returnY = data.returnY || 35 * 16;
    }

    create() {
        // Zoom retro
        this.cameras.main.setZoom(2);
        this.cameras.main.centerOn(400, 300);

        // --- Configuración de Casas ---
        // Definimos layouts simples basados en IDs
        const LAYOUTS = {
            'house_small': { width: 10, height: 8, color: 'tile_dirt' }, // 10x8 tiles
            'house_wide': { width: 14, height: 8, color: 'tile_grass_var' },
            'house_tall': { width: 12, height: 12, color: 'tile_grass' }, // 2 plantas visualmente (más alto)
            'default': { width: 12, height: 10, color: 'floor_wood' }
        };

        const config = LAYOUTS[this.houseId] || LAYOUTS['default'];

        const TILE_SIZE = 32; // Usamos los assets 16x16 escalados x2 (BootScene los crea x1 pero la escena anterior usaba x2... un momento)
        // BootScene.js crea 'floor_wood' con scale=2 por defecto en createPixelTexture viejo.
        // Pero los nuevos tiles SNES se crean con scale=1.
        // Asumamos que para interiors usamos los assets "viejos" (floor_wood, wall) que son 32x32 reales.

        // Calculamos centro
        const roomW = config.width * 32;
        const roomH = config.height * 32;
        const startX = 400 - (roomW / 2);
        const startY = 300 - (roomH / 2);
        const endX = startX + roomW;
        const endY = startY + roomH;

        // 1. Suelo
        for (let y = 0; y < config.height; y++) {
            for (let x = 0; x < config.width; x++) {
                // floor_wood es 32x32
                this.add.image(startX + x * 32 + 16, startY + y * 32 + 16, 'floor_wood');
            }
        }

        // 2. Paredes
        this.walls = this.physics.add.staticGroup();
        this.interactables = this.physics.add.staticGroup();

        // Top Wall
        for (let x = 0; x < config.width; x++) {
            this.walls.create(startX + x * 32 + 16, startY + 16, 'wall');
        }
        // Bottom Wall (con hueco para puerta)
        const midX = Math.floor(config.width / 2);
        for (let x = 0; x < config.width; x++) {
            if (x !== midX) {
                this.walls.create(startX + x * 32 + 16, endY - 16, 'wall');
            }
        }
        // Sides
        for (let y = 1; y < config.height - 1; y++) {
            this.walls.create(startX + 16, startY + y * 32 + 16, 'wall');
            this.walls.create(endX - 16, startY + y * 32 + 16, 'wall');
        }

        // 3. Muebles Variables
        if (this.houseId === 'house_small') {
            this.addProp(startX + 60, startY + 60, 'bed', 'Cama individual. Bastante dura.');
            this.addProp(endX - 60, startY + 60, 'bookshelf', 'Solo tiene comics.');
        } else if (this.houseId === 'house_wide') {
            this.addProp(startX + 60, startY + 60, 'bed', 'Cama doble.');
            this.addProp(startX + 150, startY + 60, 'bookshelf', 'Enciclopedia de monstruos vol 1.');
            this.addProp(endX - 80, endY - 80, 'table', 'Cena para cuatro servida.');
        } else if (this.houseId === 'house_tall') {
             this.addProp(startX + 60, startY + 60, 'bookshelf', 'Grimorios antiguos.');
             this.addProp(endX - 60, startY + 60, 'bookshelf', 'Más libros...');
             this.addProp(startX + 60, endY - 80, 'table', 'Mesa de alquimia.');
             // Fake stairs
             const stairs = this.add.rectangle(endX - 60, startY + 150, 40, 60, 0x5d4037);
             this.physics.add.existing(stairs, true); // Static
             this.interactables.add(stairs); // Collider
             // Stairs don't have message logic in addProp, handling simply
             // For now just a block.
        }

        // 4. Jugador (Hero)
        // Posicionamos frente a la puerta (bottom center)
        this.player = this.physics.add.sprite(startX + midX * 32 + 16, endY - 60, 'hero');
        this.player.setScale(0.25);
        this.player.body.setSize(80, 40);
        this.player.body.setOffset(37, 160);
        this.player.setCollideWorldBounds(false);

        // Physics
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.interactables);

        // Salida (Overlap en la puerta)
        this.exitZone = this.add.rectangle(startX + midX * 32 + 16, endY, 32, 10, 0x00ff00, 0);
        this.physics.add.existing(this.exitZone, true);
        this.physics.add.overlap(this.player, this.exitZone, this.onExit, null, this);

        // 5. Controls & UI
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        // Dialog UI (Reusing 9-slice concept roughly or simple graphics)
        this.createDialogUI();
    }

    addProp(x, y, texture, message) {
        const prop = this.interactables.create(x, y, texture);
        prop.setScale(1.5);
        prop.refreshBody();
        if (message) prop.setData('message', message);
    }

    createDialogUI() {
        this.dialogContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100);
        this.dialogContainer.visible = false;

        const graphics = this.add.graphics();
        graphics.fillStyle(0x000000, 0.8);
        graphics.fillRect(50, 450, 700, 100);
        graphics.lineStyle(4, 0xffffff);
        graphics.strokeRect(50, 450, 700, 100);

        this.dialogText = this.add.text(70, 460, '', {
            fontSize: '24px',
            color: '#ffffff',
            wordWrap: { width: 660 }
        });

        this.dialogContainer.add([graphics, this.dialogText]);
    }

    update() {
        const speed = 200;
        this.player.setVelocity(0);

        if (this.dialogContainer.visible) {
            if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
                this.dialogContainer.visible = false;
            }
            return;
        }

        let moving = false;
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
            this.player.anims.play('hero-walk-side', true);
            moving = true;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
            this.player.anims.play('hero-walk-side', true);
            moving = true;
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-speed);
            if (!moving) {
                this.player.anims.play('hero-walk-up', true);
                moving = true;
            }
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(speed);
            if (!moving) {
                this.player.anims.play('hero-walk-down', true);
                moving = true;
            }
        }

        if (!moving) {
            this.player.anims.play('hero-idle-side', true);
        }

        if (Phaser.Input.Keyboard.JustDown(this.keySpace)) {
            this.checkInteraction();
        }
    }

    checkInteraction() {
        const distanceThreshold = 60;
        this.interactables.children.iterate((child) => {
            if (child.active && Phaser.Math.Distance.Between(this.player.x, this.player.y, child.x, child.y) < distanceThreshold) {
                const msg = child.getData('message');
                if (msg) {
                    this.dialogText.setText(msg);
                    this.dialogContainer.visible = true;
                }
            }
        });
    }

    onExit() {
        this.cameras.main.fadeOut(200);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            // Regresamos a VillageScene en la posición de la puerta
            this.scene.start('VillageScene', {
                startX: this.returnX,
                startY: this.returnY
            });
        });
    }
}
