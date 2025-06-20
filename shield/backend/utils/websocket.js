const WebSocket = require('ws');

let wss;

function initializeWebSocket(server) {
    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('New client connected');

        ws.on('close', () => {
            console.log('Client disconnected');
        });
    });
}

function broadcastUpdate(data) {
    if (!wss) return;

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

module.exports = {
    initializeWebSocket,
    broadcastUpdate
}; 