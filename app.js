var WebSocketServer = require("ws").Server;
var http = require("http");
var express = require("express");
var app = express();
var port = process.env.PORT || 5000;
var multer  = require('multer');
var fs = require('fs');

WebSocketServer.prototype.broadcast = function broadcast(data) {
  this.clients.forEach(function each(client) {
    client.send(JSON.stringify(data));
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
}
}));

// Handling routes.
app.post('/upload',function(req,res){
  console.log(req.files);
  console.log("File uploaded.");
  res.redirect('/control.html');
});

app.use(express.static(__dirname + "/"));

var server = http.createServer(app);
server.listen(port);

console.log("http server listening on %d", port);

var deviceSocket = new WebSocketServer({server: server, path: '/'});
var controlSocket = new WebSocketServer({server: server, path: '/control'});
console.log("websocket server created");

app.locals.devices = [];
app.locals.videos = [];
app.locals.uids = 1;
app.locals.showIds = false;

deviceSocket.on("connection", function(ws) {
  console.log("websocket connection open");
  var socketId = app.locals.uids++;

  ws.onmessage = function(event) {
    var data = JSON.parse(event.data);
    
    console.log("From device: ");
    console.log(data);
    
    if (data.initialValues) {
      // set initial values
      var newDevice = deviceFromInitialValues(data.initialValues);
      app.locals.devices.push(newDevice);
      send({newId: socketId, video: app.locals.selectedVideo, showIds: app.locals.showIds});
    }
  };

  ws.on("close", function() {
    var devices = app.locals.devices,
    thisDevice = devices.filter(function(device){ return device.id == socketId })[0],
    idx = devices.indexOf(thisDevice);
    devices.splice(idx,1);
  });

  function send(data) {
    ws.send(JSON.stringify(data));
  }

  function deviceFromInitialValues(values) {
    return {
      width: values.width,
      height: values.height,
      id: socketId,
      position:{},
      rotation:0
    }
  }
});

function broadcastToDevices(text) {
  deviceSocket.broadcast(text);
}

controlSocket.on('connection', function(ws){
  console.log("control websocket connection open");

  if (!app.locals.selectedVideo){
    //reset scale 
    resetDeviceScale();
  }

  send({devices: app.locals.devices});

  fs.readdir('./uploads',function(err,files){
    if(err) throw err;
    app.locals.videos = files;
    send({videos: app.locals.videos, selectedVideo: app.locals.selectedVideo, showIds: app.locals.showIds});
  });

  ws.onmessage = function(event){
    var data = JSON.parse(event.data);
    
    console.log("From Control: ");
    console.log(data);
    
    if (data.changes) {
      updateDeviceStore(data);
      broadcastToDevices(data);
    } else if (data == 'reset') {
      broadcastToDevices('reset')
    } else if (data == 'pause') {
      broadcastToDevices('pause')
    } else if (data == 'resume') {
      broadcastToDevices('resume')
    } else if (data == 'show ids') {
      app.locals.showIds = true;
      broadcastToDevices('show ids')
    } else if (data == 'hide ids') {
      app.locals.showIds = false;
      broadcastToDevices('hide ids')
    } else if (data.video) {
      app.locals.selectedVideo = data.video;
      resetDeviceScale();
      broadcastToDevices(data);
    }
  };

  ws.on("close", function() {
    console.log("control websocket connection close");
  });

  function send(data) {
    ws.send(JSON.stringify(data));
  }
});

function resetDeviceScale(){
  app.locals.devices.forEach(function(device){
    if (device.scale){
      device.scale = 2;
    }
  });
}

function updateDeviceStore(data) {
  var changes = data.changes;
  var changedDevices = app.locals.devices.filter(function(device){
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
