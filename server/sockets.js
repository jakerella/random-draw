'use strict';

var http = require('https'),
    path = require('path'),
    crypto = require('crypto'),
    bitlyKey = process.env.BITLY_KEY || null,
    expressApp = null,
    selectLimit = 10,
    waitingGameLength = 10000,
    waitingGameFreq = 200,
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
        socket.on('reset', resetContest);
        socket.on('delete', deleteContest);
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
        console.log('Firing remove');
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
    
    data.path = (data.path || '').replace(/^\//, '');
    if (!data.path) {
        return socket.emit('problem', 'Please provide a URL path for entrants to use.');
    }
    if (data.path === 'setup') {
        return socket.emit('problem', 'Looks like you are trying to override the /setup path... silly rabbit.');
    }
    
    if (drawings[data.path]) {
        return socket.emit('problem', 'There is already a drawing at that URL!');
    }
    
    if (data.urlBase && !bitlyKey) {
        return socket.emit('problem', 'No bit.ly API key is set on this server, so I cannot shorten the join URL.');
    }
    
    if (data.urlBase) {
        
        http.get('https://api-ssl.bitly.com/v3/shorten?access_token=' + bitlyKey + '&longUrl=' + encodeURIComponent(data.urlBase + '/' + data.path), function(res) {
            if (res.statusCode < 300) {
                var body = '';
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                    body += chunk;
                });
                res.on('end', function (chunk) {
                    try {
                        
                        data.joinUrl = JSON.parse(body).data.url;
                        doCreate(socket, data);
                        
                    } catch(err) {
                        return socket.emit('problem', 'Unable to shorten URL, unexpected response from bit.ly: ' + body);
                    }
                });
            } else {
                return socket.emit('problem', 'Unable to shorten URL, unexpected status code from bit.ly: ' + res.statusCode);
            }
        }).on('error', function(err) {
            return socket.emit('problem', 'Unable to shorten URL: ' + err.message);
        });
        
    } else {
        
        data.joinUrl = null;
        doCreate(socket, data);
    }
    
}

function doCreate(socket, data) {
    drawings[data.path] = {
        admin: data.uid,
        name: data.name || null,
        path: data.path,
        item: data.item || null,
        joinUrl: data.joinUrl || null,
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
    
    socket.join('admins', function(err) {
        if (err) {
            console.log('Unable to add ' + socket.id + ' to /admins!');
            socket.emit('problem', 'Sorry, but I was unable to add you to the admins room, which may casuse problems.');
            return console.error(err);
        }
        
        console.log('Added ' + data.uid + ' to /admins');
    });
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
    
    if (contest.entrants[keys[winner]] && users[keys[winner]] && 
        users[keys[winner]].connected && !contest.entrants[keys[winner]].selected) {
        
        return waitingGame(contest, function notifyWinner() {
            socket.emit('winner', keys[winner]);
            contest.entrants[keys[winner]].selected = true;
            users[keys[winner]].socket.emit('win', contest.path);
        });
    
    } else if (count < Math.min(selectLimit, keys.length)) {
        return selectWinner.apply(socket, [data, ++count]);
    } else {
        return socket.emit('problem', 'There are no more entrants to select!');
    }
}

function waitingGame(contest, cb) {
    var i, l,
        uids = Object.keys(contest.entrants);
    
    setTimeout(function winnerCallback() {
        cb();
    }, waitingGameLength + 50);
    
    for (i=0; i < (waitingGameLength / waitingGameFreq); ++i) {
        setTimeout(function highlightEntrant() {
            var index = Math.floor(Math.random() * uids.length);
            
            users[uids[index]].socket.emit('maybe', contest.path);
            users[contest.admin].socket.emit('maybe', uids[index]);
            
        }, (i * waitingGameFreq));
    }
}

function resetContest(data) {
    var contest, keys,
        socket = this;
    
    data = data || {};
    contest = drawings[data.path.replace(/^\//, '')];
    
    if (!contest) {
        return socket.emit('problem', 'There is no drawing at this path.');
    }
    if (data.uid !== contest.admin) {
        return socket.emit('problem', 'You have no power here.');
    }
    
    keys = Object.keys(contest.entrants);
    
    keys.forEach(function(uid) {
        users[uid].socket.emit('problem', 'This drawing has been reset! Please refresh this page to re-enter.');
    });
    
    contest.entrants = {};
    
    socket.emit('reset');
}

function deleteContest(data) {
    var contest,
        socket = this;
    
    data = data || {};
    contest = drawings[data.path.replace(/^\//, '')];
    
    if (!contest) {
        return socket.emit('problem', 'There is no drawing at this path.');
    }
    if (data.uid !== contest.admin) {
        return socket.emit('problem', 'You have no power here.');
    }
    
    if (contest.joinUrl) {
    
        http.get('https://api-ssl.bitly.com/v3/user/link_edit?edit=archived&archived=true&access_token=' + bitlyKey + '&link=' + encodeURIComponent(contest.joinUrl), function(res) {
            if (res.statusCode < 400) {
                
                doDelete(socket, contest);
                
            } else {
                console.error('Unable to archive bit.ly link: ' + res.statusCode, contest.joinUrl);
                socket.emit('problem', 'Unable to archive bit.ly link: ' + res.statusCode);
                doDelete(socket, contest);
            }
        }).on('error', function(err) {
            console.error('Error trying to archive bit.ly link: ' + err.message, contest.joinUrl);
            socket.emit('problem', 'Error trying to archive bit.ly link: ' + err.message);
            doDelete(socket, contest);
        });
        
    } else {
        doDelete(socket, contest);
    }
}

function doDelete(socket, contest) {
    var keys = Object.keys(contest.entrants);
    
    keys.forEach(function(uid) {
        users[uid].socket.emit('problem', 'This drawing has closed!');
    });
    
    drawings[contest.path] = null;
    
    socket.emit('deleted');
}

function checkForAdmin(data) {
    var uid, contest,
        socket = this,
        entrants = [],
        isAdmin = false;
    
    data = data || {};
    contest = drawings[data.path];
    isAdmin = data.uid && data.path && contest && contest.admin === data.uid;
    
    socket.emit('isadmin', {
        isAdmin: isAdmin,
        contest: contest
    });
    
    if (isAdmin) {
        for (uid in contest.entrants) {
            if (contest.entrants.hasOwnProperty(uid)) {
                entrants.push(uid);
            }
        }
        
        socket.emit('entry', entrants);
        
        socket.join('admins', function(err) {
            if (err) {
                console.log('Unable to add ' + socket.id + ' to /admins!');
                socket.emit('problem', 'Sorry, but I was unable to add you to the admins room, which may casuse problems.');
                return console.error(err);
            }
            
            console.log('Added ' + data.uid + ' to /admins');
        });
    }
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
