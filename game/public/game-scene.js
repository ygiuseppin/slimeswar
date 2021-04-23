// Constants
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const CAMERA_WIDTH = 800;
const CAMERA_HEIGHT = 600;
const POO_DELAY = 3000;

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super("playGame");
    }

    createChat () {
        // create chat
        $('body').append(`
            <div id="chatDiv">
                <textarea readonly id="playerList"></textarea>
                <textarea readonly id="chatArea"></textarea>
                <form id="chatForm" autocomplete="off">
                    <input id="message" type="text" name="message">
                    <input id="chatButton" type="submit" value="Enviar">
                </form>
            </div>
        `);
        $('#chatForm').submit((e) => {
            e.preventDefault();
            if ($('#message').val() !== ""){
                this.sendMessage($('#message').val());
                $('#message').val("");
            }
        });
        
        // enable/disable keyboard input if chat is disabled/enabled
        $('#message').on('focus',()=>{game.input.keyboard.enabled = false});
        $('#message').on('focusout',()=>{game.input.keyboard.enabled = true});
    }

    preload () {
        console.log('Loading game');

        // initial values
        this.otherPlayers = this.physics.add.group();
        this.otherNames = {};
        this.poos = this.physics.add.group();
        this.lastPooTime = new Date();
        this.nameSent = false;
        this.color = localStorage.getItem('color');
        this.playerName = localStorage.getItem('name');
        this.createChat();
        this.load.bitmapFont('myfont', 'assets/fonts/bitmapFonts/nokia.png', 'assets/fonts/bitmapFonts/nokia.xml');
        this.color = localStorage.getItem('color');
        this.load.image('sandtile', './assets/tiles/grass1.png');
        this.loadSprites();

        console.log('Game Loaded');
    }

    loadSprites() {

        // poo
        this.load.spritesheet(`poo`, `./assets/slimes/poo.png`,{ 
            frameWidth: 41, 
            frameHeight: 54 
        });

        // slimes
        for (let color of COLORS) {
            this.load.spritesheet(`slime${color}`, `./assets/slimes/slime${color}.png`,{ 
                frameWidth: 49, 
                frameHeight: 49 
            });
        }
    }

    createAnimations() {
        // poo
        this.anims.create({
            key:`pooAnim`,
            frames: this.anims.generateFrameNumbers(`poo`,{start:0,end:3}),
            frameRate: 10,
            repeat: true
        });

        // players
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
        this.socket.emit('message', {message});
    }

    createSocketHandlers() {
        this.socket = io();
        this.socket.on('currentPlayers', function (players) {
            Object.keys(players).forEach((id) => {
                if (players[id].playerId !== self.socket.id) {
                    self.addOtherPlayers(self, players[id]);
                }else{
                    self.addPlayer(self, players[id]);
                }
            });
        });
        this.socket.on('newMessage', function (messageInfo) {
            console.log('New message received: ', messageInfo);
            const addToChat = `${messageInfo.player.name}: ${messageInfo.message}`;
            $("#chatArea").text($("#chatArea").text() + addToChat + '\n');
            $("#chatArea").scrollTop($("#chatArea")[0].scrollHeight);
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
            console.log('player disconnected');
            self.otherPlayers.getChildren().forEach(function (otherPlayer) {
              if (playerId === otherPlayer.playerId) {
                otherPlayer.destroy();
                self.otherNames[playerId].destroy();
                delete self.otherNames[playerId];
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
    }

    create () {
        // bg
        this.tilesprite = this.add.tileSprite(400, 300, WORLD_WIDTH, WORLD_HEIGHT, 'sandtile');
        this.physics.world.bounds = new Phaser.Geom.Rectangle(-400, -300, WORLD_WIDTH, WORLD_HEIGHT);

        this.createSocketHandlers();
        this.createAnimations();

        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wKey = this.input.keyboard.addKey('W');  // Get key object

        // Set update function
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
            self.playerMovement();

            // Send position always
            //if (self.player.oldPosition && (x !== self.player.oldPosition.x || y !== self.player.oldPosition.y)) {
                self.socket.emit('playerMovement', { x: self.player.x, y: self.player.y, frame: self.player.anims.getFrameName().toString() });
            //}

            self.player.oldPosition = {
                x: self.player.x,
                y: self.player.y,
            };

            self.updatePlayerList(self);
        }
    }

    updatePlayerList (self) {
        // update player list
        let playerListText = `${self.playerName}\n`;
        for (var key in self.otherNames){
            playerListText += self.otherNames[key].text +'\n'
        }
        $('#playerList').text(playerListText);
    }

    addPlayer(self, playerInfo) {
        self.myname = self.add.bitmapText(10, 100, 'myfont', self.playerName, 14);
        self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'slimeverde');
        self.player.setCollideWorldBounds(true);

        self.cameras.main.startFollow(self.player, true, 0.08, 0.08);
        self.cameras.main.setBackgroundColor('#4d755f');
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

    playerMovement(){

        // add poo
        if (this.wKey.isDown && (new Date() - this.lastPooTime) > POO_DELAY){
            this.lastPooTime = new Date();
            const newPoo = this.physics.add.sprite(this.player.x, this.player.y, 'poo');
            //newPoo.play({key:'pooAnim', repeat:100});
            this.poos.add(newPoo);
        }

        // Move x
        if (this.cursors.left.isDown){
            this.player.setVelocityX(-200);
        } else if (this.cursors.right.isDown){
            this.player.setVelocityX(200);
        } else {
            this.player.setVelocityX(0);
        }

        // Move y
        if (this.cursors.up.isDown) {
            this.player.setVelocityY(-200);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(200);
        } else {
            this.player.setVelocityY(0);
        }

        // Play/Stop animation
        if (this.cursors.left.isDown || this.cursors.right.isDown || this.cursors.up.isDown || this.cursors.down.isDown) {
            this.player.anims.play(`move${this.color}`, true);
        } else {
            this.player.anims.play(`turn${this.color}`);
        }

        // Move my name
        this.myname.setPosition(this.player.x-this.myname.width/2,this.player.y-25);
    }
}