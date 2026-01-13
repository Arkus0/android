export class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    create() {
        // Obtenemos referencia a la escena de batalla para escuchar eventos
        this.battleScene = this.scene.get('BattleScene');

        // Panel de fondo para UI
        this.graphics = this.add.graphics();
        this.graphics.fillStyle(0x000000, 0.7);
        this.graphics.fillRect(10, 450, 780, 140); // Caja negra abajo
        this.graphics.lineStyle(4, 0xffffff);
        this.graphics.strokeRect(10, 450, 780, 140);

        // Texto de acciones (Menú)
        this.menus = this.add.container(20, 460);

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
}
