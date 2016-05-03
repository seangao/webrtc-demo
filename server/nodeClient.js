var div = $("#main-div")[0];
var socket = io.connect("http://172.27.14.143:6969");
var channel = prompt("Channel name:");

if (channel !== "") {
	console.log("Joining channel: ", channel);
	socket.emit("join", channel);
}

socket.on("created", function(channel) {
	console.log("Intiator has created channel: " + channel);
});

socket.on("full", function(channel) {
	console.log("Channel: " + channel + " is full");
});

socket.on("remotePeerJoining", function(channel) {
	console.log("Request to join: " + channel);
});

socket.on("joined", function(channel) {
	console.log("Joined " + channel);
});

socket.on("Bye", function() {
	console.log("Disconnecting, sending ack to server...");
	socket.emit("Ack");
	socket.disconnect();
});