// src/models/Stats.ts

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStats {
  // Période
  period: 'daily' | 'weekly' | 'monthly' | 'total';
  date: Date;
  
  // Statistiques
  itemsExchanged: number;
  activeMembers: number;
  activeConversations: number;
  newUsers: number;
  newItems: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IStatsDocument extends IStats, Document {}

interface IStatsModel extends Model<IStatsDocument> {}

const StatsSchema = new Schema<IStatsDocument, IStatsModel>(
  {
    period: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'total'],
    },
    date: {
      type: Date,
      required: true,
    },
    itemsExchanged: {
      type: Number,
      default: 0,
    },
    activeMembers: {
      type: Number,
      default: 0,
    },
    activeConversations: {
      type: Number,
      default: 0,
    },
    newUsers: {
      type: Number,
      default: 0,
    },
    newItems: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index unique pour éviter les doublons
StatsSchema.index({ period: 1, date: 1 }, { unique: true });

const Stats = mongoose.model<IStatsDocument, IStatsModel>('Stats', StatsSchema);

export default Stats;