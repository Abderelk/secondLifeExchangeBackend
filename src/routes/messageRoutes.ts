// src/routes/messageRoutes.ts

import express from 'express';
import {
    getConversations,
    getMessages,
    sendMessage,
    createConversation,
    getUnreadCount,
} from '../controllers/messageController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(protect);

// GET /api/messages/conversations - Liste des conversations
router.get('/conversations', getConversations);

// GET /api/messages/unread - Nombre de messages non lus
router.get('/unread', getUnreadCount);

// POST /api/messages/conversations - Créer une conversation
router.post('/conversations', createConversation);

// GET /api/messages/conversations/:conversationId - Messages d'une conversation
router.get('/conversations/:conversationId', getMessages);

// POST /api/messages/conversations/:conversationId - Envoyer un message
router.post('/conversations/:conversationId', sendMessage);

export default router;