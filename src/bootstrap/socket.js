/**
 * Socket.IO Server Initialization
 * Handles realtime communication for embed chat widget
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {http.Server} httpServer - HTTP server instance
 * @returns {Server} Socket.IO server instance
 */
function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: '*', // Will be validated per-connection
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    // Main namespace handler
    io.on('connection', (socket) => {
        console.log(`[Socket] Client connected: ${socket.id}`);

        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Client disconnected: ${socket.id}, reason: ${reason}`);
        });
    });

    // Embed namespace for widget chat
    const embedNamespace = io.of('/embed');

    // Authentication middleware for embed namespace
    embedNamespace.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const decoded = jwt.verify(token, env.embed.jwtSecret);

            if (decoded.typ !== 'embed') {
                return next(new Error('Invalid token type'));
            }

            // Attach decoded data to socket
            socket.embedData = {
                siteKey: decoded.siteKey,
                visitorId: decoded.visitorId,
                widgetKey: decoded.widgetKey
            };

            next();
        } catch (err) {
            console.error('[Socket] Auth error:', err.message);
            return next(new Error('Invalid token'));
        }
    });

    // Load embed socket handlers
    const embedSocketHandlers = require('../modules/embed/embed.socket');
    embedSocketHandlers.init(embedNamespace);

    console.log('[Socket] Socket.IO initialized');

    return io;
}

/**
 * Get Socket.IO instance
 * @returns {Server} Socket.IO server instance
 */
function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
}

/**
 * Emit to a specific embed room
 * @param {string} roomName - Room name (embed:siteKey:visitorId)
 * @param {string} event - Event name
 * @param {object} data - Data to emit
 */
function emitToEmbedRoom(roomName, event, data) {
    if (!io) {
        console.warn('[Socket] emitToEmbedRoom: IO not initialized');
        return;
    }
    const namespace = io.of('/embed');
    const room = namespace.adapter.rooms.get(roomName);
    const socketCount = room ? room.size : 0;

    console.log(`[Socket] Emitting ${event} to room ${roomName} (${socketCount} sockets in room)`);

    namespace.to(roomName).emit(event, data);
}

module.exports = {
    initSocket,
    getIO,
    emitToEmbedRoom
};
