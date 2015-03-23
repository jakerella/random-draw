'use strict';

var path = require('path'),
    crypto = require('crypto'),
    expressApp = null,
    selectLimit = 10,
    drawings = {},
    users = {};

module.exports = function setupSockets(io, app) {
    expressApp = app;

    io.on('connection', function(socket) {
        connect(socket);
        socket.on('disconnect', disconnect);
        socket.on('newuser', function() {
            var uid = getUid(socket.id);
            updateUser(uid, socket);
            socket.emit('userinfo', uid);
        });
        socket.on('update', function(uid) {
            updateUser(uid, this);
            socket.emit('userinfo', uid);
        });
        
        socket.on('enterdrawing', enterDrawing);
        
        socket.on('create', createDrawing);
        socket.on('isadmin', checkForAdmin);
        socket.on('draw', selectWinner);
    });

};


// ------------ Connection & User Management -------------- //

function updateUser(uid, socket) {
    if (users[uid]) {
        console.log('Updating socket and connected switch for ' + uid);
    } else {
        console.log('Added new user: ' + uid);
    }
    
    users[uid] = {
        uid: uid,
        socket: socket,
        connected: true
    };
}

function connect(socket) {
    console.log(socket.id + ' connected.');
}

function disconnect() {
    var socket = this,
        uid = findUserBySocket(socket.id);

    console.log(socket.id + ' disconnected (user: ' + uid + ')');

    if (uid) {
        socket.to('admins').emit('remove', uid);
        users[uid].connected = false;
    }
}

function findUserBySocket(id) {
    var i, l,
        keys = Object.keys(users);
    
    for (i=0, l=keys.length; i<l; ++i) {
        if (users[keys[i]].socket.id === id) {
            return keys[i];
        }
    }
    return null;
}

function getUid(seed) {
    return crypto
        .createHash('sha1')
        .update(seed + (new Date()).getTime(), 'utf8')
        .digest('hex');
}


// --------------- Drawing Administration --------------- //

function createDrawing(data) {
    var socket = this;
    
    data = data || {};
    
    if (!data.uid) {
        return socket.emit('problem', 'Are you disconnected? I don\'t have an ID for you.');
    }
    
    if (!data.path) {
        return socket.emit('problem', 'Please provide a URL path for entrants to use.');
    }
    data.path = data.path.replace(/^\//, '');
    
    if (drawings[data.path]) {
        return socket.emit('problem', 'There is already a drawing at that URL!');
    }
    
    drawings[data.path] = {
        admin: data.uid,
        name: data.name || null,
        path: data.path,
        item: data.item || null,
        entrants: {}
    };
    
    expressApp.get('/' + data.path, function(req, res){
        res.sendFile(path.resolve(expressApp.settings.clientBase + '/client/join.html'));
    });
    expressApp.get('/' + data.path + '/draw', function(req, res){
        res.sendFile(path.resolve(expressApp.settings.clientBase + '/client/draw.html'));
    });
    
    socket.emit('create', drawings[data.path]);
    
    console.log('New contest created at /' + data.path + ' by ' + data.uid);
}

function selectWinner(data, count) {
    var contest, keys, winner,
        socket = this;
    
    data = data || {};
    count = count || 0;
    contest = drawings[data.path.replace(/^\//, '')];
    
    if (count > selectLimit) {
        return socket.emit('problem', 'Unable to find a winner, recursive depth limit reached.');
    }
    
    if (!contest) {
        return socket.emit('problem', 'There is no drawing at this path.');
    }
    
    if (data.uid !== contest.admin) {
        return socket.emit('problem', 'You have no power here.');
    }
    
    keys = Object.keys(contest.entrants);
    winner = Math.floor(Math.random() * keys.length);
    
    if (!keys.length) {
        return socket.emit('problem', 'NO ENTRANTS!');
    }
    
    if (contest.entrants[keys[winner]] && users[keys[winner]] && users[keys[winner]].connected) {
        
        socket.emit('winner', keys[winner]);
        contest.entrants[keys[winner]].selected = true;
        users[keys[winner]].socket.emit('win', contest.path);
    
    } else if (count < Math.min(selectLimit, keys.length)) {
        
        selectWinner.apply(socket, [data, count++]);
        
    }
}

function checkForAdmin(data) {
    this.emit(
        'isadmin',
        data && data.uid && data.path && drawings[data.path] && drawings[data.path].admin === data.uid
    );
}


// --------------- CONTEST ENTRANTS --------------- //

function enterDrawing(data) {
    var contest,
        socket = this;

    data = data || {};
    
    if (!data.uid || !users[data.uid]) {
        socket.emit('problem', 'Sorry, but I\'m not sure who you are... can you refresh the page?');
        return console.log('Unable to enter user with no uid (' + socket.id + ')');
    }
    if (!data.path) {
        return socket.emit('problem', 'Sorry, but I\'m not sure what drawing you are trying to join!');
    }
    
    data.path = data.path.replace(/^\//, '');
    contest = drawings[data.path];
    
    if (!contest) {
        return socket.emit('problem', 'Sorry, but it looks like that drawing may have ended.');
    }
    
    updateUser(data.uid, socket);

    socket.join('entrants', function(err) {
        if (err) {
            console.log('Unable to add ' + socket.id + ' to /entrants!');
            socket.emit('problem', 'Sorry, but I was unable to enter you into this drawing.');
            return console.error(err);
        }
        
        if (contest.entrants[data.uid]) {
            
            console.log(data.uid + ' was updated in the drawing at /' + data.path);
            
        } else {
            
            contest.entrants[data.uid] = {
                uid: data.uid,
                selected: false
            };
            
            console.log(data.uid + ' was entered in the drawing at /' + data.path);
        }
        
        socket.emit('entered', {
            path: contest.path,
            name: contest.name,
            item: contest.item
        });
        
        users[contest.admin].socket.emit('entry', data.uid);
    });
}
