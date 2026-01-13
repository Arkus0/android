export class Unit extends Phaser.GameObjects.Sprite {
    constructor(scene, x, y, texture, frame, type, hp, damage) {
        super(scene, x, y, texture, frame);
        this.type = type;
        this.maxHp = hp;
        this.hp = hp;
        this.damage = damage; // Daño base
        this.alive = true;

        // Añadir a la escena
        scene.add.existing(this);
    }

    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp < 0) this.hp = 0;
        if (this.hp <= 0) {
            this.alive = false;
        }
    }
}
