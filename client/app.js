
window.rdw = (function(app, $) {
    var storeKey = 'random-draw-entry',
        drawerKey = 'random-drawer';
        socket = io(),
        ui = {
            msg: $('.messages'),
            name: $('[name="entrant-name"]'),
            drawBtn: $('.draw'),
            entrants: $('.entrants')
        };
    
    socket.on('connect', initConnect);
    socket.on('problem', addMessage);
    
    function initConnect() {
        var data = {},
            entry = localStorage.getItem(storeKey);
        
        if (entry && document.location.pathname === '/') {
            data = JSON.parse(entry);
            ui.name.val(data.name || '');
            socket.emit('update', data.uid);
            console.info('Socket for ' + data.uid + ' updated');
        } else {
            console.info('Socket ' + socket.id + ' is connected to the server!');
        }
    }
    
    function initEnter() {
        socket.on('entered', function(data) {
            localStorage.setItem(storeKey, data);
            addMessage('You were entered!', 'success');
            console.info('Entered in contest', data);
        });
        
        socket.on('updated', function(data) {
            localStorage.setItem(storeKey, data);
            addMessage('Your name was updated!', 'success');
            console.info('Updated entrant', data);
        });
        
        $('form').on('submit', function(e) {
            e.preventDefault();
            socket.emit('enter', ui.name.val());
            return false;
        });
    }
    
    function initDraw() {
        var winner = $('.winner'),
            uid = localStorage.getItem(drawerKey);
        
        socket.emit('ihavethepower', uid || null);
        
        ui.drawBtn.on('click', function(e) {
            e.preventDefault();
            socket.emit('draw', uid);
        });
        
        socket.on('entry', addEntrantUI);
        socket.on('remove', removeEntrantUI);
        
        socket.on('winner', function(name) {
            winner.text(name);
        });
        
        socket.on('power', function(powerUid) {
            uid = powerUid;
            localStorage.setItem(drawerKey, uid);
            ui.drawBtn.css('display', 'inline-block');
        })
    }
    
    function addEntrantUI(data) {
        var entrant;
        
        data = (typeof data === 'string' && JSON.parse(data)) || data;
        
        if (data.splice) {
            return data.forEach(function(value) {
                addEntrantUI(value);
            });
        }
        
        entrant = $('[data-uid="' + data.uid + '"]');
        
        if (entrant.length) {
            entrant.text(data.name);
        } else {
            ui.entrants.append('<li data-uid="' + data.uid + '">' + data.name + '</li>');
        }
    }
    
    function removeEntrantUI(data) {
        data = (typeof data === 'string' && JSON.parse(data)) || data;
        $('[data-uid="' + data.uid + '"]').remove();
    }
    
    function addMessage(msg, cls) {
        ui.msg
            .removeClass('success error info')
            .text(msg)
            .addClass(cls || 'error');
    }

    return {
        initEnter: initEnter,
        initDraw: initDraw,
        addMessage: addMessage
    };

})(window.rdw || {}, window.jqlite);
