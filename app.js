var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var app = express();
var port = process.env.PORT || 5000;
var multer  = require('multer');
var done=false;
var fs = require('fs');

WebSocketServer.prototype.broadcast = function broadcast(data) {
  this.clients.forEach(function each(client) {
    client.send(data);
  });
};

// Configure the multer.
app.use(multer({ dest: './uploads/',
 rename: function (fieldname, filename) {
    return filename;
  },
  onFileUploadStart: function (file) {
    console.log(file.originalname + ' is starting ...')
  },
  onFileUploadComplete: function (file) {
    console.log(file.fieldname + ' uploaded to  ' + file.path)
    done=true;
}
}));

// Handling routes.
app.post('/upload',function(req,res){
  if(done==true){
    console.log(req.files);
    console.log("File uploaded.");
    res.redirect('/control.html');
  }
});

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
      newDevice.position = {};
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

  // add videos to locals
  app.locals.options = [];

  fs.readdir('./uploads',function(err,files){
    if(err) throw err;
    files.forEach(function(file){
      app.locals.options.push(file);
    });
    ws.send(JSON.stringify({devices: devices, options: app.locals.options}));
  });

  ws.send(JSON.stringify({devices: devices, options: app.locals.options}));

  ws.onmessage = function(event){
    var data = JSON.parse(event.data);

    if (data.changes) {
      updateDeviceStore(data);
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

function updateDeviceStore(data) {
  var changes = data.changes;
  var changedDevices = devices.filter(function(device){
    if (data.deviceId == 'all') {
      return true;
    } else {
      return device.id == data.deviceId;
    }
  });
  changedDevices.forEach(function(device){
    ['position','scale','rotation'].forEach(function(prop){
      device[prop] = changes[prop] || device[prop];
    })
  })

}
