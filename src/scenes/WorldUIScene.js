import { timeSystem } from '../systems/TimeSystem.js';

export class WorldUIScene extends Phaser.Scene {
    constructor() {
        super('WorldUIScene');
    }

    create() {
        // --- Setup UI Container ---
        this.menuContainer = this.add.container(0, 0);
        this.menuContainer.setVisible(false);

        // Background Window (Centered)
        // 400x300 center. Size 400x300?
        const wx = 200, wy = 150, ww = 400, wh = 300;
        this.createWindow(wx, wy, ww, wh);

        // Title
        const title = this.add.text(400, 180, 'PAUSA / TIEMPO', {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        this.menuContainer.add(title);

        // Time Info
        this.dayText = this.add.text(wx + 40, wy + 60, '', { fontSize: '20px', fill: '#ffffff' });
        this.timeText = this.add.text(wx + 40, wy + 90, '', { fontSize: '20px', fill: '#ffffff' });
        this.menuContainer.add([this.dayText, this.timeText]);

        // --- Wait Controls ---
        this.waitHours = 1;

        const waitLabel = this.add.text(wx + 40, wy + 150, 'Esperar tiempo:', { fontSize: '20px', fill: '#cccccc' });

        // Buttons
        const btnY = wy + 190;
        const btnX = wx + 100;

        // Decrease Button
        this.btnMinus = this.add.text(btnX - 40, btnY, '[-]', { fontSize: '24px', fill: '#fff' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.changeWait(-1));

        // Value Text
        this.waitValueText = this.add.text(btnX, btnY, '1 h', { fontSize: '24px', fill: '#ffff00' }).setOrigin(0.5, 0);

        // Increase Button
        this.btnPlus = this.add.text(btnX + 40, btnY, '[+]', { fontSize: '24px', fill: '#fff' })
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.changeWait(1));

        // Confirm Button
        this.btnConfirm = this.add.text(400, wy + 250, '[ CONFIRMAR ESPERA ]', {
            fontSize: '20px',
            fill: '#00ff00',
            backgroundColor: '#004400',
            padding: { x: 10, y: 5 }
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.doWait());

        this.menuContainer.add([waitLabel, this.btnMinus, this.waitValueText, this.btnPlus, this.btnConfirm]);

        // Input Keys
        this.keyM = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
        this.keyESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // Initial Update
        this.updateTimeDisplay();
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.keyM) || Phaser.Input.Keyboard.JustDown(this.keyESC)) {
            this.toggleMenu();
        }

        if (this.menuContainer.visible) {
            this.updateTimeDisplay();
        }
    }

    toggleMenu() {
        const isVisible = !this.menuContainer.visible;
        this.menuContainer.setVisible(isVisible);

        // Pause/Resume underlying scenes
        const scenesToPause = ['VillageScene', 'ForestScene', 'HouseScene'];
        scenesToPause.forEach(key => {
            const scene = this.scene.get(key);
            if (scene && scene.scene.isActive()) {
                if (isVisible) {
                    scene.physics.pause(); // Pause physics
                    // We don't fully pause the scene because we might want the bg to render?
                    // Actually scene.pause() stops update() and rendering usually freezes or continues but logic stops.
                    // Let's try scene.pause().
                    this.scene.pause(key);
                } else {
                    this.scene.resume(key);
                }
            }
        });
    }

    changeWait(delta) {
        this.waitHours += delta;
        if (this.waitHours < 1) this.waitHours = 24;
        if (this.waitHours > 24) this.waitHours = 1;
        this.waitValueText.setText(`${this.waitHours} h`);
    }

    doWait() {
        timeSystem.advanceTime(this.waitHours);
        this.updateTimeDisplay();
        // Optional: Close menu? Or keep open to see change?
        // User asked for "option to pass time". Usually you press it and time passes.
        // We update display immediately.
    }

    updateTimeDisplay() {
        this.dayText.setText(`Día: ${timeSystem.getWeekdayName()}`);
        this.timeText.setText(`Hora: ${timeSystem.getFormattedTime()}`);
    }

    createWindow(x, y, w, h) {
        const CORNER_SIZE = 16;
        const centerW = w - (CORNER_SIZE * 2);
        const centerH = h - (CORNER_SIZE * 2);

        // Helper to add to container
        const addToContainer = (img) => this.menuContainer.add(img);

        // Center
        addToContainer(this.add.image(x + CORNER_SIZE, y + CORNER_SIZE, 'ui_window_c').setOrigin(0, 0).setDisplaySize(centerW, centerH));
        // Edges
        addToContainer(this.add.image(x + CORNER_SIZE, y, 'ui_window_t').setOrigin(0, 0).setDisplaySize(centerW, CORNER_SIZE));
        addToContainer(this.add.image(x + CORNER_SIZE, y + h - CORNER_SIZE, 'ui_window_b').setOrigin(0, 0).setDisplaySize(centerW, CORNER_SIZE));
        addToContainer(this.add.image(x, y + CORNER_SIZE, 'ui_window_l').setOrigin(0, 0).setDisplaySize(CORNER_SIZE, centerH));
        addToContainer(this.add.image(x + w - CORNER_SIZE, y + CORNER_SIZE, 'ui_window_r').setOrigin(0, 0).setDisplaySize(CORNER_SIZE, centerH));
        // Corners
        addToContainer(this.add.image(x, y, 'ui_window_tl').setOrigin(0, 0));
        addToContainer(this.add.image(x + w - CORNER_SIZE, y, 'ui_window_tr').setOrigin(0, 0));
        addToContainer(this.add.image(x, y + h - CORNER_SIZE, 'ui_window_bl').setOrigin(0, 0));
        addToContainer(this.add.image(x + w - CORNER_SIZE, y + h - CORNER_SIZE, 'ui_window_br').setOrigin(0, 0));
    }
}
