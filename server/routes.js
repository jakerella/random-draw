
var express = require('express'),
    path = require('path');

module.exports = function setupRoutes(app, base) {
    app.set('clientBase', base || (__dirname + '/..'));

    app.use(express.static(path.resolve(app.settings.clientBase + '/client')));
    
    app.get('/setup', function(req, res){
        res.sendFile(path.resolve(app.settings.clientBase + '/client/setup.html'));
    });
};
