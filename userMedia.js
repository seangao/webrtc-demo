var videoStream, audioStream;

function handleError() {
    console.error("Error");
}

function getvideoStream(stream) {
	console.log("getvideoStream: retrieving...");
	var localVideo = $("#videoLocal")[0];
	//window.stream = stream;
	//localVideo.srcObject = stream;
	//localVideo.play();
	localVideo.src = window.URL.createObjectURL(stream);
	videoStream = stream;
	//videoStream.play();
}

function getMediaConstraints(width, height) {
	var constraints = {
        audio: false,
        video: {width: {exact: width}, height: {exact: height}}
    };
    return constraints;
}

function startVideo() {
	console.log("startVideo: Requesting video stream");
	var constraints = getMediaConstraints(640, 480);
	navigator.getUserMedia(constraints, getvideoStream, handleError);
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

var pc1;
var pc2;
var offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

function gotStream(stream) {
  trace('Received local stream');
  localVideo.srcObject = stream;
  videoStream = stream;
}

function start() {
  trace('Requesting local stream');
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true
  })
  .then(gotStream)
  .catch(function(e) {
    alert('getUserMedia() error: ' + e.name);
  });
}

function call() {
  trace('Starting call');
  startTime = window.performance.now();
  var videoTracks = videoStream.getVideoTracks();
  var audioTracks = videoStream.getAudioTracks();
  if (videoTracks.length > 0) {
    trace('Using video device: ' + videoTracks[0].label);
  }
  if (audioTracks.length > 0) {
    trace('Using audio device: ' + audioTracks[0].label);
  }
  var servers = null;
  pc1 = new RTCPeerConnection(servers);
  trace('Created local peer connection object pc1');
  pc1.onicecandidate = function(e) {
    onIceCandidate(pc1, e);
  };
  pc2 = new RTCPeerConnection(servers);
  trace('Created remote peer connection object pc2');
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
  trace('Added local stream to pc1');

  trace('pc1 createOffer start');
  pc1.createOffer(onCreateOfferSuccess, onCreateSessionDescriptionError,
      offerOptions);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function onCreateOfferSuccess(desc) {
  trace('Offer from pc1\n' + desc.sdp);
  trace('pc1 setLocalDescription start');
  pc1.setLocalDescription(desc, function() {
    onSetLocalSuccess(pc1);
  }, onSetSessionDescriptionError);
  trace('pc2 setRemoteDescription start');
  pc2.setRemoteDescription(desc, function() {
    onSetRemoteSuccess(pc2);
  }, onSetSessionDescriptionError);
  trace('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  pc2.createAnswer(onCreateAnswerSuccess, onCreateSessionDescriptionError);
}

function onSetLocalSuccess(pc) {
  trace(getName(pc) + ' setLocalDescription complete');
}

function onSetRemoteSuccess(pc) {
  trace(getName(pc) + ' setRemoteDescription complete');
}

function onSetSessionDescriptionError(error) {
  trace('Failed to set session description: ' + error.toString());
}

function gotRemoteStream(e) {
	var remoteVideo = $("#videoRemote")[0];
	remoteVideo.src = window.URL.createObjectURL(e.stream);
  	//remoteVideo.srcObject = e.stream;
  	trace('pc2 received remote stream');
}

function onCreateAnswerSuccess(desc) {
  trace('Answer from pc2:\n' + desc.sdp);
  trace('pc2 setLocalDescription start');
  pc2.setLocalDescription(desc, function() {
    onSetLocalSuccess(pc2);
  }, onSetSessionDescriptionError);
  trace('pc1 setRemoteDescription start');
  pc1.setRemoteDescription(desc, function() {
    onSetRemoteSuccess(pc1);
  }, onSetSessionDescriptionError);
}

function onIceCandidate(pc, event) {
  if (event.candidate) {
    getOtherPc(pc).addIceCandidate(new RTCIceCandidate(event.candidate),
        function() {
          onAddIceCandidateSuccess(pc);
        },
        function(err) {
          onAddIceCandidateError(pc, err);
        }
    );
    trace(getName(pc) + ' ICE candidate: \n' + event.candidate.candidate);
  }
}

function onAddIceCandidateSuccess(pc) {
  trace(getName(pc) + ' addIceCandidate success');
}

function onAddIceCandidateError(pc, error) {
  trace(getName(pc) + ' failed to add ICE Candidate: ' + error.toString());
}

function onIceStateChange(pc, event) {
  if (pc) {
    trace(getName(pc) + ' ICE state: ' + pc.iceConnectionState);
    console.log('ICE state change event: ', event);
  }
}
