// Verbindung zum Server
const socket = io('https://galgenmannchen.onrender.com', {
    transports: ['websocket', 'polling'],
    cors: {
        origin: "*",
        credentials: true
    }
}); 