var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var app = express();
var port = process.env.PORT || 5000;

WebSocketServer.prototype.broadcast = function broadcast(data) {
  this.clients.forEach(function each(client) {
    client.send(data);
  });
};

app.use(express.static(__dirname + "/"));

var server = http.createServer(app);
server.listen(port);

console.log("http server listening on %d", port);

var deviceSocket = new WebSocketServer({server: server, path: '/'});
var controlSocket = new WebSocketServer({server: server, path: '/control'});
console.log("websocket server created");

var devices = [];
var uids = 1;

deviceSocket.on("connection", function(ws) {
  console.log("websocket connection open");
  var socketId = uids++;

  ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    if (data.initialValues) {
      // set initial values
      var newDevice = data.initialValues;
      newDevice.id = socketId;
      devices.push(newDevice);
      ws.send(JSON.stringify({newId: socketId}))
    }
  };

  ws.on("close", function() {
    var thisDevice = devices.filter(function(device){ return device.id == socketId })[0];
    var idx = devices.indexOf(thisDevice);
    devices.splice(idx,1)
  })
});

function broadcastToDevices(text) {
  deviceSocket.broadcast(JSON.stringify(text));
}

controlSocket.on('connection', function(ws){
  console.log("control websocket connection open");
  ws.send(JSON.stringify({devices: devices}));

  ws.onmessage = function(event){
    var data = JSON.parse(event.data);
    if (data.changes) {
      broadcastToDevices(data);
    } else if (data == 'reset') {
      broadcastToDevices('reset')
    } else if (data == 'pause') {
      broadcastToDevices('pause')
    } else if (data == 'resume') {
      broadcastToDevices('resume')
    }
  };

  ws.on("close", function() {
    console.log("control websocket connection close");
  })
});
