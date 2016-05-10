var adapter = require("../adapter.js");
var static = require("node-static");
var http = require("http");
var file = new(static.Server)();
var app = http.createServer(function (req, res) {
	file.serve(req, res);
});

var io = require("socket.io")(app);

app.listen(6969);
io.sockets.on("connection", function (socket) {
	socket.on("join", function (channel) {
		var clients = io.sockets.adapter.rooms[channel];
		var nClients;
		if (clients === undefined) {
			nClients = 0;
		} else {
			nClients = clients.length;
		}
		console.log("nClients = " + nClients);

		if (nClients == 0) {
			socket.join(channel);
			socket.emit("created", channel);
		} else if (nClients == 1) {
			io.sockets.in(channel).emit("remotePeerJoining", channel);
			socket.join(channel);
			socket.emit("joined", channel);
		} else {
			console.log("Channel full");
			socket.emit("full", channel);
		}
	});

	socket.on("Bye", function (channel) {
		socket.broadcast.to(channel).emit("Bye");
		socket.disconnect();
	});

	socket.on("message", function (message, channel) {
		console.log("Got message: " + message + " " + channel);
		io.sockets.in(channel).emit("message", message);
	});

	socket.on("Ack", function () {
		console.log("Ack received");
		socket.disconnect();
	});
});