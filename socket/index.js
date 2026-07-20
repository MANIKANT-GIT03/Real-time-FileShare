const jwt = require('jsonwebtoken');

/**
 * Creates and configures the Socket.io server
 * @param {http.Server} server - The HTTP server from Node.js
 * @returns {SocketIO.Server} The configured io instance
 */
function createSocketServer(server) {
    const { Server } = require('socket.io');

    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // Authentication middleware: runs for every incoming connection
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.userId;
            next();
        } catch (err) {
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection handler: runs after successful authentication
    io.on('connection', (socket) => {
        console.log(`Socket connected: User ${socket.userId}, Socket ID ${socket.id}`);

        // Join a private room named after the user ID
        // This allows targeting all of this user's tabs/devices
        socket.join(`user:${socket.userId}`);

        socket.on('disconnect', (reason) => {
            console.log(`Socket disconnected: User ${socket.userId}, Reason: ${reason}`);
        });
    });

    return io;
}

module.exports = { createSocketServer };