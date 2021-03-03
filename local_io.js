// mimicking socket.io so we can test locally (no node required)
// use like this:
// <script src="local_io.js"></script>
// then, just use like normal socket.io:
// socket = io.connect("http://localhost:3000");
// socket.on('serverMessage', (msg) => { console.log("server sent" + msg); } );
// socket.emit('message', 'hello, world!');
	
var io = (function() {

	class LocalSocket {
		constructor(id, name, ping, verbose) {
			this.id = id;
			this.name = name;
			this.verbose = verbose;
			// don't set ping to 0, otherwise socket.on handlers might not be initialized
			// if server sends something back after connecting.
			this.ping = ping < 1 ? 1 : ping;
			this.dest = undefined;
			this.msgMap = {};

			// socket.broadcast.emit(msg, obj)
			this.broadcast = {
				emit : (msg, obj) => {}
			}
		}
		// socket.on(msg, func)
		on(msg, funct) {
			if(this.verbose) console.log("on " + msg + " " + funct);
			this.msgMap[msg] = funct;
		}
		// socket.emit(msg, obj)
		emit(msg, obj) {
			if(this.verbose) console.log("emit " + msg + " " + obj);			
			window.setTimeout ( () => {this.dest.handle(msg, obj); }, this.ping);
		}

		handle(msg, obj) {
			if( this.msgMap[msg] !== undefined ) {
				this.msgMap[msg](obj);
			}
			else {
				console.log("error: no handler for message " + msg + " on " + this.name);
			}
		}
	}

	// for socket = io.connect('http://localhost:3000');
	function connect(address) {
		var name = "rommeyConnection";
		var connect = rommeyServer.newConnection;
		var ping = 10; // ms
		var verbose = false;

		console.log("connect to " + address)
		var socketServer = new LocalSocket(name, "SERVER", ping, verbose);
		var socketClient = new LocalSocket(name, "CLIENT", ping, verbose);
		socketServer.dest = socketClient;
		socketClient.dest = socketServer;
		connect(socketServer);
		return socketClient;
	}

	return {
		connect : connect
	};
})();
