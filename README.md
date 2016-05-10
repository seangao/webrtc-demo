# webrtc-demo

To run:
Server
Make sure Node.JS is installed, then install node-static and socket.io (through npm). Then, navigate to the directory and run the following command:
node nodeServer.js <port>

Client
The client(s) must be run on a local web server. Open index.html in a Chrome browser, specify the IP address and port where the signaling server is located, and a room name. Open the web page again on different windows / computers to open multiple connections to the room.