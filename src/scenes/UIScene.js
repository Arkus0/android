export class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        // Obtenemos referencia a la escena de batalla para escuchar eventos
        this.battleScene = this.scene.get('BattleScene');

        // Panel de fondo para UI (SNES Style Window)
        this.createWindow(10, 450, 780, 140);

        // Texto de acciones (Menú)
        this.menus = this.add.container(40, 470);

        this.attackMenuItem = this.add.text(0, 10, '⚔️ Atacar', { fontSize: '24px', fill: '#fff' });
        this.healMenuItem = this.add.text(0, 50, '✨ Curar', { fontSize: '24px', fill: '#fff' });

        this.menus.add([this.attackMenuItem, this.healMenuItem]);

        // Habilitar interactividad
        this.attackMenuItem.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.attackMenuItem.width, this.attackMenuItem.height), Phaser.Geom.Rectangle.Contains);
        this.healMenuItem.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.healMenuItem.width, this.healMenuItem.height), Phaser.Geom.Rectangle.Contains);

        this.attackMenuItem.on('pointerdown', () => {
            if(this.isPlayerTurn) {
                this.selectAction('attack');
            }
        });

        this.healMenuItem.on('pointerdown', () => {
            if(this.isPlayerTurn) {
                this.selectAction('heal');
            }
        });

        this.menus.visible = false; // Oculto hasta que sea turno

        // Panel de Mensajes (Log)
        this.messageText = this.add.text(300, 470, 'Esperando batalla...', {
            fontSize: '20px',
            fill: '#fff',
            wordWrap: { width: 450 }
        });

        // Stats (Barras de vida simples con texto)
        this.heroHpText = this.add.text(600, 250, 'HP: 100/100', { fontSize: '20px', fill: '#fff' });
        this.enemyHpText = this.add.text(200, 250, 'HP: 50/50', { fontSize: '20px', fill: '#fff' });

        // Eventos
        this.battleScene.events.on('PlayerTurn', this.onPlayerTurn, this);
        this.battleScene.events.on('Message', this.onMessage, this);
        this.battleScene.events.on('UpdateStats', this.updateStats, this);

        this.isPlayerTurn = false;

        // Hover effects
        this.attackMenuItem.on('pointerover', () => { this.attackMenuItem.setColor('#f39c12'); });
        this.attackMenuItem.on('pointerout', () => { this.attackMenuItem.setColor('#ffffff'); });
        this.healMenuItem.on('pointerover', () => { this.healMenuItem.setColor('#f39c12'); });
        this.healMenuItem.on('pointerout', () => { this.healMenuItem.setColor('#ffffff'); });
    }

    onPlayerTurn() {
        this.isPlayerTurn = true;
        this.menus.visible = true;
        this.messageText.setText("¡Es tu turno! Elige una acción.");
    }

    selectAction(action) {
        this.isPlayerTurn = false;
        this.menus.visible = false;
        this.events.emit('PlayerSelectAction', action);
    }

    onMessage(message) {
        this.messageText.setText(message);
    }

    updateStats() {
        const hero = this.battleScene.hero;
        const enemy = this.battleScene.enemy;
        this.heroHpText.setText(`HP: ${hero.hp}/${hero.maxHp}`);
        this.enemyHpText.setText(`HP: ${enemy.hp}/${enemy.maxHp}`);
    }

    createWindow(x, y, w, h) {
        // 9-Slice Scaling using 16x16 tiles
        const CORNER_SIZE = 16;
        const centerW = w - (CORNER_SIZE * 2);
        const centerH = h - (CORNER_SIZE * 2);

        // Center (Background)
        this.add.image(x + CORNER_SIZE, y + CORNER_SIZE, 'ui_window_c')
            .setOrigin(0, 0)
            .setDisplaySize(centerW, centerH);

        // Edges
        this.add.image(x + CORNER_SIZE, y, 'ui_window_t')
            .setOrigin(0, 0)
            .setDisplaySize(centerW, CORNER_SIZE); // Top

        this.add.image(x + CORNER_SIZE, y + h - CORNER_SIZE, 'ui_window_b')
            .setOrigin(0, 0)
            .setDisplaySize(centerW, CORNER_SIZE); // Bottom

        this.add.image(x, y + CORNER_SIZE, 'ui_window_l')
            .setOrigin(0, 0)
            .setDisplaySize(CORNER_SIZE, centerH); // Left

        this.add.image(x + w - CORNER_SIZE, y + CORNER_SIZE, 'ui_window_r')
            .setOrigin(0, 0)
            .setDisplaySize(CORNER_SIZE, centerH); // Right

        // Corners
        this.add.image(x, y, 'ui_window_tl').setOrigin(0, 0);
        this.add.image(x + w - CORNER_SIZE, y, 'ui_window_tr').setOrigin(0, 0);
        this.add.image(x, y + h - CORNER_SIZE, 'ui_window_bl').setOrigin(0, 0);
        this.add.image(x + w - CORNER_SIZE, y + h - CORNER_SIZE, 'ui_window_br').setOrigin(0, 0);
    }
}
