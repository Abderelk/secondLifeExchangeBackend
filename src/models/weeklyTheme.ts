// src/models/WeeklyTheme.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWeeklyTheme {
  title: string;
  emoji: string;
  description: string;
  categories: string[];
  
  // Dates
  startDate: Date;
  endDate: Date;
  
  // État
  isActive: boolean;
  
  // Statistiques
  itemsCount: number;
  participantsCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IWeeklyThemeDocument extends IWeeklyTheme, Document {}

interface IWeeklyThemeModel extends Model<IWeeklyThemeDocument> {}

const WeeklyThemeSchema = new Schema<IWeeklyThemeDocument, IWeeklyThemeModel>(
  {
    title: {
      type: String,
      required: [true, 'Le titre est requis'],
      trim: true,
      maxlength: [100, 'Le titre ne peut pas dépasser 100 caractères'],
    },
    emoji: {
      type: String,
      required: [true, "L'emoji est requis"],
      maxlength: [10, "L'emoji ne peut pas dépasser 10 caractères"],
    },
    description: {
      type: String,
      required: [true, 'La description est requise'],
      trim: true,
      maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
    },
    categories: {
      type: [String],
      default: [],
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
    startDate: {
      type: Date,
      required: [true, 'La date de début est requise'],
    },
    endDate: {
      type: Date,
      required: [true, 'La date de fin est requise'],
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    itemsCount: {
      type: Number,
      default: 0,
    },
    participantsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index
WeeklyThemeSchema.index({ startDate: 1, endDate: 1 });
WeeklyThemeSchema.index({ isActive: 1 });

// Méthode statique pour obtenir le thème actif
WeeklyThemeSchema.statics.getCurrentTheme = async function () {
  const now = new Date();
  return this.findOne({
    startDate: { $lte: now },
    endDate: { $gte: now },
    isActive: true,
  });
};

const WeeklyTheme = mongoose.model<IWeeklyThemeDocument, IWeeklyThemeModel>(
  'WeeklyTheme',
  WeeklyThemeSchema
);

export default WeeklyTheme;