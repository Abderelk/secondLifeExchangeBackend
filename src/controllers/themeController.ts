// BACKEND/src/controllers/themeController.ts

import { Request, Response } from 'express';
import Theme, { IThemeResponse } from '../models/theme';

// Helper pour formater la réponse d'un thème
const formatThemeResponse = (theme: any): IThemeResponse => {
  const themeObj = theme.toObject({ virtuals: true });
  return {
    _id: themeObj._id.toString(),
    name: themeObj.name,
    description: themeObj.description,
    icon: themeObj.icon,
    startDate: themeObj.startDate,
    endDate: themeObj.endDate,
    categories: themeObj.categories,
    isActive: themeObj.isActive,
    status: themeObj.status,
    weekNumber: themeObj.weekNumber,
    daysRemaining: themeObj.daysRemaining,
    dateRange: themeObj.dateRange,
    createdAt: themeObj.createdAt,
    updatedAt: themeObj.updatedAt,
  };
};

// GET /api/themes - Récupérer tous les thèmes
export const getAllThemes = async (req: Request, res: Response) => {
  try {
    const { year, month, status, limit } = req.query;

    const query: any = { isActive: true };

    // Filtre par année
    if (year) {
      const yearNum = parseInt(year as string);
      query.startDate = {
        $gte: new Date(yearNum, 0, 1),
        $lt: new Date(yearNum + 1, 0, 1),
      };
    }

    // Filtre par mois
    if (month && year) {
      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string) - 1;
      query.startDate = {
        $gte: new Date(yearNum, monthNum, 1),
        $lt: new Date(yearNum, monthNum + 1, 1),
      };
    }

    let themes = await Theme.find(query)
      .sort({ startDate: 1 })
      .limit(limit ? parseInt(limit as string) : 52);

    // Filtre par statut (calculé côté serveur)
    if (status) {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      themes = themes.filter((theme) => {
        const start = new Date(theme.startDate);
        const end = new Date(theme.endDate);
        const startNorm = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const endNorm = new Date(end.getFullYear(), end.getMonth(), end.getDate());

        if (status === 'past') return today > endNorm;
        if (status === 'current') return today >= startNorm && today <= endNorm;
        if (status === 'upcoming') return today < startNorm;
        return true;
      });
    }

    const formattedThemes = themes.map(formatThemeResponse);

    res.status(200).json({
      success: true,
      count: formattedThemes.length,
      data: formattedThemes,
    });
  } catch (error) {
    console.error('Erreur getAllThemes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de la récupération des thèmes',
    });
  }
};

// GET /api/themes/current - Récupérer le thème actuel
export const getCurrentTheme = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const theme = await Theme.findOne({
      isActive: true,
      startDate: { $lte: today },
      endDate: { $gte: today },
    });

    if (!theme) {
      const nextTheme = await Theme.findOne({
        isActive: true,
        startDate: { $gt: today },
      }).sort({ startDate: 1 });

      if (nextTheme) {
        return res.status(200).json({
          success: true,
          data: formatThemeResponse(nextTheme),
          message: 'Aucun thème actuel, voici le prochain',
        });
      }

      return res.status(404).json({
        success: false,
        message: 'Aucun thème actuel ou à venir',
      });
    }

    res.status(200).json({
      success: true,
      data: formatThemeResponse(theme),
    });
  } catch (error) {
    console.error('Erreur getCurrentTheme:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// GET /api/themes/calendar - Calendrier des thèmes
export const getCalendar = async (req: Request, res: Response) => {
  try {
    const { year } = req.query;
    const currentYear = year ? parseInt(year as string) : new Date().getFullYear();

    const themes = await Theme.find({
      isActive: true,
      $or: [
        { startDate: { $gte: new Date(currentYear, 0, 1), $lt: new Date(currentYear + 1, 0, 1) } },
        { endDate: { $gte: new Date(currentYear, 0, 1), $lt: new Date(currentYear + 1, 0, 1) } },
      ],
    }).sort({ startDate: 1 });

    const formattedThemes = themes.map(formatThemeResponse);

    res.status(200).json({
      success: true,
      year: currentYear,
      count: formattedThemes.length,
      data: formattedThemes,
    });
  } catch (error) {
    console.error('Erreur getCalendar:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// GET /api/themes/upcoming - Prochains thèmes
export const getUpcomingThemes = async (req: Request, res: Response) => {
  try {
    const { limit = '5' } = req.query;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const themes = await Theme.find({
      isActive: true,
      startDate: { $gt: today },
    })
      .sort({ startDate: 1 })
      .limit(parseInt(limit as string));

    const formattedThemes = themes.map(formatThemeResponse);

    res.status(200).json({
      success: true,
      count: formattedThemes.length,
      data: formattedThemes,
    });
  } catch (error) {
    console.error('Erreur getUpcomingThemes:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// GET /api/themes/:id - Récupérer un thème par ID
export const getThemeById = async (req: Request, res: Response) => {
  try {
    const theme = await Theme.findById(req.params.id);

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Thème non trouvé',
      });
    }

    res.status(200).json({
      success: true,
      data: formatThemeResponse(theme),
    });
  } catch (error) {
    console.error('Erreur getThemeById:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// POST /api/themes - Créer un thème (Admin)
export const createTheme = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, startDate, endDate, categories } = req.body;

    // Vérifier le chevauchement de dates
    const overlapping = await Theme.findOne({
      isActive: true,
      $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }],
    });

    if (overlapping) {
      const overlappingFormatted = formatThemeResponse(overlapping);
      return res.status(400).json({
        success: false,
        message: `Ce thème chevauche "${overlapping.name}" (${overlappingFormatted.dateRange})`,
      });
    }

    const theme = await Theme.create({
      name,
      description,
      icon,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      categories: categories || [],
    });

    res.status(201).json({
      success: true,
      data: formatThemeResponse(theme),
    });
  } catch (error: any) {
    console.error('Erreur createTheme:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', '),
      });
    }
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// PUT /api/themes/:id - Mettre à jour un thème (Admin)
export const updateTheme = async (req: Request, res: Response) => {
  try {
    const { name, description, icon, startDate, endDate, categories, isActive } = req.body;

    const theme = await Theme.findById(req.params.id);

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Thème non trouvé',
      });
    }

    // Vérifier le chevauchement si les dates changent
    if (startDate || endDate) {
      const newStart = startDate ? new Date(startDate) : theme.startDate;
      const newEnd = endDate ? new Date(endDate) : theme.endDate;

      const overlapping = await Theme.findOne({
        _id: { $ne: theme._id },
        isActive: true,
        $or: [{ startDate: { $lte: newEnd }, endDate: { $gte: newStart } }],
      });

      if (overlapping) {
        return res.status(400).json({
          success: false,
          message: `Ce thème chevaucherait "${overlapping.name}"`,
        });
      }
    }

    // Mise à jour des champs
    if (name) theme.name = name;
    if (description) theme.description = description;
    if (icon) theme.icon = icon;
    if (startDate) theme.startDate = new Date(startDate);
    if (endDate) theme.endDate = new Date(endDate);
    if (categories) theme.categories = categories;
    if (typeof isActive === 'boolean') theme.isActive = isActive;

    await theme.save();

    res.status(200).json({
      success: true,
      data: formatThemeResponse(theme),
    });
  } catch (error) {
    console.error('Erreur updateTheme:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};

// DELETE /api/themes/:id - Supprimer un thème (Admin)
export const deleteTheme = async (req: Request, res: Response) => {
  try {
    const theme = await Theme.findById(req.params.id);

    if (!theme) {
      return res.status(404).json({
        success: false,
        message: 'Thème non trouvé',
      });
    }

    // Soft delete
    theme.isActive = false;
    await theme.save();

    res.status(200).json({
      success: true,
      message: 'Thème supprimé avec succès',
    });
  } catch (error) {
    console.error('Erreur deleteTheme:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
    });
  }
};