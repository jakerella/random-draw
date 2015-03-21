
window.rdw = (function(app, $) {
    var storeKey = 'random-draw-entry',
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
    
    function initChoose() {
        $('.draw').on('click', function(e) {
            e.preventDefault();
            socket.emit('draw');
        });
        
        socket.on('winner', function(name) {
            addMessage(name, 'success');
        });
    }
    
    function addMessage(msg, cls) {
        ui.msg
            .removeClass('success error info')
            .text(msg)
            .addClass(cls || 'error');
    }

    return {
        initEnter: initEnter,
        initChoose: initChoose,
        addMessage: addMessage
    };

})(window.rdw || {}, window.jqlite);
