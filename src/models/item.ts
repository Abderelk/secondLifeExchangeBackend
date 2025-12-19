// src/models/Item.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IItem {
  title: string;
  description: string;
  category: string;
  images: string[];
  condition: 'neuf' | 'très bon' | 'bon' | 'correct' | 'usé';
  
  // Propriétaire
  owner: mongoose.Types.ObjectId;
  
  // Localisation
  location: {
    city: string;
    postalCode: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  
  // Statistiques
  likes: mongoose.Types.ObjectId[];
  likesCount: number;
  views: number;
  
  // État de l'objet
  status: 'available' | 'pending' | 'exchanged' | 'removed';
  
  // Échange
  exchangePreferences?: string[];
  
  // Thème hebdomadaire
  weeklyTheme?: mongoose.Types.ObjectId;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IItemDocument extends IItem, Document {}

interface IItemModel extends Model<IItemDocument> {}

const ItemSchema = new Schema<IItemDocument, IItemModel>(
  {
    title: {
      type: String,
      required: [true, 'Le titre est requis'],
      trim: true,
      maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères'],
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      trim: true,
      maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères'],
    },
    category: {
      type: String,
      required: [true, 'La catégorie est requise'],
      enum: [
        'vêtements',
        'électronique',
        'livres',
        'meubles',
        'décoration',
        'jouets',
        'sport',
        'outils',
        'cuisine',
        'jardin',
        'multimédia',
        'autre',
      ],
    },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: function (v: string[]) {
          return v.length <= 5;
        },
        message: 'Maximum 5 images autorisées',
      },
    },
    condition: {
      type: String,
      required: [true, "L'état est requis"],
      enum: ['neuf', 'très bon', 'bon', 'correct', 'usé'],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Le propriétaire est requis'],
    },
    location: {
      city: {
        type: String,
        required: [true, 'La ville est requise'],
      },
      postalCode: {
        type: String,
        required: [true, 'Le code postal est requis'],
      },
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    views: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['available', 'pending', 'exchanged', 'removed'],
      default: 'available',
    },
    exchangePreferences: {
      type: [String],
      default: [],
    },
    weeklyTheme: {
      type: Schema.Types.ObjectId,
      ref: 'WeeklyTheme',
    },
  },
  {
    timestamps: true,
  }
);

// Index pour les recherches
ItemSchema.index({ category: 1, status: 1 });
ItemSchema.index({ 'location.city': 1 });
ItemSchema.index({ owner: 1 });
ItemSchema.index({ createdAt: -1 });
ItemSchema.index({ likesCount: -1 });

const Item = mongoose.model<IItemDocument, IItemModel>('Item', ItemSchema);

export default Item;