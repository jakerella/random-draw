
window.rdw = (function(app, $, AudioContext) {
    'use strict';
    
    var uidKey = 'random-draw-uid',
        uid = null,
        socket = io(),
        sounds = {},
        ui = {
            msg: $('.messages'),
            name: $('[name="entrant-name"]'),
            drawBtn: $('.draw'),
            entrants: $('.entrants'),
            form: $('form')
        };
    
    checkBrowser();
    
    socket.on('connect', initConnect);
    socket.on('userinfo', updateUser);
    socket.on('problem', addMessage);
    
    function initConnect() {
        uid = localStorage.getItem(uidKey);
        
        if (uid) {
            socket.emit('update', uid);
        } else {
            socket.emit('newuser');
        }
    }
    
    function updateUser(newUid) {
        uid = newUid;
        localStorage.setItem(uidKey, newUid);
        console.info('Socket ' + socket.id + ' is connected to the server as ' + newUid);
    }
    
    function initSetup() {
        ui.form.on('submit', function(e) {
            e.preventDefault();
            socket.emit('create', {
                uid: uid,
                name: $('[name="name"]').val(),
                path: $('[name="path"]').val(),
                item: $('[name="item"]').val()
            });
            return false;
        });
        
        socket.on('create', function(contest) {
            console.info('Contest created at /' + contest.path);
            addMessage('Your drawing was created!', 'success');
            ui.form.remove();
            $('.navToDraw')
                .css('display', 'block')
                .find('a')
                    .attr('href', '/' + contest.path + '/draw');
        });
    }
    
    function initJoin() {
        downloadAudio('cheer.wav');
        
        if (uid) {
            console.log('joining with uid');
            doJoin();
        } else {
            console.log('waiting for uid');
            socket.on('userinfo', doJoin);
        }
        
        socket.on('entered', function(data) {
            addMessage('You were entered!', 'success');
            console.info('Entered in contest', data);
        });
        
        socket.on('win', function() {
            addMessage('YOU WON!', 'success');
            playAudio('cheer.wav');
            vibrate();
        });
    }
    
    function doJoin() {
        console.log('joining as', uid);
        socket.emit('enterdrawing', {
            uid: uid,
            path: document.location.pathname
        });
    }
    
    function initDraw() {
        var contest = document.location.pathname
            .replace(/\/draw\/?$/, '')
            .replace(/^\//, '');
        
        socket.on('userinfo', function() {
            socket.emit('isadmin', {
                uid: uid,
                path: contest
            });
            
            socket.once('isadmin', function(isAdmin) {
                if (isAdmin) {
                    ui.drawBtn.css('display', 'inline-block');
                } else {
                    addMessage('You\'re not an admin, so this page is pretty useless.');
                }
            });
        });
        
        ui.drawBtn.on('click', function(e) {
            e.preventDefault();
            socket.emit('draw', {
                uid: uid,
                path: contest
            });
        });
        
        socket.on('entry', addEntrantUI);
        socket.on('remove', removeEntrantUI);
        
        socket.on('winner', function(uid) {
            $('.winner').text(uid);
        });
    }
    
    function addEntrantUI(uid) {
        var entrant;
        
        console.log('adding entrant', uid);
        
        if (uid.splice) {
            return uid.forEach(function(value) {
                addEntrantUI(value);
            });
        }
        
        entrant = $('[data-uid="' + uid + '"]');
        
        if (entrant.length) {
            entrant.text(uid);
        } else {
            ui.entrants.append('<li data-uid="' + uid + '">' + uid + '</li>');
        }
    }
    
    function removeEntrantUI(uid) {
        console.log('removing entrant', uid);
        
        $('[data-uid="' + uid + '"]').remove();
    }
    
    function addMessage(msg, cls) {
        ui.msg
            .removeClass('success error info')
            .text(msg)
            .addClass(cls || 'error');
    }
    
    function downloadAudio(url, cb) {
        // No point in downloading audio if we can't us it.
        var audio = AudioContext && new AudioContext();
        if (audio) {
            var req = new XMLHttpRequest();
            req.open('GET', url, true);
            req.responseType = 'arraybuffer';

            req.onload = function() {
                audio.decodeAudioData(
                    req.response,
                    function(buffer) {
                        sounds[url] = buffer;
                        cb && cb(null, buffer);
                    },
                    function(err) {
                        console.warn('Unable to decode audio file:', url);
                        cb(err);
                    }
                );
            };
            req.send();
        }
    }
    
    function playAudio(url) {
        var audio = AudioContext && new AudioContext();
        if (audio && sounds[url]) {
            var source = audio.createBufferSource();
            source.buffer = sounds[url];
            source.connect(audio.destination);
            source.start(0);
        }
    }
    
    function vibrate(pattern) {
        pattern = pattern || [400, 150, 400, 150, 400];
        if (navigator['vibrate']) {
            navigator.vibrate(pattern);
        }
    }
    
    function checkBrowser() {
        if (!localStorage) {
            alert('Sorry! Your browser doesn\'t appear to support what we need. :(');
        }
    }

    return {
        initSetup: initSetup,
        initJoin: initJoin,
        initDraw: initDraw,
        addMessage: addMessage
    };

})(
    window.rdw || {},
    window.jqlite,
    window.AudioContext || window.webkitAudioContext
);
