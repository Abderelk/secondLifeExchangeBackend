import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest } from '../types';

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