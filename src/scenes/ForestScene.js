import { timeSystem } from '../systems/TimeSystem.js';

export class ForestScene extends Phaser.Scene {
    constructor() {
        super('ForestScene');
    }

    create() {
        // Play Music
        if (!this.sound.get('bgm_forest')) {
            this.sound.play('bgm_forest', { loop: true, volume: 0.5 });
        }

        if (!this.scene.get('WorldUIScene').scene.isActive()) {
            this.scene.launch('WorldUIScene');
        }

        // Map Dimensions
        const TILE_SIZE = 16;
        const MAP_WIDTH = 50;
        const MAP_HEIGHT = 40;

        // 1. Generate Ground (Grass & Dirt)
        this.groundGroup = this.add.group();
        this.walls = this.physics.add.staticGroup(); // Trees

        // Procedural Generation: Simple Noise/Path
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                let texture = 'tile_grass';

                // Randomly vary grass
                if (Math.random() > 0.8) texture = 'tile_grass_var';

                // Simple Path (Middle Vertical)
                if (Math.abs(x - 25) < 3 + Math.sin(y * 0.2) * 1.5) {
                    texture = 'tile_dirt';
                }

                const tile = this.add.image(x * TILE_SIZE, y * TILE_SIZE, texture).setOrigin(0, 0);
                this.groundGroup.add(tile);
            }
        }

        // 2. Generate Trees (Obstacles)
        // Scatter trees where there is NO dirt
        for (let i = 0; i < 60; i++) {
            const tx = Phaser.Math.Between(1, MAP_WIDTH - 2);
            const ty = Phaser.Math.Between(2, MAP_HEIGHT - 3);

            // Check if on path (approximate)
            if (Math.abs(tx - 25) < 5) continue;

            const x = tx * TILE_SIZE;
            const y = ty * TILE_SIZE;

            // Tree Object (Single Sprite)
            const tree = this.walls.create(x + 8, y + 8, 'obj_tree');
            tree.setOrigin(0.5, 1); // Origin at bottom center for easier z-sorting
            tree.setPosition(x + 8, y + 8); // Re-position because origin changed

            // Adjust physics body (trunk area)
            // Sprite is ~53x74. Trunk is at bottom.
            // Body relative to center of sprite (if static?).
            // Static bodies are tricky with origin changes sometimes.
            // Let's reset origin to 0.5, 0.5 and manual offset?
            // Or just trust refreshBody.

            tree.setOrigin(0.5, 1);
            tree.refreshBody();

            // Set body size (small box at bottom)
            const width = 16;
            const height = 16;
            tree.body.setSize(width, height);
            tree.body.setOffset((tree.width - width) / 2, tree.height - height);

            tree.setDepth(tree.y); // Initial depth
        }

        // World Bounds
        this.physics.world.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
        this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);
        this.cameras.main.setZoom(2);

        // 3. Player
        // Position on the path
        this.player = this.physics.add.sprite(400, 300, 'hero');
        this.player.setScale(1); // Pixel art scale

        // Adjust player body
        this.player.body.setSize(12, 12);
        this.player.body.setOffset(6, 12); // Bottom half of 24x24

        this.player.setCollideWorldBounds(true);
        this.player.setDepth(10);

        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        // 4. Collisions
        this.physics.add.collider(this.player, this.walls);

        // 5. Exit Zone (Bottom of path)
        this.exitZone = this.add.rectangle(400, (MAP_HEIGHT * TILE_SIZE) - 20, 100, 20, 0xff0000, 0);
        this.physics.add.existing(this.exitZone, true);
        this.physics.add.overlap(this.player, this.exitZone, this.onExit, null, this);

        // 6. Controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // UI Info
        this.add.text(10, 10, 'Forest (Updated Assets)', {
            fontSize: '16px',
            fill: '#fff',
            stroke: '#000', strokeThickness: 4
        }).setScrollFactor(0).setDepth(9000);

        // Darkness Overlay
        this.darknessOverlay = this.add.rectangle(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE, 0x000020)
            .setOrigin(0, 0)
            .setDepth(8000)
            .setAlpha(0);
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

        // Depth Sorting
        this.player.setDepth(this.player.y);
    }

    onExit() {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, (cam, effect) => {
            // Stop forest music? Or fade it.
            this.sound.stopAll();
            this.scene.start('BattleScene');
        });
    }
}
