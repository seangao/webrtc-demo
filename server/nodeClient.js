'use strict';

var div = $("#main-div")[0];
var socket = io.connect("http://localhost:6969");
var channel = prompt("Channel name:");

var isInitiator = false;
var isStarted = false;
var isChannelReady = false;
console.log("isChannelReady: " + isChannelReady);

if (channel !== "") {
	console.log("Joining channel: ", channel);
	socket.emit("join", channel);
}

socket.on("created", function(channel) {
	console.log("Initiator has created channel: " + channel);
	isInitiator = true;
	startVideo();
});

socket.on("full", function(channel) {
	console.log("Channel: " + channel + " is full");
});

socket.on("remotePeerJoining", function(channel) {
	console.log("Request to join: " + channel);
	isChannelReady = true;
});

socket.on("joined", function(channel) {
	console.log("Joined " + channel);
	isChannelReady = true;
	startVideo();
	console.log("isChannelReady: " + isChannelReady);
});

socket.on("message", function(message) {
	console.log("Got message: " + message);
	if(message == "Got user media") {
		if(isInitiator) {
			checkAndStart();
		}
	} else if(message.type === "offer") {
		if(!isInitiator && !isStarted) {
			console.log("We got an offer boiz");
			checkAndStart();
		}
		pc.setRemoteDescription(new RTCSessionDescription(message));
		doAnswer();
	} else if(message.type === "answer" && isStarted) {
		pc.setRemoteDescription(new RTCSessionDescription(message));
	} else if(message.type === "candidate" && isStarted) {
		var candidate = new RTCIceCandidate({sdpMLineIndex:message.label,
			candidate:message.candidate});
		pc.addIceCandidate(candidate);
	}
});

socket.on("Bye", function() {
	console.log("Disconnecting, sending ack to server...");
	socket.emit("Ack");
	socket.disconnect();
});

var localStream;
var remoteStreams = [];

var pc;
var pcLocal = [];
var pcRemote = [];
var numRemoteStreams = 0;

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
	//window.stream = stream;
	//localVideo.srcObject = stream;
	//localVideo.play();
	localVideo.src = window.URL.createObjectURL(stream);
	localStream = stream;
	//videoStream.play();
	sendMessage("Got user media", channel);
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

function hangup() {
  trace('Ending calls');
  for(var i = 0; i < pcLocal.length; i++)
  	pcLocal[i].close();
  for(var i = 0; i < pcRemote.length; i++)
  	pcRemote[i].close();
  pcLocal = pcRemote = [];
}

function checkAndStart() {
	if(!isStarted && typeof localStream != 'undefined' && isChannelReady) {
		createPeerConnection();
		pc.addStream(localStream);
		isStarted = true;
		if(isInitiator) {
			doCall();
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
		candidate: event.candidate.candidate}, channel);
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

function createPeerConnection() {
	try {
		pc = new RTCPeerConnection(null);
		pc.onicecandidate = handleIceCandidate;
		console.log("RTCPeerConnection created");
	} catch (e) {
		console.log("Failed to create RTCPeerConnection");
		return;
	}
	pc.onaddstream = gotRemoteStream.bind(null, numRemoteStreams);
	pc.onremovestream = handleRemoteStreamRemoved;
}

function doCall() {
	console.log("Creating offer...");
	pc.createOffer(setLocalAndSendMessage, handleError, sdpConstraints);
}

function doAnswer() {
	console.log("Sending answer...");
	pc.createAnswer(setLocalAndSendMessage, handleError, sdpConstraints);
}

function setLocalAndSendMessage(sessionDescription) {
	pc.setLocalDescription(sessionDescription);
	sendMessage(sessionDescription, channel);
}



function sendMessage(message, channel) {
	console.log("Sending message: ", message);
	socket.emit("message", message, channel);
}