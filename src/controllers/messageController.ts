// src/controllers/messageController.ts

import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../types';
import Conversation from '../models/conversation';
import Message from '../models/message';
import { emitNewMessage, emitConversationUpdate } from '../services/socketService';

// Types pour les documents populés
interface PopulatedParticipant {
    _id: mongoose.Types.ObjectId;
    firstName?: string;
    lastName?: string;
    avatar?: string;
}

interface PopulatedItem {
    _id: mongoose.Types.ObjectId;
    title: string;
    images?: string[];
    description?: string;
    category?: string;
}

interface PopulatedExchange {
    _id: mongoose.Types.ObjectId;
    status: string;
}

interface PopulatedConversation {
    _id: mongoose.Types.ObjectId;
    participants: PopulatedParticipant[];
    itemOffered?: PopulatedItem;
    itemRequested?: PopulatedItem;
    exchange?: PopulatedExchange;
    lastMessage?: string;
    lastMessageAt?: Date;
    unreadCount?: Map<string, number>;
}

interface PopulatedMessage {
    _id: mongoose.Types.ObjectId;
    conversation: mongoose.Types.ObjectId;
    sender: PopulatedParticipant;
    content: string;
    read: boolean;
    createdAt: Date;
}

// Récupérer toutes les conversations de l'utilisateur
export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Non autorisé' });
            return;
        }

        const conversations = await Conversation.find({
            participants: userId,
        })
            .populate('participants', 'firstName lastName avatar')
            .populate('itemOffered', 'title images')
            .populate('itemRequested', 'title images')
            .populate('exchange', 'status')
            .sort({ lastMessageAt: -1 })
            .lean() as unknown as PopulatedConversation[];

        // Formater les conversations
        const formattedConversations = conversations.map((conv) => {
            // Trouver l'autre participant
            const otherParticipant = conv.participants.find(
                (p) => p._id.toString() !== userId.toString()
            );

            // Récupérer le nombre de messages non lus pour cet utilisateur
            let unreadCount = 0;
            if (conv.unreadCount) {
                const unreadData = conv.unreadCount as unknown as Record<string, number>;
                unreadCount = unreadData[userId] || 0;
            }

            return {
                id: conv._id.toString(),
                participant: otherParticipant ? {
                    id: otherParticipant._id.toString(),
                    firstName: otherParticipant.firstName || 'Utilisateur',
                    lastName: otherParticipant.lastName || '',
                    avatar: otherParticipant.avatar,
                } : null,
                itemOffered: conv.itemOffered ? {
                    id: conv.itemOffered._id.toString(),
                    title: conv.itemOffered.title,
                    image: conv.itemOffered.images?.[0] || null,
                } : null,
                itemRequested: conv.itemRequested ? {
                    id: conv.itemRequested._id.toString(),
                    title: conv.itemRequested.title,
                    image: conv.itemRequested.images?.[0] || null,
                } : null,
                exchangeStatus: conv.exchange ? conv.exchange.status : null,
                lastMessage: conv.lastMessage || '',
                lastMessageAt: conv.lastMessageAt,
                unreadCount,
            };
        });

        res.json({ success: true, data: formattedConversations });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur getConversations:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Récupérer les messages d'une conversation
export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Non autorisé' });
            return;
        }

        // Normaliser l'ID utilisateur
        const currentUserId = userId.toString();

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        })
            .populate('participants', 'firstName lastName avatar')
            .populate('itemOffered', 'title images description category')
            .populate('itemRequested', 'title images description category')
            .lean() as unknown as PopulatedConversation | null;

        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation non trouvée' });
            return;
        }

        // Récupérer les messages
        const messages = await Message.find({ conversation: conversationId })
            .populate('sender', 'firstName lastName avatar')
            .sort({ createdAt: 1 })
            .lean() as unknown as PopulatedMessage[];

        // Marquer les messages comme lus
        await Message.updateMany(
            { conversation: conversationId, sender: { $ne: userId }, read: false },
            { read: true }
        );

        // Mettre à jour le compteur de non-lus
        await Conversation.updateOne(
            { _id: conversationId },
            { $set: { [`unreadCount.${userId}`]: 0 } }
        );

        // Formater les messages
        const formattedMessages = messages.map((msg) => {
            const senderId = msg.sender._id.toString();
            const isOwn = senderId === currentUserId;

            return {
                id: msg._id.toString(),
                senderId,
                senderName: `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim(),
                content: msg.content,
                timestamp: msg.createdAt,
                isOwn,
            };
        });

        // Trouver l'autre participant
        const otherParticipant = conversation.participants.find(
            (p) => p._id.toString() !== currentUserId
        );

        res.json({
            success: true,
            data: {
                conversation: {
                    id: conversation._id.toString(),
                    participant: otherParticipant ? {
                        id: otherParticipant._id.toString(),
                        firstName: otherParticipant.firstName || 'Utilisateur',
                        lastName: otherParticipant.lastName || '',
                        avatar: otherParticipant.avatar,
                    } : null,
                    itemOffered: conversation.itemOffered ? {
                        _id: conversation.itemOffered._id.toString(),
                        title: conversation.itemOffered.title,
                        images: conversation.itemOffered.images,
                        description: conversation.itemOffered.description,
                        category: conversation.itemOffered.category,
                    } : null,
                    itemRequested: conversation.itemRequested ? {
                        _id: conversation.itemRequested._id.toString(),
                        title: conversation.itemRequested.title,
                        images: conversation.itemRequested.images,
                        description: conversation.itemRequested.description,
                        category: conversation.itemRequested.category,
                    } : null,
                },
                messages: formattedMessages,
                currentUserId, // Ajouter l'ID de l'utilisateur actuel pour debug
            },
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur getMessages:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Envoyer un message
export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { conversationId } = req.params;
        const { content } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Non autorisé' });
            return;
        }

        if (!content || !content.trim()) {
            res.status(400).json({ success: false, message: 'Le message ne peut pas être vide' });
            return;
        }

        const currentUserId = userId.toString();

        // Vérifier que l'utilisateur fait partie de la conversation
        const conversation = await Conversation.findOne({
            _id: conversationId,
            participants: userId,
        });

        if (!conversation) {
            res.status(404).json({ success: false, message: 'Conversation non trouvée' });
            return;
        }

        // Créer le message
        const message = await Message.create({
            conversation: conversationId,
            sender: userId,
            content: content.trim(),
        });

        // Mettre à jour la conversation
        const otherParticipantId = conversation.participants.find(
            (p) => p.toString() !== currentUserId
        )?.toString();

        if (otherParticipantId) {
            if (!conversation.unreadCount) {
                conversation.unreadCount = new Map();
            }
            const currentUnread = conversation.unreadCount.get(otherParticipantId) || 0;
            conversation.unreadCount.set(otherParticipantId, currentUnread + 1);
        }

        conversation.lastMessage = content.trim().substring(0, 100);
        conversation.lastMessageAt = new Date();
        await conversation.save();

        // Récupérer le message avec les infos du sender
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'firstName lastName avatar')
            .lean() as unknown as PopulatedMessage | null;

        const messageData = {
            id: message._id.toString(),
            senderId: currentUserId,
            senderName: populatedMessage?.sender
                ? `${populatedMessage.sender.firstName || ''} ${populatedMessage.sender.lastName || ''}`.trim()
                : '',
            content: message.content,
            timestamp: message.createdAt,
        };

        // 🔌 Émettre le message via WebSocket à tous les participants de la conversation
        emitNewMessage(conversationId, messageData);

        // 🔌 Notifier l'autre participant de la mise à jour de la conversation
        if (otherParticipantId) {
            const newUnreadCount = conversation.unreadCount?.get(otherParticipantId) || 1;
            emitConversationUpdate(otherParticipantId, {
                id: conversationId,
                lastMessage: conversation.lastMessage || '',
                lastMessageAt: conversation.lastMessageAt || new Date(),
                unreadCount: newUnreadCount,
            });
        }

        res.status(201).json({
            success: true,
            data: {
                ...messageData,
                isOwn: true, // Le message qu'on vient d'envoyer est toujours le nôtre
            },
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur sendMessage:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Créer ou récupérer une conversation (quand on initie un échange)
export const createConversation = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const { participantId, itemOfferedId, itemRequestedId, exchangeId } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Non autorisé' });
            return;
        }

        if (!participantId) {
            res.status(400).json({ success: false, message: 'participantId requis' });
            return;
        }

        // Vérifier si une conversation existe déjà entre ces deux utilisateurs pour cet item
        let conversation = await Conversation.findOne({
            participants: { $all: [userId, participantId] },
            itemRequested: itemRequestedId,
        });

        if (conversation) {
            res.json({ success: true, data: { id: conversation._id.toString() }, existing: true });
            return;
        }

        // Créer une nouvelle conversation
        const unreadCount = new Map<string, number>();
        unreadCount.set(participantId, 0);
        unreadCount.set(userId.toString(), 0);

        conversation = await Conversation.create({
            participants: [userId, participantId],
            itemOffered: itemOfferedId || null,
            itemRequested: itemRequestedId || null,
            exchange: exchangeId || null,
            unreadCount,
        });

        res.status(201).json({
            success: true,
            data: { id: conversation._id.toString() },
            existing: false,
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur createConversation:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Récupérer le nombre total de messages non lus
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Non autorisé' });
            return;
        }

        const conversations = await Conversation.find({ participants: userId }).lean();

        let totalUnread = 0;
        conversations.forEach((conv) => {
            if (conv.unreadCount) {
                const unreadData = conv.unreadCount as unknown as Record<string, number>;
                totalUnread += unreadData[userId] || 0;
            }
        });

        res.json({ success: true, data: { unreadCount: totalUnread } });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur getUnreadCount:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};