
var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    routes = require('./routes'),
    sockets = require('./sockets'),
    io = require('socket.io')(http),
    port = process.env.PORT || 8686;

// Set up non-static routes
routes(app);

// Set up all socket connections
sockets(io, app);

http.listen(port, function(){
  console.log('Random draw server listening on ' + port);
});
