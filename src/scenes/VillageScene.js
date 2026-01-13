import { timeSystem } from '../systems/TimeSystem.js';

export class VillageScene extends Phaser.Scene {
    constructor() {
        super('VillageScene');
    }

    create(data) {
        // Launch UI if not active
        if (!this.scene.get('WorldUIScene').scene.isActive()) {
            this.scene.launch('WorldUIScene');
        }

        // Map Dimensions
        const TILE_SIZE = 16;
        const MAP_WIDTH = 50;
        const MAP_HEIGHT = 40;

        // 1. Generate Ground (Grass)
        this.groundGroup = this.add.group();
        this.walls = this.physics.add.staticGroup();
        this.doorZones = this.physics.add.staticGroup();

        // Fill background with grass
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                let texture = 'tile_grass';
                if (Math.random() > 0.9) texture = 'tile_grass_var';
                this.groundGroup.create(x * TILE_SIZE, y * TILE_SIZE, texture).setOrigin(0, 0);
            }
        }

        // 2. Build Houses (Semi-Fixed)
        // Helper to build a house at tile coordinates (tx, ty)

        // House 1: Small (Left)
        this.buildHouse(10, 10, 4, 3, 'house_small');

        // House 2: Wide (Right)
        this.buildHouse(30, 8, 6, 3, 'house_wide');

        // House 3: Tall/2-Story (Center Top)
        this.buildHouse(20, 20, 5, 5, 'house_tall');

        // Paths (Connecting doors)
        // Hardcoded path drawing roughly connecting (12,13), (33,11), (22,25)
        this.drawPath(12, 13, 22, 25);
        this.drawPath(33, 11, 22, 25);
        this.drawPath(22, 25, 22, 38); // Exit South

        // 3. Player
        // Start position: Default or from House exit
        let startX = 22 * TILE_SIZE;
        let startY = 35 * TILE_SIZE;

        if (data && data.startX) startX = data.startX;
        if (data && data.startY) startY = data.startY;

        this.player = this.physics.add.sprite(startX, startY, 'hero');
        this.player.setScale(0.25);
        this.player.body.setSize(80, 40);
        this.player.body.setOffset(37, 160);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);

        // Camera
        this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
        this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
        this.cameras.main.setZoom(2);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Collisions
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.overlap(this.player, this.doorZones, this.onEnterHouse, null, this);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // UI
        this.add.text(10, 10, 'Village Zone', {
            fontSize: '16px', fill: '#fff', stroke: '#000', strokeThickness: 4
        }).setScrollFactor(0).setDepth(95);

        // Darkness Overlay
        this.darknessOverlay = this.add.rectangle(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE, 0x000020)
            .setOrigin(0, 0)
            .setDepth(90) // Above map/entities, below UI
            .setAlpha(0);
    }

    buildHouse(tx, ty, w, h, houseId) {
        const TILE_SIZE = 16;

        // Roof
        // Standard Roof Height: 1 tile roughly?
        // We'll make roof triangular.
        // Left Edge
        this.walls.create(tx * TILE_SIZE, (ty - 1) * TILE_SIZE, 'roof_red_l').setOrigin(0,0).setDepth(20);

        // Center Roof
        for (let i = 1; i < w - 1; i++) {
             this.walls.create((tx + i) * TILE_SIZE, (ty - 1) * TILE_SIZE, 'roof_red_c').setOrigin(0,0).setDepth(20);
        }

        // Right Edge
        this.walls.create((tx + w - 1) * TILE_SIZE, (ty - 1) * TILE_SIZE, 'roof_red_r').setOrigin(0,0).setDepth(20);

        // Walls
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let texture = 'wall_plaster';

                // Add windows (if not edge, and not bottom row mostly)
                if (x > 0 && x < w - 1 && y < h - 1) {
                    // Simple window pattern
                    if (x % 2 !== 0 && y % 2 === 0) texture = 'wall_window';
                }

                // Door (Center bottom)
                const isDoor = (y === h - 1 && x === Math.floor(w / 2));
                if (isDoor) texture = 'wall_door';

                const wall = this.walls.create((tx + x) * TILE_SIZE, (ty + y) * TILE_SIZE, texture).setOrigin(0,0);

                // Physics body needs to be smaller for walls to allow "pseudo-depth" or full block?
                // For SNES style, usually the base is solid.
                wall.refreshBody(); // Static body

                if (isDoor) {
                    // Remove collision from door visual so we can overlap
                    // Actually, keep collision but add a sensor zone in front?
                    // Simpler: Door is wall_door. We put an overlap zone ON it.
                    // But if it has collider, we can't overlap center.
                    // Solution: Disable collision on the door tile itself.
                    wall.body.checkCollision.none = true;

                    // Add Invisible Door Zone
                    const zone = this.add.rectangle((tx + x) * TILE_SIZE + 8, (ty + y) * TILE_SIZE + 8, 8, 8, 0x00ff00, 0);
                    this.physics.add.existing(zone, true);
                    zone.houseId = houseId;
                    zone.returnX = (tx + x) * TILE_SIZE + 8;
                    zone.returnY = (ty + y + 1) * TILE_SIZE + 16; // Step out
                    this.doorZones.add(zone);
                }
            }
        }

        // Optional Fence around?
    }

    drawPath(x1, y1, x2, y2) {
        // Simple Bresenham or Manhattan line to place dirt tiles
        // Vertical then Horizontal
        const TILE_SIZE = 16;

        let cx = x1;
        let cy = y1;

        while (cy !== y2) {
            this.groundGroup.create(cx * TILE_SIZE, cy * TILE_SIZE, 'tile_dirt').setOrigin(0,0);
            cy += (y2 > y1) ? 1 : -1;
        }
        while (cx !== x2) {
            this.groundGroup.create(cx * TILE_SIZE, cy * TILE_SIZE, 'tile_dirt').setOrigin(0,0);
            cx += (x2 > x1) ? 1 : -1;
        }
        // Final tile
        this.groundGroup.create(x2 * TILE_SIZE, y2 * TILE_SIZE, 'tile_dirt').setOrigin(0,0);
    }

    onEnterHouse(player, zone) {
        // Debounce?
        if (this.entering) return;
        this.entering = true;

        this.cameras.main.fadeOut(500);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.entering = false;
            this.scene.start('HouseScene', {
                houseId: zone.houseId,
                returnX: zone.returnX,
                returnY: zone.returnY
            });
        });
    }

    update(time, delta) {
        timeSystem.update(delta);
        this.darknessOverlay.setAlpha(timeSystem.getLightLevel());

        const speed = 150;
        this.player.setVelocity(0);

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
    }
}
