var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            //gravity: { y: 200 }
        }
    },
    parent: 'phaser',
    dom: {
        createContainer: true
    },
    scene: [MenuScene,GameScene],
    pixelArt: false
};

var game = new Phaser.Game(config);
var player;
