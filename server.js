// start with `node server.js`
// open http://192.168.178.50:3000/

var colors = ["black", "blue", "red", "yellow"]
var NUM_PIECES = 13;
var STONES_FOR_EACH_PLAYER = 14;

//server.js
var express = require('express');   //includes library

var app = express();
var server = app.listen(3000);		//local host port 3000

app.use(express.static('public'));	//use the static files located in public directory

console.log("This is running");

var socket = require('socket.io');	//include library

var io = socket(server);		//set socket to server


var stones = []

function getAllPieces()
{
	var pieces = [];
	
	var y = 1;
	for( c in colors ) {
		for( var i = 1; i <= NUM_PIECES; i++) {
			pieces.push({x:i, y:y+0, playerarea:0, nummer:i, color:colors[c]});
			pieces.push({x:i, y:y+1, playerarea:0, nummer:i, color:colors[c]});
		}
		y+=2;
	}
	return pieces;
}

var drawBag = [];

function random(L) {
  return Math.floor(Math.random()*L);
}

function drawStone() {
	return drawBag.shift();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function drawStonesForPlayer(id) {
	for(var i=0; i< STONES_FOR_EACH_PLAYER; i++) {
		let stone = drawStone();
		if( stone === undefined ) break;
		stone.x = i;
		stone.y = 14;
		stone.playerarea = id;
		stones.push(stone);
	}
	logStones();
}

function restart()
{
	drawBag = getAllPieces();
	shuffleArray(drawBag);
	stones = [];

	for (var id in names) {
		drawStonesForPlayer(id);
	}
}

function draw(id)
{
	let stone = drawStone();
	stone.x = 15;
	stone.y = 14;
	stone.playerarea = id;
	stones.push(stone);
}

restart();

var names = {}

io.sockets.on('connection', newConnection);	//event handling

function hashCode(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
        var character = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+character;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function logStones() {
	console.log("Stones at players: " + stones.length + ", stones in drawBag: " + drawBag.length + ", sum = " + (stones.length + drawBag.length));	
}

function disconnect(socket) {
  console.log('disconnect ' + socket.id + " = " + names[socket.id]);

  // delete from name array
  delete names[socket.id];
  socket.broadcast.emit('names', names);
  console.log(names);

  // put back players' stones
  var playersStones = stones.filter( s => s.playerarea == socket.id );
  stones = stones.filter( s => s.playerarea != socket.id );
  drawBag = drawBag.concat(playersStones);
  console.log("put back " + playersStones.map(s => s.color + "." + s.nummer ).join(", ") );
  shuffleArray(drawBag);

  logStones();
}

function newConnection(socket){
	socket.on('stones', stonesMsg);
	socket.on('mouse', mouseMsg);
	//socket.on('selected', selectedMsg);
	socket.on('name', nameMsg);
	socket.on('game', gameMsg);

	socket.on('disconnect', function() {
		disconnect(socket);
   	});


	names[socket.id] = "Player " + (Object.keys(names).length+1)
	console.log('new connection: ' + socket.id + " = " + names[socket.id]);	//log the connection
	

	socket.emit('names', names);
	socket.broadcast.emit('names', names);

	drawStonesForPlayer(socket.id);
	socket.emit('stones', stones);
	socket.broadcast.emit('stones', stones);
	

	function nameMsg(name) {
		console.log("nameMsg (" + name + ")")
		names[socket.id] = name
		console.log(names);
		socket.emit('names', names);
		socket.broadcast.emit('names', names);
	}

	function mouseMsg(pos) {
		//console.log("mouseMsg (" + pos + ")")
		pos.id = socket.id;
		//console.log(pos);
		socket.broadcast.emit('mouse', pos);
	}

	// function selectedMsg(pos) {
	// 	console.log("selectedMsg (" + pos + ")")
	// 	pos.id = socket.id;
	// 	//console.log(pos);
	// 	socket.broadcast.emit('selected', pos);
	// }

	function stonesMsg(s){
		console.log("stonesMsg (" + s + ")")
		stones = s;
		socket.broadcast.emit('stones', stones);
	}

	function gameMsg(s){
		console.log("gameMsg (" + s + ")")
		if( s === "allPieces" )
			stones = getAllPieces();
		else if( s === "restart" )
			restart();
		else if( s === "draw" ) {
			draw(socket.id);

		}
		socket.broadcast.emit('stones', stones);
		socket.emit('stones', stones);
	}
}
