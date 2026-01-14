import { timeSystem } from '../systems/TimeSystem.js';
import { npcManager } from '../systems/npc/NPCManager.js';
import { NPC_DATA } from '../data/NPCData.js';

export class VillageScene extends Phaser.Scene {
    constructor() {
        super('VillageScene');
    }

    create(data) {
        // Play Music
        if (!this.sound.get('bgm_village')) {
            this.sound.play('bgm_village', { loop: true, volume: 0.5 });
        }

        // Launch UI if not active
        if (!this.scene.get('WorldUIScene').scene.isActive()) {
            this.scene.launch('WorldUIScene');
        }

        // --- Expanded Map Dimensions (100x100 tiles = 1600x1600 px) ---
        const TILE_SIZE = 16;
        const MAP_WIDTH = 100;
        const MAP_HEIGHT = 100;

        // Groups
        this.groundGroup = this.add.group();
        this.walls = this.physics.add.staticGroup();
        this.props = this.physics.add.staticGroup(); // For non-blocker visual props
        this.doorZones = this.physics.add.staticGroup();
        this.npcGroup = this.add.group(); // Will hold NPC sprites

        // --- 1. Terrain Generation ---
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                let texture = 'tile_grass';
                // Variation logic
                if (Math.random() > 0.95) texture = 'tile_grass_var';
                this.groundGroup.create(x * TILE_SIZE, y * TILE_SIZE, texture).setOrigin(0, 0);
            }
        }

        // --- 2. Zoning & Buildings ---
        // Center Plaza (50, 50)
        this.buildPlaza(50, 50, 10);

        // North: Church & Graveyard
        this.buildChurch(50, 20);
        this.buildGraveyard(65, 20);

        // East: Blacksmith & Residential
        this.buildBlacksmith(80, 50);
        this.buildHouse(85, 40, 5, 4, 'house_marcus'); // Marcus's House nearby
        this.buildHouse(85, 60, 4, 4, 'house_small_1');

        // West: Farm (Javier)
        this.buildFarm(15, 50);
        this.buildHouse(10, 45, 6, 4, 'house_javier'); // Farmhouse

        // South: Tavern & Shop
        this.buildTavern(40, 70);
        this.buildShop(60, 70);

        // Scattered Residential
        this.buildHouse(25, 30, 4, 3, 'house_orphan'); // Martha/Lila
        this.buildHouse(35, 85, 5, 4, 'house_fisher'); // Old Thomas
        this.buildHouse(75, 80, 4, 3, 'house_generic_1');

        // Paths
        this.buildPaths();

        // --- 3. Player ---
        let startX = 50 * TILE_SIZE;
        let startY = 55 * TILE_SIZE; // Start at Plaza

        if (data && data.startX) startX = data.startX;
        if (data && data.startY) startY = data.startY;

        this.player = this.physics.add.sprite(startX, startY, 'hero');
        this.player.setScale(1); // Standard pixel art scale
        this.player.body.setSize(12, 12);
        this.player.body.setOffset(6, 12);
        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);

        // Camera
        this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
        this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
        this.cameras.main.setZoom(2);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // Collisions
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.player, this.props); // Collide with crates/anvils
        this.physics.add.overlap(this.player, this.doorZones, this.onEnterHouse, null, this);

        // Controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // UI
        this.add.text(10, 10, 'Valleverde Village', {
            fontSize: '16px', fill: '#fff', stroke: '#000', strokeThickness: 4
        }).setScrollFactor(0).setDepth(9000);

        // --- 4. Initialize NPCs ---
        this.initializeNPCs(TILE_SIZE);

        // Darkness Overlay
        this.darknessOverlay = this.add.rectangle(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE, 0x000020)
            .setOrigin(0, 0)
            .setDepth(8000)
            .setAlpha(0);
    }

    initializeNPCs(tileSize) {
        // Clear existing just in case
        this.npcGroup.clear(true, true);

        NPC_DATA.forEach(config => {
            npcManager.registerNPC(config);

            // Create Sprite
            // Initial position based on HOME or random in village if unknown
            // For now, spawn at Plaza + random offset to avoid stacking
            const rx = (50 + (Math.random() * 10 - 5)) * tileSize;
            const ry = (50 + (Math.random() * 10 - 5)) * tileSize;

            const spriteKey = `npc_${config.role || 'villager_f'}`;
            const sprite = this.physics.add.sprite(rx, ry, spriteKey);
            sprite.setDepth(10);
            sprite.npcId = config.id;

            // Add name tag
            const label = this.add.text(rx, ry - 12, config.name, {
                fontSize: '10px', fill: '#ffffff', stroke: '#000000', strokeThickness: 2
            }).setOrigin(0.5);

            // Store reference in sprite for updates
            sprite.label = label;
            this.npcGroup.add(sprite);
        });

        // Physics for NPCs?
        // this.physics.add.collider(this.npcGroup, this.walls);
    }

    // --- Building Helpers ---

    buildPlaza(cx, cy, radius) {
        const TILE_SIZE = 16;
        for (let y = cy - radius; y <= cy + radius; y++) {
            for (let x = cx - radius; x <= cx + radius; x++) {
                if ((x - cx)**2 + (y - cy)**2 <= radius**2) {
                     this.groundGroup.create(x * TILE_SIZE, y * TILE_SIZE, 'tile_dirt').setOrigin(0,0).setDepth(1);
                }
            }
        }
        // Fountain or Statue in center?
        this.props.create(cx * TILE_SIZE, cy * TILE_SIZE, 'cross_stone').setOrigin(0,0).setDepth(15).refreshBody(); // Placeholder fountain
    }

    buildChurch(x, y) {
        // Large Stone Building
        this.buildBuilding(x, y, 10, 12, 'wall_stone', 'roof_red', 'church_main', [
            { tx: 4, ty: 0, tex: 'cross_stone', depth: 25 }, // Cross on roof
            { tx: 2, ty: 6, tex: 'window_stained' },
            { tx: 7, ty: 6, tex: 'window_stained' }
        ]);
    }

    buildBlacksmith(x, y) {
        // Open front or semi-open
        this.buildBuilding(x, y, 8, 6, 'wall_wood', 'roof_red', 'blacksmith_main', [
            { tx: 1, ty: 3, tex: 'wall_chimney' },
            { tx: 6, ty: 2, tex: 'sign_weapon', depth: 25 }
        ]);
        // Anvil outside
        this.props.create((x + 2) * 16, (y + 6) * 16, 'forge_anvil').setOrigin(0,0).refreshBody();
    }

    buildTavern(x, y) {
        this.buildBuilding(x, y, 12, 8, 'wall_wood', 'roof_red', 'tavern_main', [
             { tx: 3, ty: 4, tex: 'sign_mug', depth: 25 },
             { tx: 2, ty: 5, tex: 'wall_window' },
             { tx: 9, ty: 5, tex: 'wall_window' }
        ]);
    }

    buildShop(x, y) {
        this.buildBuilding(x, y, 8, 6, 'wall_plaster', 'roof_red', 'shop_main', [
            { tx: 1, ty: 4, tex: 'wall_window' },
            { tx: 6, ty: 4, tex: 'wall_window' }
        ]);
        // Crates outside
        this.props.create((x + 1) * 16, (y + 6) * 16, 'obj_crate').setOrigin(0,0).refreshBody();
        this.props.create((x + 2) * 16, (y + 6) * 16, 'obj_crate').setOrigin(0,0).refreshBody();
    }

    buildFarm(x, y) {
        const TILE_SIZE = 16;
        // Crops Area
        for(let i=0; i<10; i++) {
            for(let j=0; j<8; j++) {
                let crop = (i % 2 === 0) ? 'crop_wheat' : 'crop_veg';
                this.groundGroup.create((x + i) * TILE_SIZE, (y + j) * TILE_SIZE, crop).setOrigin(0,0).setDepth(5);
            }
        }
        // Fence
        // Simple fence surrounding
        this.buildFence(x, y, 10, 8);
    }

    buildFence(tx, ty, w, h) {
         const TILE_SIZE = 16;
         // Top/Bottom
         for(let x=0; x<w; x++) {
             this.props.create((tx + x) * TILE_SIZE, ty * TILE_SIZE, 'obj_fence').setOrigin(0,0).refreshBody();
             this.props.create((tx + x) * TILE_SIZE, (ty + h - 1) * TILE_SIZE, 'obj_fence').setOrigin(0,0).refreshBody();
         }
         // Left/Right
         for(let y=1; y<h-1; y++) {
             this.props.create(tx * TILE_SIZE, (ty + y) * TILE_SIZE, 'obj_fence').setOrigin(0,0).refreshBody();
             this.props.create((tx + w - 1) * TILE_SIZE, (ty + y) * TILE_SIZE, 'obj_fence').setOrigin(0,0).refreshBody();
         }
    }

    buildGraveyard(x, y) {
        const TILE_SIZE = 16;
        for(let i=0; i<5; i++) {
            this.props.create((x + i*2) * TILE_SIZE, y * TILE_SIZE, 'cross_stone').setOrigin(0,0).refreshBody();
        }
    }

    buildHouse(tx, ty, w, h, houseId) {
        this.buildBuilding(tx, ty, w, h, 'wall_plaster', 'roof_red', houseId);
    }

    buildBuilding(tx, ty, w, h, wallTex, roofTex, houseId, decorations = []) {
        const TILE_SIZE = 16;
        const roofL = `${roofTex}_l`;
        const roofC = `${roofTex}_c`;
        const roofR = `${roofTex}_r`;

        // Roof
        this.walls.create(tx * TILE_SIZE, (ty - 1) * TILE_SIZE, roofL).setOrigin(0,0).setDepth(20);
        for (let i = 1; i < w - 1; i++) {
             this.walls.create((tx + i) * TILE_SIZE, (ty - 1) * TILE_SIZE, roofC).setOrigin(0,0).setDepth(20);
        }
        this.walls.create((tx + w - 1) * TILE_SIZE, (ty - 1) * TILE_SIZE, roofR).setOrigin(0,0).setDepth(20);

        // Walls
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let texture = wallTex;
                const isDoor = (y === h - 1 && x === Math.floor(w / 2));
                if (isDoor) texture = 'wall_door';

                const wall = this.walls.create((tx + x) * TILE_SIZE, (ty + y) * TILE_SIZE, texture).setOrigin(0,0);
                wall.refreshBody();

                if (isDoor) {
                    wall.body.checkCollision.none = true;
                    // Zone
                    const zone = this.add.rectangle((tx + x) * TILE_SIZE + 8, (ty + y) * TILE_SIZE + 8, 8, 8, 0x00ff00, 0);
                    this.physics.add.existing(zone, true);
                    zone.houseId = houseId;
                    zone.returnX = (tx + x) * TILE_SIZE + 8;
                    zone.returnY = (ty + y + 1) * TILE_SIZE + 16;
                    this.doorZones.add(zone);
                }
            }
        }

        // Decorations
        decorations.forEach(dec => {
            const d = this.add.image((tx + dec.tx) * TILE_SIZE, (ty + dec.ty) * TILE_SIZE, dec.tex).setOrigin(0,0);
            if (dec.depth) d.setDepth(dec.depth);
            else d.setDepth(21); // Above walls
        });
    }

    buildPaths() {
        // Connect key points
        this.drawPath(50, 50, 50, 32); // Plaza to Church
        this.drawPath(50, 50, 80, 50); // Plaza to Blacksmith
        this.drawPath(50, 50, 25, 50); // Plaza to Farm
        this.drawPath(50, 50, 50, 70); // Plaza to Tavern
    }

    drawPath(x1, y1, x2, y2) {
        const TILE_SIZE = 16;
        let cx = x1;
        let cy = y1;
        while (cy !== y2) {
            this.groundGroup.create(cx * TILE_SIZE, cy * TILE_SIZE, 'tile_dirt').setOrigin(0,0).setDepth(1);
            cy += (y2 > y1) ? 1 : -1;
        }
        while (cx !== x2) {
            this.groundGroup.create(cx * TILE_SIZE, cy * TILE_SIZE, 'tile_dirt').setOrigin(0,0).setDepth(1);
            cx += (x2 > x1) ? 1 : -1;
        }
        this.groundGroup.create(x2 * TILE_SIZE, y2 * TILE_SIZE, 'tile_dirt').setOrigin(0,0).setDepth(1);
    }

    onEnterHouse(player, zone) {
        if (this.entering) return;
        this.entering = true;
        this.cameras.main.fadeOut(500);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.sound.stopAll(); // Stop music when entering house
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
        npcManager.update(timeSystem);
        this.updateNPCVisuals();
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

    updateNPCVisuals() {
        this.npcGroup.getChildren().forEach(sprite => {
            const npc = npcManager.getNPC(sprite.npcId);
            if (!npc) return;

            // Simple movement simulation based on state
            // If IDLE, stand still.
            // If WALKING, move towards target (not implemented fully in Logic yet)

            // Update label position
            if (sprite.label) {
                sprite.label.setPosition(sprite.x, sprite.y - 12);

                // Debug status
                // sprite.label.setText(`${npc.name}\n${npc.currentState.action}`);
            }

            // Sync with Logic Location (Teleport for now if far away, to simulate off-screen movement)
            // Ideally pathfinding would happen here.
            // We defined zones in logic like "FORGE", "CHURCH". We need a coordinate map.
            const targetPos = this.getZoneCoordinates(npc.currentState.location);
            if (targetPos) {
                 const dx = targetPos.x - sprite.x;
                 const dy = targetPos.y - sprite.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);

                 if (dist > 5) {
                     const speed = 30; // Slow walk
                     sprite.body.setVelocity(dx/dist * speed, dy/dist * speed);
                 } else {
                     sprite.body.setVelocity(0);
                 }
            }
        });
    }

    getZoneCoordinates(zoneName) {
        const TILE_SIZE = 16;
        const zones = {
            'HOME': null, // Varies by NPC, ignored for generic now
            'FORGE': { x: 80 * TILE_SIZE, y: 50 * TILE_SIZE },
            'TAVERN': { x: 40 * TILE_SIZE, y: 70 * TILE_SIZE },
            'CHURCH': { x: 50 * TILE_SIZE, y: 20 * TILE_SIZE },
            'FARM': { x: 15 * TILE_SIZE, y: 50 * TILE_SIZE },
            'MARKET': { x: 50 * TILE_SIZE, y: 50 * TILE_SIZE }, // Plaza
            'PLAZA': { x: 50 * TILE_SIZE, y: 50 * TILE_SIZE },
            'SHOP': { x: 60 * TILE_SIZE, y: 70 * TILE_SIZE },
            'OFFICE': { x: 50 * TILE_SIZE, y: 50 * TILE_SIZE } // Guard post?
        };
        return zones[zoneName] || zones['PLAZA'];
    }
}
