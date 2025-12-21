// src/models/Conversation.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IConversation extends Document {
    participants: mongoose.Types.ObjectId[];
    exchange?: mongoose.Types.ObjectId;
    // Objets concernés par l'échange
    itemOffered?: mongoose.Types.ObjectId; // Objet proposé par l'initiateur
    itemRequested?: mongoose.Types.ObjectId; // Objet demandé (appartient à l'autre participant)
    lastMessage?: string;
    lastMessageAt?: Date;
    unreadCount: Map<string, number>; // userId -> nombre de messages non lus
    createdAt: Date;
    updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
    {
        participants: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        }],
        exchange: {
            type: Schema.Types.ObjectId,
            ref: 'Exchange',
        },
        itemOffered: {
            type: Schema.Types.ObjectId,
            ref: 'Item',
        },
        itemRequested: {
            type: Schema.Types.ObjectId,
            ref: 'Item',
        },
        lastMessage: {
            type: String,
            default: '',
        },
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
        unreadCount: {
            type: Map,
            of: Number,
            default: {},
        },
    },
    {
        timestamps: true,
    }
);

// Index pour récupérer les conversations d'un utilisateur
conversationSchema.index({ participants: 1, lastMessageAt: -1 });

export default mongoose.model<IConversation>('Conversation', conversationSchema);