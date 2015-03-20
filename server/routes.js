
var express = require('express'),
    path = require('path');

module.exports = function setupRoutes(app, base) {
    base = base || (__dirname + '/..');

    app.use(express.static(path.resolve(base + '/client')));

    app.get('/', function(req, res){
        res.sendFile(path.resolve(base + '/client/enter.html'));
    });

    app.get('/draw', function(req, res){
        res.sendFile(path.resolve(base + '/client/draw.html'));
    });
};
