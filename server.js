var http = require('http');
var express = require('express');
var WSS = require('ws').Server;

var app = express().use(express.static('public'));
var server = http.createServer(app);
//server.listen(8080, '127.0.0.1'); //server will provide access to localhost only ex: http://localhost:8080/
//server.listen(8080, '10.240.2.122'); //server will provide access to given local IP, ex: http://10.240.2.122:8080/ can be used in local LAN network
server.listen(8080);

var wss = new WSS({ port: 8081 });
var wsUsers = {};
wss.on('connection', function(socket) {
	//should be unique 
	var id = socket.upgradeReq.headers['sec-websocket-key'];
	wsUsers[id] = {name: 'No Name', socket: socket};
	var json = JSON.stringify({ type : "userIdUpdate", id: id });
	socket.send(json);

	socket.on('message', function(message) {
		//console.log('Received from client: ' + id + ' and message is : ' + message);
		try {
			var msg = JSON.parse(message);
			switch(msg.type) {
				case "nameUpdate" :
					wsUsers[id].name = msg.username;
					break;
				case "msgFromUser" :
					var json = {
						type: "msgToUser",
						from_user: msg.from_user,
						message: msg.message,
						name: wsUsers[msg.from_user] ? wsUsers[msg.from_user].name : "Unknown"
					}
					if(wsUsers[msg.to_user]) {
						wsUsers[msg.to_user].socket.send(JSON.stringify(json));
					}
					break;
				default :
					console.log(message);
			}
		} catch(e) {
			console.log(e.message);
		}
	});

	socket.on('close', function() {
		delete wsUsers[id];
		var json = JSON.stringify({
			type: 'userDisconnected',
			id: id
		});
		wss.clients.forEach(function each(client) {
			client.send(json);
		});
		console.log('Closed Connection');
	});

});
var broadcast = function() {
	try {
		var users = [], arr = Object.keys(wsUsers);
		arr.forEach(function(id) {
			users.push({id: id, name: wsUsers[id].name});
		});
		var json = JSON.stringify({
			type: 'broadcast',
			total: wss.clients.length,
			clients_arr: users
		});

		wss.clients.forEach(function each(client) {
			client.send(json);
		});
	} catch(e) {
		console.log(e.message);
	}
}
setInterval(broadcast, 4000);
