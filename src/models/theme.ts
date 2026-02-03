// BACKEND/src/models/Theme.ts

import mongoose, { Schema, Model, Types } from 'mongoose';

// Interface pour les champs stockés en DB
export interface IThemeBase {
    _id: Types.ObjectId;
    name: string;
    description: string;
    icon: string;
    startDate: Date;
    endDate: Date;
    categories: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Interface pour les virtuals
export interface IThemeVirtuals {
    status: 'past' | 'current' | 'upcoming';
    weekNumber: number;
    daysRemaining: number;
    dateRange: string;
}

// Type complet du document Theme (avec _id en string pour les réponses JSON)
export interface IThemeResponse {
    _id: string;
    name: string;
    description: string;
    icon: string;
    startDate: Date;
    endDate: Date;
    categories: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    status: 'past' | 'current' | 'upcoming';
    weekNumber: number;
    daysRemaining: number;
    dateRange: string;
}

// Type pour le modèle
type ThemeModel = Model<IThemeBase, {}, {}, IThemeVirtuals>;

const ThemeSchema = new Schema<IThemeBase, ThemeModel, {}, {}, IThemeVirtuals>(
    {
        name: {
            type: String,
            required: [true, 'Le nom du thème est requis'],
            trim: true,
            maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères'],
        },
        description: {
            type: String,
            required: [true, 'La description est requise'],
            maxlength: [500, 'La description ne peut pas dépasser 500 caractères'],
        },
        icon: {
            type: String,
            required: [true, "L'icône est requise"],
            default: '📦',
        },
        startDate: {
            type: Date,
            required: [true, 'La date de début est requise'],
        },
        endDate: {
            type: Date,
            required: [true, 'La date de fin est requise'],
        },
        categories: {
            type: [String],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Virtual pour calculer le statut basé sur les dates
ThemeSchema.virtual('status').get(function () {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDate = new Date(this.startDate);
    const endDate = new Date(this.endDate);

    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());

    if (today < start) {
        return 'upcoming';
    } else if (today > end) {
        return 'past';
    } else {
        return 'current';
    }
});

// Virtual pour le numéro de semaine ISO
ThemeSchema.virtual('weekNumber').get(function () {
    const date = new Date(this.startDate);
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
});

// Virtual pour les jours restants
ThemeSchema.virtual('daysRemaining').get(function () {
    const now = new Date();
    const end = new Date(this.endDate);
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
});

// Virtual pour formater la plage de dates
ThemeSchema.virtual('dateRange').get(function () {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const start = new Date(this.startDate).toLocaleDateString('fr-FR', options);
    const end = new Date(this.endDate).toLocaleDateString('fr-FR', options);
    return `${start} - ${end}`;
});

// Index pour les requêtes fréquentes
ThemeSchema.index({ startDate: 1, endDate: 1 });
ThemeSchema.index({ isActive: 1 });

const Theme = mongoose.model<IThemeBase, ThemeModel>('Theme', ThemeSchema);

export default Theme;