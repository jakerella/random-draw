
var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    connections = {};

app.use(express.static(__dirname + '/client'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/client/index.html');
});

app.get('/choose', function(req, res){
  res.sendFile(__dirname + '/client/choose.html');
});

app.get('/random', function(req, res){
  res.end('me!');
});


io.on('connection', function(socket) {
  console.log('User ' + socket.id + ' connected...');

  connections[socket.id] = {
    socket: socket,
    name: null
  };

  socket.on('disconnect', function() {
    console.log('...user ' + socket.id + ' disconnected.');

    delete connections[socket.id];
  });

  socket.on('chooseme', function(name) {
    console.log(socket.id + ' entered the drawing as ' + name);

    if (connections[socket.id]) {
      connections[socket.id].name = name;
      socket.emit('entered');
    }
  });
});

http.listen(8686, function(){
  console.log('listening on *:8686');
});
