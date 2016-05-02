var videoStream, audioStream;

function handleError() {
    console.error("Error");
}

function getLocalStream() {
	console.log("getLocalStream: retrieving...");
	var videoTracks = stream.getVideoTracks();
	var localVideo = $("#video")[0];
	//window.stream = stream;
	//localVideo.srcObject = stream;
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
	var constraints = getMediaConstraints(1280, 720);
	navigator.webkitGetUserMedia(constraints, getLocalStream, handleError);
	console.log("startVideo: finished");
}