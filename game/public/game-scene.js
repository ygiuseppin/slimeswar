// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super("playGame");
    }

    preload () {

        // create chat
        $('body').append(`
        <div>
            <textarea id="chatArea"></textarea>
            <form id="chatForm">
                <input id="message" type="text">
                <input id="chatButton" type="submit" value="Enviar">
            </form>
        </div>
        `);
        $('#chatForm').submit((e) => {
            e.preventDefault();
            this.sendMessage($('#message').val());
        });

        console.log('Loading game');
        this.nameSent = false;
        this.load.bitmapFont('myfont', 'assets/fonts/bitmapFonts/nokia.png', 'assets/fonts/bitmapFonts/nokia.xml');
        this.color = localStorage.getItem('color');

        // load tiles
        this.load.image('sandtile', './assets/tiles/grass1.png');
        
        this.otherPlayers = this.physics.add.group();
        this.otherNames = {};

        this.loadSprites();

        console.log('Game Loaded');
    }

    loadSprites() {
        for (let color of COLORS) {
            this.load.spritesheet(`slime${color}`, `./assets/slimes/slime${color}.png`,{ 
                frameWidth: 49, 
                frameHeight: 49 
            });
        }
    }

    createAnimations() {
        for (let color of COLORS) {
            this.anims.create({
                key:`move${color}`,
                frames: this.anims.generateFrameNumbers(`slime${color}`,{start:0,end:12}),
                frameRate: 20,
                repeat: true
            });
            this.anims.create({
                key:`turn${color}`,
                frames: this.anims.generateFrameNumbers(`slime${color}`,{start:0,end:0}),
                frameRate: 20,
                repeat: false
            });
        }
    }

    sendMessage(message) {
        console.log('send message:', message);
    }
    create () {
        // bg
        this.tilesprite = this.add.tileSprite(400, 300, 1600, 1200, 'sandtile');
        const self = this;
        this.socket = io();

        // socket
        this.socket.on('currentPlayers', function (players) {
            Object.keys(players).forEach((id) => {
                if (players[id].playerId !== self.socket.id) {
                    self.addOtherPlayers(self, players[id]);
                }else{
                    self.addPlayer(self, players[id]);
                }
            });
        });
        this.socket.on('newPlayer', function (playerInfo) {
            self.addOtherPlayers(self, playerInfo);
        });
        this.socket.on('playerInfo', function (playerInfo) {
            self.otherNames[playerInfo.playerId].text = playerInfo.name;
            console.log('player info received');
            // change color
            if(playerInfo.color!="rojo"){
                // destroy old
                self.otherPlayers.getChildren().forEach((otherPlayer) => {if (playerInfo.playerId === otherPlayer.playerId) {otherPlayer.destroy()}});
                // create new
                const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, `slime${playerInfo.color}`).setOrigin(0.5, 0.5).setDisplaySize(49, 49);
                otherPlayer.playerId = playerInfo.playerId;
                self.otherPlayers.add(otherPlayer);
            }
        });
        this.socket.on('disconnectPlayer', function (playerId) {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
              if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
                self.otherNames[playerId].destroy();
              }
            });
        });
        this.socket.on('playerMoved', function (playerInfo) {
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
              if (playerInfo.playerId === otherPlayer.playerId) {
                otherPlayer.setPosition(playerInfo.x, playerInfo.y);
                // set frame
                otherPlayer.anims.play( {key:`move${playerInfo.color}`,startFrame:playerInfo.frame});
                otherPlayer.anims.pause(otherPlayer.anims.currentFrame);

                const name = self.otherNames[otherPlayer.playerId];
                name.setPosition(playerInfo.x-name.width/2,playerInfo.y-25);
              }
            }); 
        });
        this.socket.on('disconnect', () => {
            this.scene.start('menu');
        })
        this.createAnimations();

        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();

        var timer = this.time.addEvent({
            delay: 3,callback:()=>{this.myUpdate(this)},loop:true});

        timer.paused = false;  
        console.log('Game Created');  

        
    }

    myUpdate (self) {
        if (self.player && self.myname){
            if(!self.nameSent){
                self.socket.emit('playerInfo', {name:localStorage.getItem('name') || 'pepe', color: localStorage.getItem('color')});
                self.nameSent = true;
            }
            self.player1Movement();
            // emit player movement
            var x = self.player.x;
            var y = self.player.y;

            //if (self.player.oldPosition && (x !== self.player.oldPosition.x || y !== self.player.oldPosition.y)) {
                self.socket.emit('playerMovement', { x: self.player.x, y: self.player.y, frame: self.player.anims.getFrameName().toString() });
            //}
            self.player.oldPosition = {
                x: self.player.x,
                y: self.player.y,
            };
        }
    }

    addPlayer(self, playerInfo) {
        self.myname = self.add.bitmapText(10, 100, 'myfont', localStorage.getItem('name'),14);
        self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'slimeverde');
        //self.player.setCollideWorldBounds(true);

        self.cameras.main.startFollow(self.player, true, 0.08, 0.08);
    }

    addOtherPlayers(self, playerInfo) {
        console.log('A new player arrived');
        
        const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, `slime${playerInfo.color}`).setOrigin(0.5, 0.5).setDisplaySize(49, 49);
        const name = self.add.bitmapText(0, 0, 'myfont', playerInfo.name, 14);
        name.setPosition(playerInfo.x-name.width/2,playerInfo.y-25);
        otherPlayer.playerId = playerInfo.playerId;
        
        self.otherNames[playerInfo.playerId] = name;
        self.otherPlayers.add(otherPlayer);
    }

    player1Movement(){
        if (this.cursors.left.isDown){
            this.player.setVelocityX(-200);
        } else if (this.cursors.right.isDown){
            this.player.setVelocityX(200);
        } else {
            this.player.setVelocityX(0);
        }

        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
        } else {
            this.player.setVelocityY(0);
        }

        if (this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown) {
            this.player.anims.play(`move${this.color}`, true);
        } else {
            this.player.anims.play(`turn${this.color}`);
        }
        this.myname.setPosition(this.player.x-this.myname.width/2,this.player.y-25);
    }
}