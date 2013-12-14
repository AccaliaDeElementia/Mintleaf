/*jslint node: true, maxlen: 80, unparam: true */
'use strict';
var http = require('http'),
    io = require('socket.io'),
    Mintleaf = require('./lib/mintleaf'),
    mintleaf = new Mintleaf('/storage/accalia/images'),
    app,
    socketer;

function handler(req, res) {
    res.writeHead(500);
    res.end('Not Implemented. Access static files through nginx');
}
app = http.createServer(handler);
app.listen(50998);
socketer = io.listen(app, {
    'log level': 1
});

socketer.sockets.on('connection', function (socket) {
    socket.on('listdir', mintleaf.listdir);
    socket.on('getfile', mintleaf.getfile);
});

