
window.rdw = (function(app, $) {
    var storeKey = 'random-draw-entry',
        drawerKey = 'random-drawer';
        socket = io(),
        ui = {
            msg: $('.messages')
        };
    
    socket.on('connect', initConnect);
    socket.on('problem', addMessage);
    
    function initConnect() {
        var data = {},
            entry = localStorage.getItem(storeKey);
        
        if (entry && document.location.pathname === '/') {
            data = JSON.parse(entry);
            $('[name="entrant-name"]')[0].value = data.name || '';
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
            socket.emit('enter', $('[name="entrant-name"]')[0].value);
            return false;
        });
    }
    
    function initDraw() {
        var winner = $('.winner'),
            uid = localStorage.getItem(drawerKey);
        
        socket.emit('ihavethepower', uid || null);
        
        $('.draw').on('click', function(e) {
            e.preventDefault();
            socket.emit('draw', uid);
        });
        
        socket.on('winner', function(name) {
            winner.text(name);
        });
        
        socket.on('power', function(powerUid) {
            uid = powerUid;
            localStorage.setItem(drawerKey, uid);
            $('.draw').css('display', 'inline-block');
        })
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
