var div = $("#main-div")[0];
var socket = io.connect("http://localhost:6969");
var channel = prompt("Channel name:");

if (channel !== "") {
	trace("Joining channel: ", channel);
	socket.emit("join", channel);
}

socket.on("created", function(channel) {
	trace("Intiator has created channel: " + channel);
});

socket.on("full", function(channel) {
	trace("Channel: " + channel + " is full");
});

socket.on("remotePeerJoining", function(channel) {
	trace("Request to join: " + channel);
});

socket.on("joined", function(channel) {
	trace("Joined " + channel);
});

socket.on("Bye", function() {
	trace("Disconnecting, sending ack to server...");
	socket.emit("Ack");
	socket.disconnect();
});