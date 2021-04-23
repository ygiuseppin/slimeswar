// Main menu
class Scene0 extends Phaser.Scene {
    constructor() {
        super("menu");
    }
        
    preload () {
        this.load.bitmapFont('myfont', 'assets/fonts/bitmapFonts/nokia.png', 'assets/fonts/bitmapFonts/nokia.xml');
        this.load.image('bg', './assets/menu-bg.jpg');
        this.load.html('menu','./menu.html');

        // hide chat
        $('#message').hide();
        $('#chatButton').hide();
    }

    create () {

        // background
        this.bg = this.add.image(550,300,'bg'); 
        this.bg.setScale(1.8);

        // title
        this.title = this.add.bitmapText(0, 0, 'myfont', 'Slimes War', 50);
        this.title.setPosition(400-this.title.width/2,200);

        this.nameInput = this.add.dom(400, 300).createFromCache('menu');
        this.nameInput.getChildByID('boton').addEventListener('click', ()=> {
            const inputname = this.nameInput.getChildByID('nombre').value;
            if(inputname.length > 12 || inputname.length < 3){
                alert('Nombre muy largo, o muy corto >:)');
            }else{
                // save info to storage
                localStorage.setItem('color', this.nameInput.getChildByID('color').value);
                localStorage.setItem('name', inputname);

                // enter the game
                this.scene.start('playGame');
            }
        })
    }
}