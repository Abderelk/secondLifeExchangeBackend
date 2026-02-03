// src/controllers/themeController.ts

import { Request, Response } from 'express';
import WeeklyTheme from '../models/weeklyTheme';
import User from '../models/User';
import { AuthRequest } from '../types';
import { sendThemeNotificationEmail } from '../services/notificationsService';

// Obtenir le thème actuel
export const getCurrentTheme = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const currentTheme = await WeeklyTheme.findOne({
      startDate: { $lte: now },
      endDate: { $gte: now },
      isActive: true,
    });

    if (!currentTheme) {
      res.status(404).json({ success: false, message: 'Aucun thème actif cette semaine' });
      return;
    }

    // Calculer les jours restants
    const endDate = new Date(currentTheme.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    res.json({
      success: true,
      data: {
        ...currentTheme.toObject(),
        daysRemaining,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getCurrentTheme:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Obtenir le calendrier des thèmes (passés, actuels, futurs)
export const getThemeCalendar = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    
    let startDate: Date;
    let endDate: Date;

    if (month && year) {
      // Filtrer par mois spécifique
      startDate = new Date(Number(year), Number(month) - 1, 1);
      endDate = new Date(Number(year), Number(month), 0, 23, 59, 59);
    } else {
      // Par défaut: 3 mois passés + 3 mois futurs
      startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 4, 0);
    }

    const themes = await WeeklyTheme.find({
      $or: [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
      ],
    }).sort({ startDate: 1 });

    // Marquer le thème actuel
    const themesWithStatus = themes.map(theme => {
      const themeStart = new Date(theme.startDate);
      const themeEnd = new Date(theme.endDate);
      
      let status: 'past' | 'current' | 'upcoming';
      if (themeEnd < now) {
        status = 'past';
      } else if (themeStart <= now && themeEnd >= now) {
        status = 'current';
      } else {
        status = 'upcoming';
      }

      return {
        ...theme.toObject(),
        status,
      };
    });

    res.json({
      success: true,
      data: themesWithStatus,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getThemeCalendar:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Obtenir les prochains thèmes
export const getUpcomingThemes = async (_req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    
    const upcomingThemes = await WeeklyTheme.find({
      startDate: { $gt: now },
      isActive: true,
    })
      .sort({ startDate: 1 })
      .limit(4);

    res.json({
      success: true,
      data: upcomingThemes,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getUpcomingThemes:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Créer un nouveau thème (Admin)
export const createTheme = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Accès refusé' });
      return;
    }

    const { title, emoji, description, categories, startDate, endDate, isActive } = req.body;

    // Vérifier qu'il n'y a pas de chevauchement avec un autre thème actif
    if (isActive) {
      const overlapping = await WeeklyTheme.findOne({
        isActive: true,
        $or: [
          { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
        ],
      });

      if (overlapping) {
        res.status(400).json({
          success: false,
          message: 'Un autre thème actif existe déjà pour cette période',
        });
        return;
      }
    }

    const theme = await WeeklyTheme.create({
      title,
      emoji,
      description,
      categories,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isActive: isActive ?? true,
    });

    res.status(201).json({
      success: true,
      message: 'Thème créé avec succès ! 🎉',
      data: theme,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur createTheme:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre à jour un thème (Admin)
export const updateTheme = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Accès refusé' });
      return;
    }

    const { id } = req.params;
    const updates = req.body;

    const theme = await WeeklyTheme.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!theme) {
      res.status(404).json({ success: false, message: 'Thème non trouvé' });
      return;
    }

    res.json({
      success: true,
      message: 'Thème mis à jour ! ✅',
      data: theme,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur updateTheme:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Supprimer un thème (Admin)
export const deleteTheme = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Accès refusé' });
      return;
    }

    const { id } = req.params;

    const theme = await WeeklyTheme.findByIdAndDelete(id);

    if (!theme) {
      res.status(404).json({ success: false, message: 'Thème non trouvé' });
      return;
    }

    res.json({
      success: true,
      message: 'Thème supprimé ! 🗑️',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur deleteTheme:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Envoyer les notifications pour un nouveau thème (Admin ou Cron)
export const sendThemeNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Accès refusé' });
      return;
    }

    const { themeId } = req.params;

    const theme = await WeeklyTheme.findById(themeId);
    if (!theme) {
      res.status(404).json({ success: false, message: 'Thème non trouvé' });
      return;
    }

    // Trouver tous les utilisateurs qui ont activé les notifications de thème
    const usersToNotify = await User.find({
      'notifications.email': true,
      'notifications.weeklyTheme': true,
    }).select('email firstName');

    console.log(`📧 Envoi des notifications à ${usersToNotify.length} utilisateurs...`);

    let sent = 0;
    let failed = 0;

    for (const recipient of usersToNotify) {
      try {
        await sendThemeNotificationEmail(recipient, theme);
        sent++;
      } catch (err) {
        console.error(`❌ Erreur envoi email à ${recipient.email}:`, err);
        failed++;
      }
    }

    res.json({
      success: true,
      message: `Notifications envoyées ! ✅`,
      data: {
        total: usersToNotify.length,
        sent,
        failed,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur sendThemeNotifications:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Mettre à jour les préférences de notification (User)
export const updateNotificationPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { weeklyTheme, email, newMessages, exchangeUpdates } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'notifications.weeklyTheme': weeklyTheme,
          'notifications.email': email,
          'notifications.newMessages': newMessages,
          'notifications.exchangeUpdates': exchangeUpdates,
        },
      },
      { new: true }
    ).select('notifications');

    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }

    res.json({
      success: true,
      message: 'Préférences mises à jour ! ✅',
      data: user.notifications,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur updateNotificationPreferences:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Obtenir les préférences de notification (User)
export const getNotificationPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId).select('notifications');

    if (!user) {
      res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
      return;
    }

    res.json({
      success: true,
      data: user.notifications,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getNotificationPreferences:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};