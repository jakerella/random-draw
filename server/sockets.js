
var connections = {};

module.exports = function setupSockets(io) {

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

};
