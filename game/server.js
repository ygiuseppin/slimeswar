const express = require('express');
const colors = require('colors');
var path = require('path');
const router = express.Router();
const PORT = 3000;
const socketio = require('socket.io');

// map of players
let players = {};

const app = express();
const server = require('http').Server(app);
const io = new socketio.Server();
io.listen(server);

io.on('connection', function (socket) {
    console.log(`user connected: ${socket.id}`.green);

    // create a new player and add it to our players object
    players[socket.id] = {
      rotation: 0,
      x: Math.floor(800),
      y: Math.floor(650),
      frame: 0,
      playerId: socket.id,
      name: "guest",
      color: "rojo"
    };

    // send the initial players positions object to the new player
    socket.emit('currentPlayers', players);

    // update all other players of the new player
    socket.broadcast.emit('newPlayer', players[socket.id]);
   
    // when a player disconnects, remove them from our players object
    socket.on('disconnect', function () {
      console.log(`user disconnected: ${socket.id}`.red);
      // remove this player from our players object
      
      delete players[socket.id];
      // emit a message to all players to remove this player
      io.emit('disconnectPlayer', socket.id);
    });
    socket.on('newPoo', function (pooInfo) {
        socket.broadcast.emit('newPoo', { x:pooInfo.x,y:pooInfo.y, color:players[socket.id].color });
    });
    socket.on('playerInfo', function (playerInfo) {
        console.log(`playerinfo name: ${playerInfo.name} color: ${playerInfo.color}`.yellow);
        players[socket.id].name = playerInfo.name;
        players[socket.id].color = playerInfo.color;
        socket.broadcast.emit('playerInfo', players[socket.id]);
    });

    socket.on('message', function(messageInfo) {
      console.log(`message: "${messageInfo.message}" from: ${players[socket.id].name}`.blue);
      socket.emit('newMessage', {player:players[socket.id], message:messageInfo.message});
      socket.broadcast.emit('newMessage', {player:players[socket.id], message:messageInfo.message});
    });

    socket.on('playerMovement', function (movementData) {
        players[socket.id].x = movementData.x;
        players[socket.id].y = movementData.y;
        players[socket.id].frame = movementData.frame;

        // emit a message to all players about the player that moved
        socket.broadcast.emit('playerMoved', players[socket.id]);
    });
});

router.get('/', (req, res)=>{
    res.sendFile(path.join(__dirname+'/public/index.html'));
});

app.use(express.static(__dirname + '/public'));
server.listen(PORT,()=>{console.log(`Server listening on ${server.address().port}`)})
