// src/services/socketService.ts

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface AuthenticatedSocket extends Socket {
    userId?: string;
}

interface MessageData {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: Date;
}

interface ConversationUpdateData {
    id: string;
    lastMessage: string;
    lastMessageAt: Date;
    unreadCount: number;
}

let io: Server | null = null;

// Map pour suivre les utilisateurs connectés
const connectedUsers = new Map<string, Set<string>>(); // userId -> Set<socketId>

export const initializeSocket = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Middleware d'authentification
    io.use((socket: AuthenticatedSocket, next) => {
        const token = socket.handshake.auth.token;

        if (!token) {
            console.log('🔌 Socket auth failed: No token');
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
            socket.userId = decoded.id;
            next();
        } catch (err) {
            console.log('🔌 Socket auth failed: Invalid token');
            next(new Error('Authentication error: Invalid token'));
        }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.userId;

        if (!userId) {
            socket.disconnect();
            return;
        }

        console.log(`🔌 User connected: ${userId} (socket: ${socket.id})`);

        // Ajouter à la liste des utilisateurs connectés
        if (!connectedUsers.has(userId)) {
            connectedUsers.set(userId, new Set());
        }
        connectedUsers.get(userId)?.add(socket.id);

        // Rejoindre sa room personnelle (pour recevoir les notifications)
        socket.join(`user:${userId}`);

        // Rejoindre une conversation
        socket.on('join:conversation', (conversationId: string) => {
            socket.join(`conversation:${conversationId}`);
            console.log(`   └─ User ${userId} joined conversation:${conversationId}`);
        });

        // Quitter une conversation
        socket.on('leave:conversation', (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
            console.log(`   └─ User ${userId} left conversation:${conversationId}`);
        });

        // Indicateur "en train d'écrire"
        socket.on('typing:start', (data: { conversationId: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('user:typing', {
                conversationId: data.conversationId,
                userId,
                isTyping: true,
            });
        });

        socket.on('typing:stop', (data: { conversationId: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('user:typing', {
                conversationId: data.conversationId,
                userId,
                isTyping: false,
            });
        });

        // Marquer les messages comme lus
        socket.on('messages:read', (data: { conversationId: string }) => {
            socket.to(`conversation:${data.conversationId}`).emit('messages:read', {
                conversationId: data.conversationId,
                userId,
            });
        });

        // Déconnexion
        socket.on('disconnect', () => {
            console.log(`🔌 User disconnected: ${userId} (socket: ${socket.id})`);

            // Retirer de la liste des utilisateurs connectés
            connectedUsers.get(userId)?.delete(socket.id);
            if (connectedUsers.get(userId)?.size === 0) {
                connectedUsers.delete(userId);
            }
        });
    });

    console.log('✅ Socket.IO initialized');
    return io;
};

/**
 * Émettre un nouveau message à tous les participants de la conversation
 */
export const emitNewMessage = (conversationId: string, message: MessageData): void => {
    if (!io) {
        console.warn('⚠️ Socket.IO not initialized');
        return;
    }

    console.log(`📤 Emitting new message to conversation:${conversationId}`);

    io.to(`conversation:${conversationId}`).emit('message:new', {
        conversationId,
        message: {
            ...message,
            isOwn: false, // Le destinataire reçoit le message comme "pas le sien"
        },
    });
};

/**
 * Notifier un utilisateur de la mise à jour d'une conversation
 */
export const emitConversationUpdate = (userId: string, data: ConversationUpdateData): void => {
    if (!io) {
        console.warn('⚠️ Socket.IO not initialized');
        return;
    }

    console.log(`📤 Emitting conversation update to user:${userId}`);

    io.to(`user:${userId}`).emit('conversation:updated', data);
};

/**
 * Notifier un utilisateur d'une nouvelle conversation
 */
export const emitNewConversation = (userId: string, conversation: unknown): void => {
    if (!io) {
        console.warn('⚠️ Socket.IO not initialized');
        return;
    }

    console.log(`📤 Emitting new conversation to user:${userId}`);

    io.to(`user:${userId}`).emit('conversation:new', conversation);
};

/**
 * Vérifier si un utilisateur est connecté
 */
export const isUserOnline = (userId: string): boolean => {
    return connectedUsers.has(userId) && (connectedUsers.get(userId)?.size || 0) > 0;
};

/**
 * Obtenir le nombre d'utilisateurs connectés
 */
export const getConnectedUsersCount = (): number => {
    return connectedUsers.size;
};

/**
 * Obtenir l'instance Socket.IO
 */
export const getIO = (): Server | null => io;