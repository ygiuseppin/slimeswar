// Constants
const WORLD_WIDTH = 1600;
const WORLD_HEIGHT = 1200;
const CAMERA_WIDTH = 800;
const CAMERA_HEIGHT = 600;
const FREE_MODE_ON = true;
const MAX_LIVES = 3;

const TILE_SET = 'pokenew.png';
const TILE_MAP = 'pokemapa.json';
const TILE_WIDTH = 32;
const TILE_HEIGHT = 32;

const DIAGVEL = 0.75;

// VARIABLE
let POO_DELAY = 2000;
let VELOCITY = 180;
let POO_DURATION = 3000;
let DEAD_DURATION = 5000;
let EXP_DURATION = 64;
let INMUNITY_TIME = 2000;

// Game Scene
class GameScene extends Phaser.Scene {
    constructor() {
        super("playGame");
    }
    
    addToChatArea (message) {
        $("#chatArea").text($("#chatArea").text() + message + '\n');
        $("#chatArea").scrollTop($("#chatArea")[0].scrollHeight);
    }

    execCommand (command) {
        switch(command.split(' ')[0]) {
            case '/pro':
                POO_DELAY = 50;
                POO_DURATION = 1000;
                DEAD_DURATION = 100;
                VELOCITY = 300;
                this.addToChatArea(`< You are pro now >`);
                break;
            case '/poodelay':
                POO_DELAY = command.split(' ')[1] ? parseInt(command.split(' ')[1]) : 2000;
                this.addToChatArea(`< Poo delay is now ${POO_DELAY}ms >`);
                break;
            case '/pooduration':
                POO_DURATION = command.split(' ')[1] ? parseInt(command.split(' ')[1]) : 6000;
                this.addToChatArea(`< Poo duration is now ${POO_DURATION}ms >`);
                break;
            case '/deadduration':
                DEAD_DURATION = command.split(' ')[1] ? parseInt(command.split(' ')[1]) : 10000;
                this.addToChatArea(`< Dead duration is now ${DEAD_DURATION}ms >`);
                break;
            case '/velocity':
                VELOCITY = command.split(' ')[1] ? parseInt(command.split(' ')[1]) : 180;
                this.addToChatArea(`< Velocity is now ${VELOCITY}px/s >`);
                break;
            case '/nopoo':
                this.poos.clear(true,true);
                this.addToChatArea(`< No more poos >`);
                break;
            default:
                this.addToChatArea('< Invalid command >');
                break;
        }
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
                if ($('#message').val()[0] ==='/' && FREE_MODE_ON) {
                    this.execCommand($('#message').val());
                } else {
                    this.sendChatMessage($('#message').val());
                }
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
        this.explosions = this.physics.add.group();
        this.lastPooTime = new Date();
        this.nameSent = false;

        this.color = localStorage.getItem('color');
        this.playerName = localStorage.getItem('name');

        this.load.bitmapFont('myfont', 'assets/fonts/bitmapFonts/nokia.png', 'assets/fonts/bitmapFonts/nokia.xml');
        
        // Load tileset/tilemap
        this.load.image("tiles", `assets/tilesets/${TILE_SET}`);
        this.load.tilemapTiledJSON("map", `assets/tilemaps/${TILE_MAP}`);
        
        this.loadSprites();

        console.log('Game Loaded');
    }

    loadSprites() {
        // explosion
        this.load.spritesheet(`explosion`, `./assets/explosion.png`, { 
            frameWidth: 256, 
            frameHeight: 256 
        });

        // poo
        for (let color of COLORS) {
            this.load.spritesheet(`poo${color}`, `./assets/slimes/poo${color}.png`, { 
                frameWidth: 29, 
                frameHeight: 28 
            });
        }
        // slimes
        for (let color of COLORS) {
            this.load.spritesheet(`slime${color}`, `./assets/slimes/slime${color}.png`, { 
                frameWidth: 49, 
                frameHeight: 49 
            });
        }
    }

    createAnimations() {
        // explosion
        this.anims.create({
            key:`explode`,
            frames: this.anims.generateFrameNumbers(`explosion`,{start:0,end:64}),
            frameRate: 120,
            repeat: false
        });

        // players
        for (let color of COLORS) {
            //dead
            this.anims.create({
                key:`dead${color}`,
                frames: this.anims.generateFrameNumbers(`slime${color}`,{start:13,end:13}),
                frameRate: VELOCITY/10,
                repeat: false
            });
            //move
            this.anims.create({
                key:`move${color}`,
                frames: this.anims.generateFrameNumbers(`slime${color}`,{start:0,end:12}),
                frameRate: VELOCITY/10,
                repeat: true
            });
            //static
            this.anims.create({
                key:`turn${color}`,
                frames: this.anims.generateFrameNumbers(`slime${color}`,{start:0,end:0}),
                frameRate: VELOCITY/10,
                repeat: false
            });
        }
    }

    sendChatMessage(message) {
        this.socket.emit('message', {message});
    }

    createSocketHandlers() {
        console.log('Create Socket handlers');
        const self = this;
        this.socket = io();
        this.socket.on('currentPlayers', function (players) {
            console.log('currentPlayers: ', players);
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
            self.addToChatArea(addToChat);
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
                console.log(playerInfo);
                if (playerInfo.frame == "13"){
                    otherPlayer.anims.play( {key:`dead${playerInfo.color}`,startFrame:playerInfo.frame});
                } else {
                    otherPlayer.anims.play( {key:`move${playerInfo.color}`,startFrame:playerInfo.frame});
                }
                otherPlayer.anims.pause(otherPlayer.anims.currentFrame);
                otherPlayer.alpha = playerInfo.alpha;
                otherPlayer.deadCount = playerInfo.deadCount;

                const name = self.otherNames[otherPlayer.playerId];
                name.setPosition(playerInfo.x-name.width/2,playerInfo.y-25);
                name.alpha = playerInfo.alpha
              }
            }); 
        });
        this.socket.on('disconnect', () => {
            this.scene.start('menu');
        })
        this.socket.on('newPoo', (pooInfo) => {
            this.addPoo(pooInfo.x, pooInfo.y, pooInfo.color, pooInfo.duration);
        });
    }

    addPoo (x,y,color,duration) {
        const newPoo = this.physics.add.sprite(x, y, `poo${color}`);
        newPoo.setDepth(0.1);
        newPoo.creationTime = new Date();
        newPoo.duration = duration;
        this.poos.add(newPoo);
    }

    create () {
        this.dead = false;
        this.deadCount = 0;
        this.inmune = false;
        this.reviveTime = new Date();

        // chat
        this.createChat();
        if (FREE_MODE_ON) {
            this.addToChatArea('< Free mode on >\n< Commands: \n/nopoo\n/poodelay <ms>\n/pooduration <ms>\n/deadduration <ms>\n/velocity <px/sec>\n/pro >');
        }

        // generate tilemap
        const map = this.make.tilemap({ key: "map", renderOrder: "right-up" });
        const tileset = map.addTilesetImage(`pokenew`,'tiles');
        this.groundLayer = map.createLayer('bot', tileset).setDepth(-1);
        this.midLayer = map.createLayer('mid', tileset).setDepth(0.5);
        this.wallsLayer = map.createLayer('top', tileset).setDepth(1);
        this.groundLayer.setCollisionByProperty({ collides: true});
        this.midLayer.setCollisionByProperty({ collides: true});


        // debug collision
        const debugGraphics = this.add.graphics().setAlpha(0.7);
        this.groundLayer.renderDebug(debugGraphics, {
            tileColor: null,
            collidingTileColor: new Phaser.Display.Color(243,234,48,255),
            faceColor: new Phaser.Display.Color(40,39,37,255),
        });


        // bounds
        this.physics.world.bounds = new Phaser.Geom.Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        this.createSocketHandlers();
        this.createAnimations();

        //  Input Events
        this.cursors = this.input.keyboard.createCursorKeys();
        this.qKey = this.input.keyboard.addKey('Q');  // Get key object

        // Set update function
        var timer = this.time.addEvent({
            delay: 3,callback:()=>{this.myUpdate(this)},loop:true});

        timer.paused = false;  

        console.log('Game Created');  
    }

    myUpdate (self) {
        if (self.player && self.myname){
            // send player info
            if (!self.nameSent){
                self.socket.emit('playerInfo', {name:localStorage.getItem('name') || 'pepe', color: localStorage.getItem('color')});
                self.nameSent = true;
            }
            if (!self.dead){
                self.playerMovement();
            } else {
                self.tryRevive(self);
            }
            self.socket.emit('playerMovement', { x: self.player.x, y: self.player.y, frame: self.player.anims.getFrameName().toString(), alpha: self.player.alpha, deadCount: self.deadCount});
            self.updatePlayerList(self);
            self.removeOldPoos(self);
            self.removeOldExplosions(self);

            if (self.inmune && new Date() - self.reviveTime > INMUNITY_TIME) {
                self.inmune = false;
            }

            // opacity when inmunity is on
            if (self.inmune){
                self.player.alpha = 0.3;
                self.myname.alpha = 0.3;
            }else{
                self.player.alpha = 1;
                self.myname.alpha = 1;
            }
        }
    }

    tryRevive(self) {
        if(self.dead && (new Date() - self.deadAt > DEAD_DURATION)) {
            // revive
            self.dead = false;
            self.inmune = true;
            self.reviveTime = new Date();
            self.player.anims.play(`turn${self.color}`);
        }
    }

    removeOldExplosions(self) {
        self.explosions.getChildren().forEach((exp) => {
            if (new Date() - exp.creationTime > 450) {
                exp.destroy();
            }
        });
    }

    removeOldPoos(self) {
        self.poos.getChildren().forEach((poo) => {
            if (new Date() - poo.creationTime > poo.duration) {
                self.addExplosion(self,poo.x,poo.y);
                poo.destroy();
            }
        });
    }

    updatePlayerList (self) {
        // update player list
        let playerListText = `${self.playerName} (deads:${self.deadCount})\n`;
        for (var key in self.otherNames){
            let deadCount = 0;
            self.otherPlayers.getChildren().forEach(otherPlayer => {
                if (otherPlayer.playerId == key){
                    deadCount = otherPlayer.deadCount;
                }
            });
            playerListText += self.otherNames[key].text + ` (deads: ${deadCount})\n`;
        }
        $('#playerList').text(playerListText);
    }

    die() {
        if (!this.dead && !this.inmune){
            this.dead = true;
            this.deadCount = this.deadCount+1;
            this.deadAt = new Date();
            // dead animation
            console.log('die');
            this.player.anims.play(`dead${this.color}`);
            this.player.setVelocityX(0);
            this.player.setVelocityY(0);
        }
    }

    addExplosion(self, x, y) {
        const newExplosion = self.physics.add.sprite(x, y, 'explosion').setScale(0.9).setDepth(1);
        newExplosion.body.setSize(newExplosion.width*0.45,newExplosion.height*0.45);
        self.physics.add.overlap(self.player, newExplosion, self.die, null, self);
        newExplosion.anims.play(`explode`);
        newExplosion.creationTime = new Date();
        this.explosions.add(newExplosion);
    }

    addPlayer(self, playerInfo) {
        console.log('Add player');
        self.myname = self.add.bitmapText(10, 100, 'myfont', self.playerName, 14).setDepth(0.5);
        self.player = self.physics.add.sprite(playerInfo.x, playerInfo.y, 'slimeverde').setDepth(0.5);

        self.cameras.main.startFollow(self.player, true, 0.08, 0.08);
        self.cameras.main.setBackgroundColor('#313652');

        // collider player vs map
        //self.player.setCollideWorldBounds(true);
        self.physics.add.collider(self.player, self.groundLayer);
        self.physics.add.collider(self.player, self.midLayer);
        self.player.body.setSize(self.player.width*0.8, self.player.height*0.4);
        self.player.body.offset.y = 20;
    }

    addOtherPlayers(self, playerInfo) {
        console.log('A new player arrived');
        
        const otherPlayer = self.add.sprite(playerInfo.x, playerInfo.y, `slime${playerInfo.color}`).setOrigin(0.5, 0.5).setDisplaySize(49, 49).setDepth(0.5);
        const name = self.add.bitmapText(0, 0, 'myfont', playerInfo.name, 14).setDepth(0.5);
        name.setPosition(playerInfo.x-name.width/2,playerInfo.y-25);
        otherPlayer.playerId = playerInfo.playerId;
        otherPlayer.deadCount = 0;
        
        self.otherNames[playerInfo.playerId] = name;
        self.otherPlayers.add(otherPlayer);
    }

    playerMovement(){
        // add poo
        if (this.qKey.isDown && (new Date() - this.lastPooTime) > POO_DELAY){
            this.lastPooTime = new Date();
            this.addPoo(this.player.x, this.player.y, this.color, POO_DURATION);
            this.socket.emit('newPoo', {x:this.player.x,y:this.player.y,duration: POO_DURATION});
        }

        // Move
        if (this.cursors.left.isDown && this.cursors.down.isDown){
            this.player.setVelocityX(-VELOCITY*DIAGVEL);
            this.player.setVelocityY(VELOCITY*DIAGVEL);
        } else if (this.cursors.left.isDown && this.cursors.up.isDown){
            this.player.setVelocityX(-VELOCITY*DIAGVEL);
            this.player.setVelocityY(-VELOCITY*DIAGVEL);
        } else if(this.cursors.right.isDown && this.cursors.down.isDown){
            this.player.setVelocityX(VELOCITY*DIAGVEL);
            this.player.setVelocityY(VELOCITY*DIAGVEL);
        } else if(this.cursors.right.isDown && this.cursors.up.isDown) {
            this.player.setVelocityX(VELOCITY*DIAGVEL);
            this.player.setVelocityY(-VELOCITY*DIAGVEL);
        } else if (this.cursors.left.isDown){
            this.player.setVelocityX(-VELOCITY);
            this.player.setVelocityY(0);
        } else if (this.cursors.right.isDown){
            this.player.setVelocityX(VELOCITY);
            this.player.setVelocityY(0);
        } else if (this.cursors.up.isDown) {
            this.player.setVelocityY(-VELOCITY);
            this.player.setVelocityX(0);
        } else if (this.cursors.down.isDown) {
            this.player.setVelocityY(VELOCITY);
            this.player.setVelocityX(0);
        } else {
            this.player.setVelocityX(0);
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