const HTTPS_PORT = 8443;
const fs = require('fs');
const https = require('https');
const path = require('path');
const WebSocket = require('ws');
const express = require("express");
const app = express();
app.use(express.static('build'));
app.get('*', function(req, res) {
    res.sendFile('index.html', {root: path.join( 'server/')});
});
const serverConfig = {
    key: fs.readFileSync('server/key.pem'),
    cert: fs.readFileSync('server/cert.pem')
};
const server = https.createServer(serverConfig, app);
const WebSocketServer = WebSocket.Server;
const wss = new WebSocketServer({server: server});

wss.on('connection', function(ws) {
    ws.on('message', function(message) {
        wss.broadcast(message);
    });
});

wss.broadcast = function(data) {
    this.clients.forEach(function(client) {
        if(client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
};

server.listen(process.env.PORT || HTTPS_PORT, () => {
    console.log(`Server started on port ${server.address().port} `);
});
