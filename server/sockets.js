
var selectLimit = 10,
    crypto = require('crypto'),
    drawer = null,
    entrants = {};

module.exports = function setupSockets(io) {

    io.on('connection', function(socket) {
        connect(socket);
        socket.on('disconnect', disconnect);
        socket.on('enter', enterDrawing);
        socket.on('update', updateEntrant);
        
        socket.on('ihavethepower', registerDrawer);
        socket.on('draw', selectWinner);
    });

};


// --------------- CONTEST ENTRANTS --------------- //

function enterDrawing(name) {
    var existingKey,
        socket = this;

    if (!name) {
        socket.emit('problem', 'Please submit your name to enter!');
        return console.log('Unable to enter user with no name (' + socket.id + ')');
    }

    existingKey = findKey(name, 'name');
    
    if (existingKey && entrants[existingKey].socket.id !== socket.id) {
        
        
        
        socket.emit('problem', 'Sorry, but there is already an entrant by that name! Can you provide your full name?');
        return console.log('Duplicate entrant with name: ' + name);
        
    } else if (existingKey) {
        
        updateEntrant.apply(socket, [entrants[existingKey].uid]);
        socket.emit('updated', getClientData(entrants[existingKey]));
        
        return console.log(existingKey + ' was already entered in the drawing, but updated connection status');
    }
    
    existingKey = findKey(socket.id, 'socket');
    
    if (existingKey) {
        updateEntrant.apply(socket, [entrants[existingKey].uid, { name: name }]);
        socket.emit('updated', getClientData(entrants[existingKey]));
        
        return console.log(existingKey + ' was already entered in the drawing, but updated name to ' + name);
    }

    socket.join('entrants', function(err) {
        if (err) {
            console.log('Unable to add ' + socket.id + ' to /entrants!');
            socket.emit('problem', 'Sorry, but I was unable to enter you into this contest. :(');
            return console.error(err);
        }
        
        var uid = getUid(socket.id);
        
        entrants[uid] = {
            uid: uid,
            socket: socket,
            connected: true,
            name: name
        };
        
        console.log(uid + ' was entered in the drawing as ' + name);
        socket.emit('entered', getClientData(entrants[uid]));
    });
}

function updateEntrant(uid, data) {
    var prop,
        data = data || {},
        socket = this,
        existingKey = findKey(uid, 'uid');
    
    if (!existingKey) { return; }
    
    for (prop in data) {
        if (data.hasOwnProperty(prop)) {
            entrants[existingKey][prop] = data[prop];
        }
    }
    
    entrants[existingKey].socket = socket;
    entrants[existingKey].connected = true;
    
    if (socket.rooms.indexOf('entrants') < 0) {
        socket.join('entrants', function(err) {
            if (err) {
                console.log('Unable to rejoin /entrants for ' + uid + '!');
                socket.emit('problem', 'Sorry, but I had trouble updating your status. :(');
                return console.error(err);
            }
            console.log(uid + ' rejoined /entrants');
        });
    }
}


// --------------- DRAWING A WINNER --------------- //

function registerDrawer(uid) {
    var socket = this,
        uid = uid || getUid(socket.id);
    
    socket.join('drawers', function(err) {
        if (err) {
            console.log('Unable to add ' + socket.id + ' to /drawers!');
            socket.emit('problem', 'Sorry, but I was unable to add you to the drawers room. :(');
            return console.error(err);
        }
        
        console.log('New user in drawers: ' + uid);
        
        if (drawer && drawer !== uid) {
            socket.emit('problem', 'Sorry, but someone else is already drawing.');
        } else {
            drawer = uid;
            socket.emit('power', uid);
            console.log(uid + ' has the power!');
        }
    });
}

function selectWinner(uid, count) {
    var socket = this,
        keys = Object.keys(entrants),
        winner = Math.floor(Math.random() * keys.length);
    
    if (uid !== drawer) {
        return socket.emit('problem', 'You have no power here.');
    }
    
    if (!keys.length) {
        return socket.emit('problem', 'NO ENTRANTS!');
    }
    
    count = count || 0;
    
    if (entrants[keys[winner]] && 
        entrants[keys[winner]].connected && 
        entrants[keys[winner]].name) {
        socket.emit('winner', entrants[keys[winner]].name);
    } else if (count < Math.min(selectLimit, keys.length)) {
        selectWinner.apply(socket, [uid, count++]);
    }
}


// ------------------- HELPERS -------------------- //

function connect(socket) {
    console.log(socket.id + ' connected.');
}

function disconnect() {
    var socket = this,
        existingKey = findKey(socket.id, 'socket');

    console.log(socket.id + ' disconnected.');

    if (existingKey) {
        entrants[existingKey].connected = false;
    }
}

function getUid(seed) {
    return crypto
        .createHash('sha1')
        .update(seed + (new Date()).getTime(), 'utf8')
        .digest('hex');
}

function getClientData(entrant) {
    var data = '';
    
    if (entrant && entrant.connected) {
        data = JSON.stringify({
            uid: entrant.uid,
            name: entrant.name
        })
    }
    
    return data;
}

function findKey(value, param) {
    var i, l,
        keys = Object.keys(entrants);
    
    for (i=0, l=keys.length; i<l; ++i) {
        if (param === 'socket' && entrants[keys[i]].socket.id === value) {
            return keys[i];
        } else if (entrants[keys[i]][param] === value) {
            return keys[i];
        }
    }
    
    return null;
}
