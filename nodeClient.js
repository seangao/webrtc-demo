'use strict';

var div = $("#main-div")[0];
var socket = io.connect("http://" + prompt("IP:Port (ex. localhost:6789)"));
var channel = prompt("Channel name:");

var isInitiator = false;
var isStarted = false;
var isChannelReady = false;
var peerNumber = -1;
var currentConnectingPeer = 0;
var connectedPeers = [];
console.log("isChannelReady: " + isChannelReady);

if (channel !== "") {
	console.log("Joining channel: ", channel);
	socket.emit("join", channel);
}

socket.on("created", function(channel) {
	console.log("Initiator has created channel: " + channel);
	isInitiator = true;
	peerNumber = 0;
	startVideo();
});

socket.on("full", function(channel) {
	console.log("Channel: " + channel + " is full");
});

socket.on("remotePeerJoining", function(channel, peer) {
	console.log("Request to join: " + channel + " by peer number: " + peer);
	currentConnectingPeer = peer;
	isInitiator = true;
	isChannelReady = true;
});

socket.on("joined", function(channel, peer) {
	console.log("Joined " + channel);
	isChannelReady = true;
	peerNumber = peer;
	startVideo();
	console.log("isChannelReady: " + isChannelReady);
});

socket.on("message", function(message, peer, intendedpeer) {
	console.log("Got message: " + message + " from peer: " + peer + " to peer: " + intendedpeer);
	if(peerNumber == intendedpeer) {
		if(message == "Got user media") {
			if(isInitiator) {
				console.log("I am peer number " + peerNumber + " who got user media from peer number " + peer);
				if(peer > peerNumber)
					checkAndStart(peer-1);
				else if(peer < peerNumber) 
					checkAndStart(peer);
			}
		} else if(message.type === "offer") {
			if(!isInitiator) {
				console.log("We got an offer from peer: " + peer);
				if(peer > peerNumber)
					checkAndStart(peer-1);
				else if(peer < peerNumber) 
					checkAndStart(peer);
			}
			if(peer > peerNumber) {
				pcLocal[peer-1].setRemoteDescription(new RTCSessionDescription(message));
				doAnswer(peer-1);
			} else if(peer < peerNumber) {
				pcLocal[peer].setRemoteDescription(new RTCSessionDescription(message));
				doAnswer(peer);
			}
		} else if(message.type === "answer") {
			console.log(peer);
			if(peer > peerNumber) {
				console.log(pcLocal[peer-1]);
				pcLocal[peer-1].setRemoteDescription(new RTCSessionDescription(message));
			}
			else if(peer < peerNumber) {
				console.log(pcLocal[peer]);
				pcLocal[peer].setRemoteDescription(new RTCSessionDescription(message));
			}
			isInitiator = true;
			//if(connectedPeers.indexOf(peer) == -1)
			//	connectedPeers.push(peer);
		} else if(message.type === "candidate") {
			var candidate = new RTCIceCandidate({sdpMLineIndex:message.label,
				candidate:message.candidate});
			if(peer > peerNumber) {
				pcLocal[peer-1].addIceCandidate(candidate);
				/*if(pcLocal[peer-1].iceConnectionState == "connected") {
					console.log("PLS PLS PLS");
					if(currentConnectingPeer < peerNumber - 1) {
						currentConnectingPeer++;
						sendMessage("Got user media", channel, currentConnectingPeer);
					}
				}*/
			}
			else if(peer < peerNumber) {
				pcLocal[peer].addIceCandidate(candidate);
				/*if(pcLocal[peer].iceConnectionState == "connected") {
					console.log("PLS PLS PLS");
					if(currentConnectingPeer < peerNumber - 1) {
						currentConnectingPeer++;
						sendMessage("Got user media", channel, currentConnectingPeer);
					}
				}*/
			}
			//if(connectedPeers.indexOf(peer) == -1) 
			//	connectedPeers.push(peer);
		}
	}
});

socket.on("Bye", function() {
	console.log("Disconnecting, sending ack to server...");
	hangup();
	socket.emit("Ack");
	socket.disconnect();
});

var localStream;
var remoteStreams = [];

var pc;
var pcLocal = [];
var pcRemote = [];
var numRemoteStreams = 0;
var numRemoteDescriptions = 0;

var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

var sdpConstraints = webrtcDetectedBrowser === 'firefox' ? 
		{'offerToReceiveAudio':true,'offerToReceiveVideo':true } :
		{'mandatory': {'OfferToReceiveAudio':true, 'OfferToReceiveVideo':true }};

function handleError() {
    console.error("Error");
}

function getLocalStream(stream) {
	trace("getLocalStream: retrieving...");
	var localVideo = $("#videoLocal")[0];
	localVideo.muted = true;
	//window.stream = stream;
	//localVideo.srcObject = stream;
	//localVideo.play();
	localVideo.src = window.URL.createObjectURL(stream);
	localStream = stream;
	//videoStream.play();
	sendMessage("Got user media", channel, currentConnectingPeer);
}

function getMediaConstraints(width, height) {
	var constraints = {
        audio: true,
        video: {width: {exact: width}, height: {exact: height}}
    };
    return constraints;
}

function startVideo() {
	trace("startVideo: Requesting video stream");
	var constraints = getMediaConstraints(640, 480);
	navigator.getUserMedia(constraints, getLocalStream, handleError);
}

/*function call() {
	var servers = null;
	pc1 = new RTCPeerConnection(servers);
	pc1.onicecandidate
	pc1.onicecandidate = function(e) {
		onIceCandidate(pc1, e);
	};
	pc2 = new RTCPeerConnection(servers);
	pc2.onicecandidate = function(e) {
		onIceCandidate(pc2, e);
	};
	pc1.oniceconnectionstatechange = function(e) {
		onIceStateChange(pc1, e);
	};
	pc2.oniceconnectionstatechange = function(e) {
		onIceStateChange(pc2, e);
	};
	pc2.onaddstream = gotRemoteStream;

	pc1.addStream(videoStream);
	pc1.createOffer(onCreateOfferSuccess, handleError,
      offerOptions);
}*/

function addCall() {
	trace('Starting calls');
	var audioTracks = localStream.getAudioTracks();
	var videoTracks = localStream.getVideoTracks();
	if (audioTracks.length > 0) {
		trace('Using audio device: ' + audioTracks[0].label);
	}
	if (videoTracks.length > 0) {
		trace('Using video device: ' + videoTracks[0].label);
	}
	// Create an RTCPeerConnection via the polyfill.
	var servers = null;
	pcLocal[numRemoteStreams] = new RTCPeerConnection(servers);
	pcRemote[numRemoteStreams] = new RTCPeerConnection(servers);
	pcRemote[numRemoteStreams].onaddstream = gotRemoteStream.bind(null, numRemoteStreams);
	pcLocal[numRemoteStreams].onicecandidate = iceCallbackLocal.bind(null, numRemoteStreams);
	pcRemote[numRemoteStreams].onicecandidate = iceCallbackRemote.bind(null, numRemoteStreams);
	trace('pc' + numRemoteStreams + ': created local and remote peer connection objects');

	pcLocal[numRemoteStreams].addStream(localStream);
	trace('Adding local stream to pcLocal' + numRemoteStreams);
	pcLocal[numRemoteStreams].createOffer(gotDescriptionLocal.bind(null, numRemoteStreams), handleError,
	  offerOptions);
	numRemoteStreams++;
}

function gotDescriptionLocal(num, desc) {
  pcLocal[num].setLocalDescription(desc);
  trace('Offer from pcLocal' + num + '\n' + desc.sdp);
  pcRemote[num].setRemoteDescription(desc);
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pcRemote[num].createAnswer(gotDescriptionRemote.bind(null, num),
      handleError);
}

function gotDescriptionRemote(num, desc) {
  pcRemote[num].setLocalDescription(desc);
  trace('Answer from pcRemote' + num + '\n' + desc.sdp);
  pcLocal[num].setRemoteDescription(desc);
}

function gotRemoteStream(num, e) {
	createRemoteVideoDiv(num);
	remoteStreams[num] = $("#videoRemote" + num)[0];
	remoteStreams[num].src = window.URL.createObjectURL(e.stream);
	trace('pc' + num + ': received remote stream');
	if(currentConnectingPeer < peerNumber - 1) {
		currentConnectingPeer++;
		sendMessage("Got user media", channel, currentConnectingPeer);
	}
}

function iceCallbackLocal(num, event) {
  handleCandidate(event.candidate, pcRemote[num], 'pc' + num + ': ', 'local');
}

function iceCallbackRemote(num, event) {
  handleCandidate(event.candidate, pcLocal[num], 'pc1' + num + ': ', 'remote');
}

function handleCandidate(candidate, dest, prefix, type) {
  if (candidate) {
    dest.addIceCandidate(new RTCIceCandidate(candidate),
        onAddIceCandidateSuccess, onAddIceCandidateError);
    trace(prefix + 'New ' + type + ' ICE candidate: ' + candidate.candidate);
  }
}

function onAddIceCandidateSuccess() {
  trace('AddIceCandidate success.');
}

function onAddIceCandidateError(error) {
  trace('Failed to add ICE candidate: ' + error.toString());
}

function createRemoteVideoDiv(num) {
	$("#remoteVideos").append("<video id=\"videoRemote" + num + "\" autoplay></video>");
}

function endCall() {
	socket.emit("Bye", channel);
}

function hangup() {
  trace('Ending calls');
  for(var i = 0; i < pcLocal.length; i++)
  	pcLocal[i].close();
  for(var i = 0; i < pcRemote.length; i++)
  	pcRemote[i].close();
  pcLocal = pcRemote = [];
}

function checkAndStart(num) {
	if(typeof localStream != 'undefined' && isChannelReady) {
		createPeerConnection(num);
		pcLocal[num].addStream(localStream);
		//isStarted = true;
		if(isInitiator) {
			doCall(num);
		}
	}
}

function handleIceCandidate(event) {
	console.log('handleIceCandidate event: ', event);
	if (event.candidate) {
		sendMessage({
		type: 'candidate',
		label: event.candidate.sdpMLineIndex,
		id: event.candidate.sdpMid,
		candidate: event.candidate.candidate}, channel, currentConnectingPeer);
	} else {
		console.log('End of candidates.');
	}
}

function handleRemoteStreamAdded(event) {
	console.log('Remote stream added.');
	attachMediaStream(remoteVideo, event.stream);
	remoteStream = event.stream;
}

function handleRemoteStreamRemoved(event) {
	console.log('Remote stream removed. Event: ', event);
}

function createPeerConnection(num) {
	try {
		pcLocal[num] = new RTCPeerConnection(null);
		pcLocal[num].onicecandidate = handleIceCandidate;
		console.log("RTCPeerConnection with " + num + " created");
	} catch (e) {
		console.log("Failed to create RTCPeerConnection");
		return;
	}
	pcLocal[num].onaddstream = gotRemoteStream.bind(null, num);
	pcLocal[num].onremovestream = handleRemoteStreamRemoved;
}

function doCall(num) {
	console.log("Creating offer...");
	pcLocal[num].createOffer(setLocalAndSendMessage.bind(null, num, currentConnectingPeer), handleError, sdpConstraints);
}

function doAnswer(num) {
	console.log("Sending answer...");
	pcLocal[num].createAnswer(setLocalAndSendMessage.bind(null, num, currentConnectingPeer), handleError, sdpConstraints);
}

function setLocalAndSendMessage(num, intendedpeer, sessionDescription) {
	pcLocal[num].setLocalDescription(sessionDescription);
	sendMessage(sessionDescription, channel, intendedpeer);
}



function sendMessage(message, channel, intendedpeer) {
	console.log("Sending message: " + message + " from peer number: " + peerNumber);
	socket.emit("message", message, channel, peerNumber, intendedpeer);
}

function connected(peer) {
	return connectedPeers.indexOf(peer) > -1;
}