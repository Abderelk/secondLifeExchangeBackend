// src/controllers/homeController.ts

import { Request, Response } from 'express';
import Item from '../models/item';
import WeeklyTheme from '../models/weeklyTheme';
import User from '../models/User';
import Exchange from '../models/exchange';
import { AuthRequest } from '../types';

// Récupérer les données de la page d'accueil
export const getHomeData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        // Récupérer le thème de la semaine
        const weeklyTheme = await getCurrentWeeklyTheme();

        // Récupérer les vraies statistiques
        const stats = await getStats();

        // Récupérer les items récents
        const recentItems = await getRecentItems(userId);

        res.json({
            success: true,
            data: {
                weeklyTheme,
                stats,
                items: recentItems,
            },
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur getHomeData:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Obtenir le thème de la semaine actuel
export const getWeeklyTheme = async (_req: Request, res: Response): Promise<void> => {
    try {
        const theme = await getCurrentWeeklyTheme();
        res.json({ success: true, data: theme });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Obtenir les statistiques
export const getHomeStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const stats = await getStats();
        res.json({ success: true, data: stats });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Helper: Récupérer le thème de la semaine
async function getCurrentWeeklyTheme() {
    const now = new Date();

    // Chercher un thème actif
    const activeTheme = await WeeklyTheme.findOne({
        startDate: { $lte: now },
        endDate: { $gte: now },
        isActive: true,
    });

    if (activeTheme) {
        return {
            title: activeTheme.title,
            emoji: activeTheme.emoji,
            dateRange: formatDateRange(activeTheme.startDate, activeTheme.endDate),
            description: activeTheme.description,
        };
    }

    // Thème par défaut
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    return {
        title: "Vêtements d'hiver",
        emoji: '🧥',
        dateRange: formatDateRange(startOfWeek, endOfWeek),
        description: "Cette semaine, échangez vos vêtements d'hiver : manteaux, écharpes, pulls...",
    };
}

// Helper: Formater la plage de dates
function formatDateRange(start: Date, end: Date): string {
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const startStr = start.toLocaleDateString('fr-FR', { day: 'numeric' });
    const endStr = end.toLocaleDateString('fr-FR', options);
    return `${startStr}-${endStr}`;
}

// Helper: Récupérer les vraies statistiques
async function getStats() {
    // Date du début du mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Compter les échanges complétés ce mois-ci
    const exchangesThisMonth = await Exchange.countDocuments({
        status: 'completed',
        updatedAt: { $gte: startOfMonth },
    });

    // Compter le nombre total de membres
    const totalMembers = await User.countDocuments();

    // Compter les échanges en cours (pending ou accepted)
    const activeExchanges = await Exchange.countDocuments({
        status: { $in: ['pending', 'accepted'] },
    });

    // Compter tous les échanges complétés (total)
    const totalCompletedExchanges = await Exchange.countDocuments({
        status: 'completed',
    });

    return [
        {
            icon: 'TrendingUp',
            title: 'Impact Environnemental',
            value: totalCompletedExchanges > 0 ? totalCompletedExchanges.toLocaleString('fr-FR') : exchangesThisMonth.toLocaleString('fr-FR'),
            subtitle: 'objets échangés',
            color: '#22C55E',
        },
        {
            icon: 'FavoriteBorder',
            title: 'Communauté Active',
            value: totalMembers.toLocaleString('fr-FR'),
            subtitle: 'membres engagés',
            color: '#22C55E',
        },
        {
            icon: 'ChatBubbleOutline',
            title: 'Échanges en Cours',
            value: activeExchanges.toLocaleString('fr-FR'),
            subtitle: 'conversations actives',
            color: '#1F2937',
        },
    ];
}

// Helper: Récupérer les items récents
async function getRecentItems(userId?: string) {
    const items = await Item.find({ status: 'available' })
        .populate('owner', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean();

    return items.map((item) => {
        const owner = item.owner as { firstName?: string; lastName?: string } | null;

        return {
            id: item._id.toString(),
            image: item.images?.[0] || 'https://via.placeholder.com/300',
            category: item.category,
            title: item.title,
            description: item.description?.substring(0, 80) + (item.description && item.description.length > 80 ? '...' : ''),
            ownerName: owner ? `${owner.firstName || ''} ${owner.lastName?.charAt(0) || ''}.` : 'Anonyme',
            location: item.location?.city || 'France',
            likes: item.likesCount || 0,
            isLiked: userId ? item.likes?.some((id) => id.toString() === userId) : false,
        };
    });
}

// Obtenir tous les thèmes (pour le calendrier)
export const getAllThemes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { upcoming } = req.query;
        const now = new Date();

        let filter = {};
        if (upcoming === 'true') {
            filter = { startDate: { $gte: now } };
        }

        const themes = await WeeklyTheme.find(filter).sort({ startDate: 1 });

        res.json({ success: true, data: themes });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Créer un thème (admin)
export const createWeeklyTheme = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, emoji, description, categories, startDate, endDate } = req.body;

        // Désactiver les autres thèmes qui chevauchent
        await WeeklyTheme.updateMany(
            {
                $or: [
                    { startDate: { $lte: new Date(endDate), $gte: new Date(startDate) } },
                    { endDate: { $lte: new Date(endDate), $gte: new Date(startDate) } },
                ],
            },
            { isActive: false }
        );

        const theme = await WeeklyTheme.create({
            title,
            emoji,
            description,
            categories,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            isActive: true,
        });

        res.status(201).json({ success: true, data: theme });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};