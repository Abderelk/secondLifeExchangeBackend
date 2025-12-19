// src/middleware/auth.ts

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../types';

interface JwtPayload {
  id: string;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    // Récupérer le token du header Authorization
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Non autorisé - Token manquant',
      });
      return;
    }

    // Vérifier le token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET non défini');
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // Récupérer l'utilisateur
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Utilisateur non trouvé',
      });
      return;
    }

    // Ajouter l'utilisateur à la requête
    req.user = {
      id: user._id.toString()
    };

    next();
  } catch (error) {
    console.error('❌ Erreur auth middleware:', error);
    res.status(401).json({
      success: false,
      message: 'Non autorisé - Token invalide',
    });
  }
};

// Middleware optionnel - ne bloque pas si pas de token
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const secret = process.env.JWT_SECRET;
      if (secret) {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        const user = await User.findById(decoded.id).select('-password');

        if (user) {
          req.user = {
            id: user._id.toString(),
          };
        }
      }
    }

    next();
  } catch (error) {
    // En cas d'erreur, on continue sans authentification
    next();
  }
};

// Middleware admin
export const isAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.id !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Accès refusé - Admin uniquement',
    });
    return;
  }
  next();
};

// Middleware moderator ou admin
export const isModerator = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.id !== 'admin' && req.user?.id !== 'moderator') {
    res.status(403).json({
      success: false,
      message: 'Accès refusé - Modérateur ou Admin uniquement',
    });
    return;
  }
  next();
};