import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
  };
}

export interface IUser {
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  phone?: string;
  address?: {
    street?: string;
    city: string;
    postalCode: string;
    country: string;
  };
  interests: string[];
  bio?: string;
  avatar?: string;
  impactScore: number;
  totalExchanges: number;
  totalObjectsShared: number;
  notifications: {
    email: boolean;
    weeklyTheme: boolean;
    newMessages: boolean;
    exchangeUpdates: boolean;
  };
  role: 'user' | 'admin' | 'moderator';
  isVerified: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

