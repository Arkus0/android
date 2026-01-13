// Escena principal de batalla
import { Unit } from '../prefabs/Unit.js';

export class BattleScene extends Phaser.Scene {
    constructor() {
        super('BattleScene');
    }

    create() {
        // Fondo
        this.add.image(400, 300, 'background');

        // Instanciar personajes
        // Escalar sprites pixel art x3 para que se vean imponentes en batalla

        // Héroe a la derecha
        this.hero = new Unit(this, 600, 300, 'hero_texture', 0, 'Hero', 100, 20);
        this.hero.setScale(4); // 32x32 original -> 128x128 visual

        // Enemigo a la izquierda
        this.enemy = new Unit(this, 200, 300, 'enemy_texture', 0, 'Enemy', 50, 10);
        this.enemy.setScale(4);

        // Iniciar la UI (pasándole referencia a esta escena para que pueda leer stats)
        this.scene.launch('UIScene');

        // Estado de batalla
        this.heroes = [this.hero];
        this.enemies = [this.enemy];
        this.units = this.heroes.concat(this.enemies); // Turn order simple

        this.index = -1; // Quién toca

        // Escuchar eventos de UI (el jugador elige acción)
        this.scene.get('UIScene').events.on('PlayerSelectAction', this.onPlayerSelectAction, this);

        // Iniciar primer turno
        // Pequeño delay para dar tiempo a UI a cargar
        this.time.addEvent({ delay: 1000, callback: this.nextTurn, callbackScope: this });
    }

    nextTurn() {
        // Ciclar turnos
        this.index++;
        // Si llegamos al final, volver al principio
        if (this.index >= this.units.length) {
            this.index = 0;
        }

        const currentUnit = this.units[this.index];

        if (currentUnit.alive) {
            if (currentUnit instanceof Unit && currentUnit.type === 'Hero') {
                // Turno del jugador
                this.events.emit('PlayerTurn');
            } else {
                // Turno de la IA
                this.time.addEvent({ delay: 1000, callback: this.enemyAttack, callbackScope: this });
            }
        } else {
            // Si está muerto, saltar turno
            this.nextTurn();
        }
    }

    onPlayerSelectAction(action) {
        if (action === 'attack') {
            this.heroAttack();
        } else if (action === 'heal') {
            this.heroHeal();
        }
    }

    heroAttack() {
        // Lógica de daño simple
        const dmg = this.hero.damage;
        this.enemy.takeDamage(dmg);

        // Notificar a UI
        this.events.emit('Message', `Héroe ataca por ${dmg} daño.`);
        this.events.emit('UpdateStats'); // Actualizar barras de vida

        // Efecto visual simple (tween)
        this.tweens.add({
            targets: this.enemy,
            x: this.enemy.x - 10,
            y: this.enemy.y + 10,
            duration: 50,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                 this.checkEndBattle();
            }
        });
    }

    heroHeal() {
        const heal = 30;
        this.hero.hp = Math.min(this.hero.maxHp, this.hero.hp + heal);
        this.events.emit('Message', `Héroe se cura ${heal} HP.`);
        this.events.emit('UpdateStats');
        this.time.addEvent({ delay: 1000, callback: this.nextTurn, callbackScope: this });
    }

    enemyAttack() {
        const dmg = this.enemy.damage;
        this.hero.takeDamage(dmg);

        this.events.emit('Message', `Limo ataca por ${dmg} daño.`);
        this.events.emit('UpdateStats');

        this.tweens.add({
            targets: this.hero,
            x: this.hero.x + 10,
            y: this.hero.y - 10,
            duration: 50,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                 this.checkEndBattle();
            }
        });
    }

    checkEndBattle() {
        if (!this.enemy.alive) {
            this.events.emit('Message', '¡Ganaste la batalla!');
            // Fin de demo
        } else if (!this.hero.alive) {
            this.events.emit('Message', 'Game Over.');
        } else {
            // Siguiente turno
            this.time.addEvent({ delay: 1000, callback: this.nextTurn, callbackScope: this });
        }
    }
}
