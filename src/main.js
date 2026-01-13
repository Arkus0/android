import { BootScene } from './scenes/BootScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { UIScene } from './scenes/UIScene.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    pixelArt: true, // Importante para estilo retro/RPG
    backgroundColor: '#000000',
    scene: [
        BootScene,
        BattleScene,
        UIScene
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    }
};

const game = new Phaser.Game(config);
