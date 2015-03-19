
var connections = {};

module.exports = function setupSockets(io) {

    io.on('connection', connect);

};

function connect(socket) {
    console.log('User ' + socket.id + ' connected...');

    connections[socket.id] = {
        socket: socket,
        name: null
    };

    socket.on('disconnect', disconnect);
    socket.on('enter', enterDrawing);
}

function disconnect() {
    var socket = this;

    console.log(socket.id + ' disconnected.');

    if (connections[socket.id]) {
        delete connections[socket.id];
    }
}

function enterDrawing(name) {
    var socket = this;

    socket.join('entrants', function(err) {
        if (err) {
            console.log('Unable to add ' + this.id + ' to /entrants!');
            return console.error(err);
        }

        if (connections[socket.id]) {
            connections[socket.id].name = name;
            console.log(socket.id + ' entered the drawing as ' + name);
            socket.emit('entered');
        } else {
            console.error('Cannot find' + socket.id + ' in the connections!');
        }
    });
}
