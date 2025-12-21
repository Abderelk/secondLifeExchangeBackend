// src/models/Message.ts

import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    conversation: mongoose.Types.ObjectId;
    sender: mongoose.Types.ObjectId;
    content: string;
    read: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        conversation: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        content: {
            type: String,
            required: [true, 'Le contenu du message est requis'],
            trim: true,
            maxlength: [2000, 'Le message ne peut pas dépasser 2000 caractères'],
        },
        read: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index pour récupérer les messages d'une conversation
messageSchema.index({ conversation: 1, createdAt: 1 });

export default mongoose.model<IMessage>('Message', messageSchema);