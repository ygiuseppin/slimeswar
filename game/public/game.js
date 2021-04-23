var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
        default: 'arcade',
        arcade: {
            //gravity: { y: 200 }
        }
    },
    parent: 'phaser',
    dom: {
        createContainer: true
    },
    scene: [Scene0,Scene1],
    pixelArt: false
};

var game = new Phaser.Game(config);
var player;