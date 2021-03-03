// or use dragable HTML element? https://www.w3schools.com/howto/howto_js_draggable.asp
// stones:
// 1-13 black blue red yellow
// start with 14

var socket;

var d = 10;
var dx = 40;
var stones = []
var linepos = 14;
var names;

var selectedStones = undefined
var positions = {}

var drag = undefined;
var mouseStart;
var markMode = false;
var globalLines = {};

// we want to draw a new stone from the bag
// the server will send us a update stone message
function drawStone() {
	socket.emit('game', 'draw');
}


function restart() {
	socket.emit('game', 'restart');
}

function flipMarkMode() {
	markMode = !markMode;
	document.getElementById("markMode").innerText = markMode ? "Normaler Modus" : "Zeichenmodus";
	if(!markMode) {
		lines = [];
		socket.emit('lines', lines);
	}
}

// name has changed, so send to server and save to localStorage
function changeName() {
	var name = document.getElementById("name").value;
	socket.emit('name', name);
	console.log(name);

	if (typeof(Storage) !== "undefined") {
		localStorage.name = name
	}
}

// ask for an option (default taken from localStorage), and save in localStorage
function promptLocalStore(msg, name, default_) {
	var n = default_;
	if (typeof(Storage) !== "undefined") {
		if(localStorage[name] !== undefined)
			n = localStorage[name];
		var n = prompt(msg, n);
		localStorage[name] = n;
		return n;
	}
	else {
		return prompt(msg, n);
	}
	
}

// main setup function
function setup() {
	const queryString = window.location.search;
	const urlParams = new URLSearchParams(queryString);
	var server, name;
	var server = localStorage?.server;
	var name = localStorage?.name;
	
	// open with local.html?skipPrompts to skip prompts
	if( !urlParams.has('skipPrompts') ) {
		server = promptLocalStore("Please enter server", "server", "localhost")
		name = promptLocalStore("Please enter your name", "name", "Player1")
	}
	document.getElementById("name").value = name
	socket = io.connect("http://" + server + ":3000");
	
	socket.on('stones', (s) => { stones = s; });
	socket.on('mouse', (pos) => { positions[pos.id] = pos; } );
	socket.on('names', (n) => {
		console.log("names:");
		console.log(n);
		names = n;
		document.getElementById("players").innerHTML = escapeHtml( Object.values(names).toString() )
	} );
	socket.on('lines', (l) => { globalLines = l; } );

	let cnv = createCanvas(800,1000);
	cnv.parent('myContainer');

	changeName();
	//background(0);
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }


function posToGrid(x, y)
{
	return {x:((x - d)/dx )| 0, y:((y - d)/dx  ) | 0};
}

// return true if the position mx, my is within stone's boundary
function stoneHit(stone, mx, my) {
	var p = posToGrid(mx, my);
	return (stone.playerarea == 0 || stone.playerarea == socket.id) &&
	  		p.x == stone.x && p.y == stone.y;
}

lines = []
var currentLine;

// function to handle mousePressed
function mousePressed() {
	mouseStart = {x1:mouseX, y1: mouseY}; // used for keeping track of dragging/marking	
	if(markMode) {
		currentLine = [{x:mouseX, y:mouseY}];
		lines.push(currentLine);
		return;
	}

	if(selectedStones !== undefined) {
		// check if we pressed the mouse on an already selected stone
		var hit = selectedStones.some( stone => stoneHit(stone, mouseX, mouseY) );
		if( !hit )
			selectedStones = undefined;
	}
  	if(selectedStones === undefined) {
  		// one-click direct select
  		selected = stones.find( stone => stoneHit(stone, mouseX, mouseY));
  		if( selected !== undefined )
  			selectedStones = [selected];
	}

	if(selectedStones === undefined) {
		// starting a drag
		drag = {x1:mouseX, y1: mouseY};
	}
  
}

// send mouse position to server (so that other clients can display people's arrows)
function sendMouse() {	
	socket.emit('mouse', {x:mouseX, y:mouseY});
}

function isStoneIncluded(stone, rect) {
	let x = d+dx*stone.x;
	let y = d+dx*stone.y;
	var x1 = Math.min(rect.x1, rect.x2);
	var x2 = Math.max(rect.x1, rect.x2);
	var y1 = Math.min(rect.y1, rect.y2);
	var y2 = Math.max(rect.y1, rect.y2);

	return (stone.playerarea == 0 || stone.playerarea == socket.id) &&
		x1 <= x && x2 >= x+dx &&
		y1 <= y && y2 >= y+dx;
}

function getDraggedStonePos(stone) {
	var x = mouseStart.x1-mouseX;
	var y = mouseStart.y1-mouseY;
	x = (stone.x - x/dx + 0.5 ) | 0
	y = (stone.y - y/dx + 0.5 ) | 0
	return {x:x, y:y}
}

// return true if there's already a stone at this position
function alreadyStoneHere(gridpos) {
	return stones.some( s => {
					if( gridpos.y >= linepos && s.playerarea != socket.id )
						return false;
					return s.x == gridpos.x && s.y == gridpos.y;
				} )
}

// return true if gridpos is out of game area
function outsideOfArea(gridpos) {
	return gridpos.x < 0 || gridpos.y < 0 || gridpos.x > 19 || gridpos.y > 17;
}

// stones have been dragged somewhere and now want to be dropped there
function dropSelectedStones()
{
	// check if the drop is valid
	if( !selectedStones.every( stone => {
			var pos = getDraggedStonePos(stone);
			// there's already a stone here
			if( alreadyStoneHere(pos) )
				return false;
			// outside of area
			else if( outsideOfArea(pos) )
				return false;
			else
				return true;
		} ))
	 return; // not valid -> abort drop
				
	// assign final positions
	selectedStones.forEach( stone => {
			var pos = getDraggedStonePos(stone);
			stone.x = pos.x
			stone.y = pos.y
			// if stones are dropped in player area, assign player area id
			// so that they are not visible by others
			stone.playerarea = pos.y >= linepos ? socket.id  : 0;
		});

	// send message to server with new stone positions
	socket.emit('stones', stones);
}

// mouse press released
// either drop selected stones or finish selection with mark box
function mouseReleased() {
	currentLine = undefined;
	if(markMode) {
		return;
	}
	sendMouse();

	if(selectedStones !== undefined) {
		dropSelectedStones();
	}
	mouseStart = undefined
	
	if(drag !== undefined) {
		// we dragged the mouse, so the mark box is finished
		// now get which stones are included in mark box
		selectedStones = stones.filter( stone => isStoneIncluded(stone, drag) )
		if(selectedStones.length == 0)
			selectedStones = undefined;

		drag = undefined;
		console.log(selectedStones);	
	}
}

function mouseMoved() {
	sendMouse();
}

function mouseDragged() {
	if(markMode && currentLine !== undefined) {
		currentLine.push({x:mouseX, y:mouseY});
		socket.emit('lines', lines);
	}

	if(drag !== undefined) {
		drag.x2 = mouseX;
		drag.y2 = mouseY;
	}
}

// prevent scroll on mobile
function touchMoved() {
	if(selectedStones !== undefined)
		return false;
	else return true;
}

//// ------------ drawing ------------ ////

function drawstone(stone)
{
	if(stone.playerarea == 0 || stone.playerarea == socket.id)
		drawstone2(stone, d+dx*stone.x, d+dx*stone.y, stone.color); //color(255, 204, 0));
}

function getTextMetrics(text, font) {
    // re-use canvas object for better performance
    var canvas = getTextMetrics.canvas || (getTextMetrics.canvas = document.createElement("canvas"));
    var context = canvas.getContext("2d");
    if(font !== undefined) context.font = font;
    var metrics = context.measureText(text);
    return metrics;
}

function drawstone2(stone, x, y, cl)
{
	var c;
	fill(cl);
	rect( x, y, dx, dx, 5 );
	if(cl === "black" || cl === "red" || cl === "blue") {
		fill(color(255, 255, 255));
	}
	else if(cl === "yellow" || cl === "grey") {
		fill(color(0, 0, 0));
	}
	textSize(18);
	//var metric = getTextMetrics(stone.nummer)
	var metric = {width:0,fontBoundingBoxDescent:0, fontBoundingBoxAscent:0};

	text(stone.nummer, x + dx/2 - metric.width, y + dx/2 - (metric.fontBoundingBoxDescent-metric.fontBoundingBoxAscent)/2);
	fill(color(0, 0, 0));
}


function drawDragstone(stone) {
	fill(124, 124, 124, 200);
	rect( d+dx*stone.x, d+dx*stone.y, dx, dx, 5 );
	if(mouseStart !== undefined) {
		var x = mouseStart.x1-mouseX;
		var y = mouseStart.y1-mouseY;
		console.log( x + ", " + y)
		drawstone2(stone, d+dx*stone.x-x, d+dx*stone.y-y, stone.color); //color(255, 204, 0));

		var x2 = (stone.x - x/dx + 0.5) | 0
		var y2 = (stone.y - y/dx + 0.5) | 0
		drawstone2(stone, d+dx*x2, d+dx*y2, "grey");
	}

}

// draw an arrow for a vector at a given base position
function drawArrow(base, vec, myColor) {
	push();
	stroke(myColor);
	strokeWeight(3);
	fill(myColor);
	translate(base.x, base.y);
	line(0, 0, vec.x, vec.y);
	rotate(vec.heading());
	let arrowSize = 5;
	translate(vec.mag() - arrowSize, 0);
	triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0);
	pop();
}

function getName(id)
{
	if(names !== undefined && names[id] !== undefined)
  		return names[id];
  	else {
  		console.log("couldn't get name for id " + id);
  		return id;
  	}
}

function drawLines(Lines) {
	for(i in Lines) {
		var lastpos = undefined;
		for(p in Lines[i]) {
			if(lastpos !== undefined)
				line( lastpos.x, lastpos.y, Lines[i][p].x, Lines[i][p].y);
			lastpos = Lines[i][p];
		}
	}
}

// main drawing function
function draw()
{
	clear();
	var i = 0;
	for( var key in globalLines ) {
		// var a = i*34509+48790;
		// stroke(a %200, (a/200) %200, (a/(200*200)) %200);
		// i++;
		drawLines(globalLines[key])
	}
	drawLines(lines);


	// draw separator player area
	line(0, dx*linepos, 1000, dx*linepos);

	// draw stones
	stones.forEach( stone => drawstone(stone) ) ;
	
	// draw selected stones
	if(selectedStones !== undefined)
		selectedStones.forEach( selectedStone => drawDragstone(selectedStone) );

	// draw other players' mouse position with an arrow
	for (var key in positions) {
		var pos = positions[key];

		let v0 = createVector(pos.x-7, pos.y+7);
		let v1 = createVector(7, -7);
  		drawArrow(v0, v1, 'black');
  		var s = getName(pos.id);
  		var metric = getTextMetrics(s);
		text(s, pos.x - metric.width, pos.y+30);
	}

	// draw mark process
	if(drag !== undefined) {
		noFill();
		drawingContext.setLineDash([5, 15]);
		rect(drag.x1, drag.y1, drag.x2-drag.x1, drag.y2-drag.y1);
		drawingContext.setLineDash([]);
	}
}