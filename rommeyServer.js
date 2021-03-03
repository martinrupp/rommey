// the rommey game server
var rommeyServer = (function() {

	// return a random integer in range 0..L-1
	function random(L) {
	  return Math.floor(Math.random()*L);
	}

	// randomizes the order of the elements of the array by swapping N random elements
	function shuffleArray(array) {
	    for (let i = array.length - 1; i > 0; i--) {
	        const j = Math.floor(Math.random() * (i + 1));
	        [array[i], array[j]] = [array[j], array[i]];
	    }
	}

	// the Rommey Game class
	class Rommey {
		constructor() {
			this.colors = ["black", "blue", "red", "yellow"]
			this.NUM_PIECES = 13; // we have pieces from 1 to 13
			this.STONES_FOR_EACH_PLAYER = 14; // each player gets 14 pieces
			this.stones = [];   // here goes the stones that have been drawn
			this.drawBag = [];  // rest of the stones are in the draw bag.
			this.names = {};    // names of the players (socket id -> name)
		}

		// return an array of all possible stones (1-13, all colors)
		getAllPieces()
		{
			var pieces = [];
			
			var y = 1;
			for( var c in this.colors ) {
				for( var i = 1; i <= this.NUM_PIECES; i++) {
					pieces.push({x:i, y:y+0, playerarea:0, nummer:i, color:this.colors[c]});
					pieces.push({x:i, y:y+1, playerarea:0, nummer:i, color:this.colors[c]});
				}
				y+=2;
			}
			return pieces;
		}

		// log current state of drawn stones and stones in drawbag.
		logStones() {
			console.log("Stones at players: " + this.stones.length + ", stones in drawBag: " + this.drawBag.length
						 + ", sum = " + (this.stones.length + this.drawBag.length) + " (should be 104)");	
		}


		// draw one random stone out of the draw bag
		drawStoneFromBag() {
			return this.drawBag.shift();
		}

		// draw 14 stones for one player
		drawStonesForPlayer(id) {
			for(var i=0; i < this.STONES_FOR_EACH_PLAYER; i++) {
				let stone = this.drawStoneFromBag();
				if( stone === undefined ) break;
				stone.x = i;           // x position
				stone.y = 14;          // y position
				stone.playerarea = id; // this marks stones as only visible by this player
				this.stones.push(stone);
			}
			this.logStones();
		}

		// restart the game
		restart()
		{
			this.stones = [];                    // empty out drawn stones
			this.drawBag = this.getAllPieces();  // regenerate all stones in draw bag
			shuffleArray(this.drawBag);
			
			// now draw stones for each connected player
			for (var id in this.names) {
				this.drawStonesForPlayer(id);
			}
		}

		// draw one stone for a player
		drawOneStone(id)
		{
			let stone = this.drawStoneFromBag();
			stone.x = 15;
			stone.y = 14;
			stone.playerarea = id;
			this.stones.push(stone);
		}

		// new player: add to names list, draw stones.
		addPlayer(id) {
			this.names[id] = "Player " + (Object.keys(this.names).length+1)
			console.log('new connection: ' + id + " = " + this.names[id]); // log the connection
			this.drawStonesForPlayer(id);
		}

		// player quit game, put back players' stones	  
		removePlayer(id) {
			console.log('disconnect ' + id + " = " + this.names[id]);
	  		// delete from name array
	  		delete this.names[id];


			var playersStones = this.stones.filter( s => s.playerarea == id );
			this.stones = this.stones.filter( s => s.playerarea != id );
			this.drawBag = this.drawBag.concat(playersStones);
			console.log("put back " + playersStones.map(s => s.color + "." + s.nummer ).join(", ") );
			shuffleArray(this.drawBag);
			this.logStones();
		}
	}


	game = new Rommey();
	game.restart();


	function newConnection(socket){
		socket.on('stones', stonesMsg);
		socket.on('mouse', mouseMsg);
		//socket.on('selected', selectedMsg);
		socket.on('name', nameMsg);
		socket.on('game', gameMsg);

		socket.on('disconnect', function() {
			game.removePlayer(socket.id);
	  		socket.broadcast.emit('names', this.names);
	   	});

		game.addPlayer(socket.id);
	
		// send player's name to all other players
		socket.emit('names', game.names);
		socket.broadcast.emit('names', game.names);

		// send updated stones to all players
		socket.emit('stones', game.stones);
		socket.broadcast.emit('stones', game.stones);
		

		function nameMsg(name) {
			game.names[socket.id] = name
			console.log(game.names);
			socket.emit('names', game.names);
			socket.broadcast.emit('names', game.names);
		}

		function mouseMsg(pos) {
			pos.id = socket.id;
			socket.broadcast.emit('mouse', pos);
		}

		function stonesMsg(s){
			console.log("stonesMsg (" + s + ")")
			game.stones = s;
			socket.broadcast.emit('stones', game.stones);
		}

		function gameMsg(s){
			console.log("gameMsg (" + s + ")")
			if( s === "allPieces" )
				stones = game.getAllPieces();
			else if( s === "restart" )
				restart();
			else if( s === "draw" ) {
				game.drawOneStone(socket.id);

			}
			socket.broadcast.emit('stones', game.stones);
			socket.emit('stones', game.stones);
		}
	}

	return {
   	 	newConnection: newConnection
  }
})();


if(typeof module !== 'undefined')
	module.exports.newConnection = rommeyServer.newConnection;

