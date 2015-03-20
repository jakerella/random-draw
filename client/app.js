
window.rdw = (function(app, $) {
    var socket = io(),
        ui = {
            msg: $('.messages')
        };
    
    socket.on('connect', function() {
        console.info('User ' + socket.id + ' is connected to the server!');
    });
    
    socket.on('problem', addMessage);
    
    function initEnter() {
        socket.on('entered', function() {
            addMessage('You were entered!', 'success');
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
