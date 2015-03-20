
var entrants = {};

module.exports = function setupSockets(io) {

    io.on('connection', function(socket) {
        connect(socket);
        socket.on('disconnect', disconnect);
        socket.on('enter', enterDrawing);
        socket.on('draw', selectWinner);
    });

};

function connect(socket) {
    console.log('User ' + socket.id + ' connected...');
}

function disconnect() {
    var socket = this;

    console.log(socket.id + ' disconnected.');

    if (entrants[socket.id]) {
        delete entrants[socket.id];
    }
}

function enterDrawing(name) {
    var socket = this;

    if (!name) {
        socket.emit('problem', 'Please submit your name to enter!');
        return console.error(new Error('Unable to enter user with no name (' + socket.id + ')'));
    }

    if (entrants[socket.id]) {
        entrants[socket.id].name = name;
        console.log(socket.id + ' was already entered in the drawing, but updated as ' + name);
        socket.emit('update');
    }

    socket.join('entrants', function(err) {
        if (err) {
            console.log('Unable to add ' + this.id + ' to /entrants!');
            socket.emit('problem', 'Sorry, but I was unable to enter you into this contest. :(');
            return console.error(err);
        }

        entrants[socket.id] = {
            socket: socket.id,
            name: name
        };
        
        console.log(socket.id + ' was entered in the drawing as ' + name);
        socket.emit('entered');
    });
}

function selectWinner() {
    var socket = this,
        keys = Object.keys(entrants),
        winner = Math.floor(Math.random() * keys.length);
    
    socket.emit('winner', entrants[keys[winner]].name);
}
