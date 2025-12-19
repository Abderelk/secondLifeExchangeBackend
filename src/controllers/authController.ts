// src/controllers/authController.ts

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User';
import { AuthRequest } from '../types';
import { sendPasswordResetEmail } from '../config/email';

const generateToken = (userId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined');
  }
  
  return jwt.sign({ id: userId }, secret, { expiresIn: '7d' });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📝 Register request:', req.body);
    
    const { 
      firstName, 
      lastName, 
      email, 
      password,
      phone,
      address,
      interests,
      bio
    } = req.body;

    // Validation des champs requis
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ 
        success: false, 
        message: 'Veuillez remplir tous les champs obligatoires' 
      });
      return;
    }

    // Validation de l'adresse
    if (!address?.city || !address?.postalCode) {
      res.status(400).json({ 
        success: false, 
        message: 'La ville et le code postal sont requis' 
      });
      return;
    }

    // Vérifier si l'utilisateur existe déjà
    const userExists = await User.findOne({ email });
    if (userExists) {
      console.log('⚠️ Email déjà utilisé:', email);
      res.status(400).json({ 
        success: false, 
        message: 'Cet email est déjà utilisé' 
      });
      return;
    }

    // Créer l'utilisateur
    console.log('🔨 Création utilisateur...');
    const user = await User.create({ 
      firstName,
      lastName,
      email, 
      password,
      phone,
      address,
      interests: interests || [],
      bio
    });
    console.log('✅ Utilisateur créé:', user._id);
    
    const token = generateToken(user._id.toString());

    res.status(201).json({
      success: true,
      message: 'Inscription réussie ! Bienvenue sur SecondLife Exchange 🌱',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        interests: user.interests,
        bio: user.bio,
        impactScore: user.impactScore,
        createdAt: user.createdAt
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur register:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    
    console.log('🔐 Login request:', req.body.email);
    
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ 
        success: false, 
        message: 'Veuillez remplir tous les champs' 
      });
      return;
    }

    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({ 
        success: false, 
        message: 'Email ou mot de passe incorrect' 
      });
      return;
    }

    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      message: 'Connexion réussie ! 🌿',
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        address: user.address,
        interests: user.interests,
        bio: user.bio,
        avatar: user.avatar,
        impactScore: user.impactScore,
        totalExchanges: user.totalExchanges,
        totalObjectsShared: user.totalObjectsShared,
        notifications: user.notifications,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur login:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id).select('-password');
    
    if (!user) {
      res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
      return;
    }

    res.json({ 
      success: true, 
      user 
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getMe:', err.message);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur', 
      error: err.message 
    });
  }
};

// ==================== FORGOT PASSWORD ====================

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    console.log('🔑 Forgot password request for:', email);

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Veuillez fournir une adresse email'
      });
      return;
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // Toujours répondre avec succès même si l'email n'existe pas (sécurité)
    if (!user) {
      console.log('⚠️ Email non trouvé:', email);
      res.json({
        success: true,
        message: 'Si cette adresse email existe, vous recevrez un lien de réinitialisation'
      });
      return;
    }

    // Générer un token de réinitialisation
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash le token avant de le stocker (sécurité)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Sauvegarder le token et son expiration (1 heure)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
    await user.save({ validateBeforeSave: false });

    // Envoyer l'email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.firstName);
      console.log('✅ Email de réinitialisation envoyé à:', email);
      
      res.json({
        success: true,
        message: 'Un email de réinitialisation a été envoyé à votre adresse'
      });
    } catch (emailError) {
      // Si l'envoi échoue, supprimer le token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save({ validateBeforeSave: false });
      
      console.error('❌ Erreur envoi email:', emailError);
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'envoi de l\'email. Veuillez réessayer.'
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur forgotPassword:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
};

// ==================== RESET PASSWORD ====================

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    console.log('🔄 Reset password request');

    if (!token || !password) {
      res.status(400).json({
        success: false,
        message: 'Token et nouveau mot de passe requis'
      });
      return;
    }

    // Validation du mot de passe
    if (password.length < 12) {
      res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 12 caractères'
      });
      return;
    }

    if (!/[A-Z]/.test(password)) {
      res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins une majuscule'
      });
      return;
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins un caractère spécial'
      });
      return;
    }

    // Hash le token reçu pour le comparer avec celui en base
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Trouver l'utilisateur avec ce token et vérifier qu'il n'a pas expiré
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      console.log('⚠️ Token invalide ou expiré');
      res.status(400).json({
        success: false,
        message: 'Le lien de réinitialisation est invalide ou a expiré'
      });
      return;
    }

    // Mettre à jour le mot de passe
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log('✅ Mot de passe réinitialisé pour:', user.email);

    // Générer un nouveau token de connexion
    const authToken = generateToken(user._id.toString());

    res.json({
      success: true,
      message: 'Votre mot de passe a été réinitialisé avec succès ! 🎉',
      token: authToken,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur resetPassword:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message
    });
  }
};