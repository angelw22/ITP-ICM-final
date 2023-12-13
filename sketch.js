let prevX;
let prevY;
let posX, posY;
let angle;
let mainPlayer;
let mainColor;
let otherPlayers = {};
let lineLength = 0;
let mainPlayerSocketID;
let temporarilyDisabled = true;
let r, g, b;

//dev url:"ws://localhost:9876/myWebsocket" 
const url = "wss://icm-finals-backend-b895b729e5ed.herokuapp.com/9876"
let mywsServer;

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);

	posX = random(0, windowWidth);
	posY = random(0, windowHeight);
  
  r = random(0, 240);
  g = random(0, 240);
  b = random(0, 240);
  
  mainColor = color(r, g, b);

  mainPlayer = createGraphics(90,90);


}

function draw() {
	if (!mywsServer) {
		mywsServer = new WebSocket(url)
	}


  background(0);

	//loop through all other players to draw them + check if there is a connection
	for (const [key, value] of Object.entries(otherPlayers)) {
		//value format: {r: r, g: g, b: b, x: posX, y:posY, connections: {id: {r: _, g: _, b: _}, id: {...}}
		if (value.connections) {
			for (const [connectionsID, val] of Object.entries(value.connections)) {
				//format of value.connections: {[id]: {r: r, g: g, b: b}}
				if (connectionsID == mainPlayerSocketID) {
					stroke(color(val.r, val.g, val.b));
					line(posX, posY, otherPlayers[key].x, otherPlayers[key].y)
				}
			}
		} 

		noStroke();
		
		//draw other player
		fill(color(value.r, value.g, value.b));
    ellipse(value.x, value.y, 40, 40);
	}
  

  if (keyIsDown(65)) {
    posX -= 5;
  }
  if (keyIsDown(68)) {
    posX += 5;
  }
  if (keyIsDown(87)) {
    posY -= 5;
  }
  if (keyIsDown(83)) {
    posY += 5;
  }

	mainPlayer.fill(mainColor);
	mainPlayer.imageMode(CENTER)
  mainPlayer.angleMode(DEGREES);
  mainPlayer.ellipse(45, 45, 50, 50);
  mainPlayer.triangle(75, 55, 75, 35, 90, 45);
  
  
  
  push();
  translate(posX, posY)
  angle = atan2(mouseY - posY, mouseX - posX);
  rotate(angle)
  image(mainPlayer, 0, 0);
  
  
  if (mouseIsPressed) {
    if (!temporarilyDisabled) {
      lineLength += 5 ;
    }
  } else {
    lineLength = 0
    temporarilyDisabled = false;
  }
    
  
  let actualX = posX + ((lineLength +50)  * Math.cos(angle))
  let actualY = posY + ((lineLength +50)  * Math.sin(angle))
  stroke(mainColor);
  strokeWeight(3);
  line(50,0, lineLength + 50, 0)
  
  pop(); 

	// ellipse to track the line cast
  // ellipse(actualX, actualY, 10, 10)
  


	for (const [key, value] of Object.entries(otherPlayers)) {

		//value format: {r: r, g: g, b: b, x: posX, y:posY}
		if (actualX <= value.x + 20 && actualX >= value.x - 20 && actualY <= value.y + 20 && actualY >= value.y - 20) {
			
			console.log('check', value)

			if (!temporarilyDisabled) {
				if (value.connections && value.connections[mainPlayerSocketID]) {
					console.log("remove time");
					mywsServer.send(JSON.stringify({type: "disconnect", data: key}));
	
					//send socket to disconnect 
				} else {
					console.log("hit");
					lineLength = 0;
					let otherPlayerColor = color(value.r, value.g, value.b);
					let newColor = lerpColor(mainColor, otherPlayerColor, 0.5);
					otherPlayers[key].r = red(newColor);
					otherPlayers[key].g = green(newColor);
					otherPlayers[key].b = blue(newColor)
					console.log("new color is", newColor, "indiv is", red(newColor), green(newColor), blue(newColor))
					//send other id and new color to remember connector's color
					mywsServer.send(JSON.stringify({type: "connect", data: [key, red(newColor), green(newColor), blue(newColor)]}));
	
				}
				temporarilyDisabled = true
			}
	
			
		}
	}
  

  if (prevX !== posX || prevY !== posY) {
    mywsServer.send(JSON.stringify({type: "update", data: {x: posX, y:posY}}));
  }

  prevX = posX, 
  prevY = posY;
  
}

mywsServer.onopen = function() {
	mywsServer.send(JSON.stringify({type: "init", data: {r: r, g: g, b: b, x: posX, y:posY}}));
}

//handling message event
mywsServer.onmessage = function(event) {
	const msg = JSON.parse(event.data);
	// console.log("from server", msg);
	if (msg !== undefined) {
		if (msg.type == "firstCon") {
			mainPlayerSocketID = msg.data;
			console.log("main player sock id is", mainPlayerSocketID)
		}
		if (msg.type == "update") {
			//format: data: {r: r, g: g, b: b, x: posX, y:posY, connections: [id: {r: _, g: _, b: _}]}
			otherPlayers = msg.data;
		}
		if (msg.type == "changeColor") {
			console.log('pre color', mainColor)
			console.log("got change color", msg.data[0], msg.data[1], msg.data[2])
			mainColor = color(msg.data[0], msg.data[1], msg.data[2]);
			mainPlayer.fill(mainColor);
		}
	}
}