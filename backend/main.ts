import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 6767 });

wss.on('connection', (ws) => {
    console.log('connected');

    ws.on('message', (msg) => {
        console.log(msg.toString());
    });
});
