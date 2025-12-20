// src/models/Exchange.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IExchange {
  // Utilisateurs
  requester: mongoose.Types.ObjectId; // Celui qui propose l'échange
  owner: mongoose.Types.ObjectId; // Propriétaire de l'item demandé

  // Items
  requestedItem: mongoose.Types.ObjectId; // L'item que le requester veut
  offeredItems: mongoose.Types.ObjectId[]; // Les items proposés en échange

  // Message
  message?: string;

  // État de l'échange
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

  // Réponse du propriétaire
  responseMessage?: string;
  respondedAt?: Date;

  // Rendez-vous pour l'échange
  meetingDetails?: {
    date: Date;
    location: string;
    notes?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

export interface IExchangeDocument extends IExchange, Document {}

interface IExchangeModel extends Model<IExchangeDocument> {}

const ExchangeSchema = new Schema<IExchangeDocument, IExchangeModel>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le demandeur est requis'],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le propriétaire est requis'],
    },
    requestedItem: {
      type: Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, "L'objet demandé est requis"],
    },
    offeredItems: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Item',
      },
    ],
    message: {
      type: String,
      maxlength: [500, 'Le message ne peut pas dépasser 500 caractères'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },
    responseMessage: {
      type: String,
      maxlength: [500, 'La réponse ne peut pas dépasser 500 caractères'],
    },
    respondedAt: {
      type: Date,
    },
    meetingDetails: {
      date: Date,
      location: String,
      notes: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index
ExchangeSchema.index({ requester: 1, status: 1 });
ExchangeSchema.index({ owner: 1, status: 1 });
ExchangeSchema.index({ requestedItem: 1 });
ExchangeSchema.index({ createdAt: -1 });

const Exchange = mongoose.model<IExchangeDocument, IExchangeModel>(
  'Exchange',
  ExchangeSchema
);

export default Exchange;