// start with `node server.js`
// open http://192.168.178.50:3000/


var rommeyServer = require('./rommeyServer')
//server.js
var express = require('express');   //includes library

var app = express();
var server = app.listen(3000);		//local host port 3000

app.use(express.static('public'));	//use the static files located in public directory

console.log("This is running");
console.log("Connect to http://localhost:3000");

var socket = require('socket.io');	//include library

var io = socket(server);		//set socket to server
io.sockets.on('connection', rommeyServer.newConnection);	//event handling
