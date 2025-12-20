// src/controllers/homeController.ts

import { Request, Response } from 'express';
import Item from '../models/item';
import User from '../models/User';
import WeeklyTheme from '../models/weeklyTheme';
import Stats from '../models/stats';
import { AuthRequest } from '../types';

// Obtenir les données de la HomePage
export const getHomeData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        // Exécuter toutes les requêtes en parallèle
        const [weeklyTheme, stats, recentItems] = await Promise.all([
            getCurrentWeeklyTheme(),
            getStats(),
            getRecentItems(userId),
        ]);

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
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: err.message,
        });
    }
};

// Obtenir le thème de la semaine actuel
export const getWeeklyTheme = async (req: Request, res: Response): Promise<void> => {
    try {
        const theme = await getCurrentWeeklyTheme();

        res.json({
            success: true,
            data: theme,
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur getWeeklyTheme:', err.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: err.message,
        });
    }
};

// Obtenir les statistiques
export const getHomeStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const stats = await getStats();

        res.json({
            success: true,
            data: stats,
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur getHomeStats:', err.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: err.message,
        });
    }
};

// Obtenir tous les thèmes (pour le calendrier)
export const getAllThemes = async (req: Request, res: Response): Promise<void> => {
    try {
        const { upcoming = 'true' } = req.query;

        let filter = {};
        if (upcoming === 'true') {
            filter = { endDate: { $gte: new Date() } };
        }

        const themes = await WeeklyTheme.find(filter)
            .sort('startDate')
            .lean();

        res.json({
            success: true,
            data: themes,
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur getAllThemes:', err.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: err.message,
        });
    }
};

// Créer un nouveau thème (admin)
export const createWeeklyTheme = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { title, emoji, description, categories, startDate, endDate } = req.body;

        // Désactiver les autres thèmes actifs si ce thème chevauche
        const start = new Date(startDate);
        const end = new Date(endDate);

        await WeeklyTheme.updateMany(
            {
                $or: [
                    { startDate: { $lte: end }, endDate: { $gte: start } },
                ],
            },
            { isActive: false }
        );

        const theme = await WeeklyTheme.create({
            title,
            emoji,
            description,
            categories,
            startDate: start,
            endDate: end,
            isActive: true,
        });

        res.status(201).json({
            success: true,
            message: 'Thème créé avec succès',
            data: theme,
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur createWeeklyTheme:', err.message);
        res.status(500).json({
            success: false,
            message: 'Erreur serveur',
            error: err.message,
        });
    }
};

// ==================== HELPERS ====================

async function getCurrentWeeklyTheme() {
    const now = new Date();

    const theme = await WeeklyTheme.findOne({
        startDate: { $lte: now },
        endDate: { $gte: now },
        isActive: true,
    }).lean();

    // Calculer les dates de la semaine courante
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Lundi
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Dimanche

    // Si pas de thème actif, retourner un thème par défaut
    if (!theme) {
        const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const startFormatted = startOfWeek.toLocaleDateString('fr-FR', options);
        const endFormatted = endOfWeek.toLocaleDateString('fr-FR', options);

        return {
            title: "Vêtements d'hiver",
            emoji: '🧥',
            dateRange: `${startFormatted.split(' ')[0]}-${endFormatted}`,
            description: "Cette semaine, échangez vos vêtements d'hiver : manteaux, écharpes, pulls...",
        };
    }

    // Formater la date du thème trouvé
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const startFormatted = new Date(theme.startDate).toLocaleDateString('fr-FR', options);
    const endFormatted = new Date(theme.endDate).toLocaleDateString('fr-FR', options);

    return {
        title: theme.title,
        emoji: theme.emoji,
        dateRange: `${startFormatted.split(' ')[0]}-${endFormatted}`,
        description: theme.description,
    };
}

async function getStats() {
    // Récupérer les vraies stats depuis la base de données
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [itemsExchangedThisMonth, totalUsers, activeConversations] = await Promise.all([
        Item.countDocuments({
            status: 'exchanged',
            updatedAt: { $gte: startOfMonth },
        }),
        User.countDocuments(),
        // Pour les conversations actives, on simule pour l'instant
        // À remplacer par un vrai compteur quand le modèle Conversation sera créé
        Promise.resolve(127),
    ]);

    return [
        {
            icon: 'TrendingUp',
            title: 'Impact Environnemental',
            value: itemsExchangedThisMonth.toLocaleString('fr-FR'),
            subtitle: 'objets échangés ce mois-ci',
            color: '#22C55E',
        },
        {
            icon: 'FavoriteBorder',
            title: 'Communauté Active',
            value: totalUsers.toLocaleString('fr-FR'),
            subtitle: 'membres engagés',
            color: '#22C55E',
        },
        {
            icon: 'ChatBubbleOutline',
            title: 'Échanges en Cours',
            value: activeConversations.toLocaleString('fr-FR'),
            subtitle: 'conversations actives',
            color: '#1F2937',
        },
    ];
}

async function getRecentItems(userId?: string) {
    const items = await Item.find({ status: 'available' })
        .populate('owner', 'firstName lastName address')
        .sort('-createdAt')
        .limit(6)
        .lean();

    return items.map((item) => {
        const owner = item.owner as {
            _id?: any;
            firstName?: string;
            lastName?: string;
            address?: { city?: string };
        };

        // Vérifier si l'utilisateur a liké cet item
        let isLiked = false;
        if (userId && item.likes) {
            isLiked = item.likes.some((likeId: any) => likeId.toString() === userId);
        }

        return {
            id: item._id.toString(),
            image: item.images[0] || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
            category: formatCategory(item.category),
            title: item.title,
            description: item.description,
            ownerName: owner
                ? `${owner.firstName || ''} ${(owner.lastName || '').charAt(0)}.`
                : 'Utilisateur',
            location: item.location?.city || owner?.address?.city || 'France',
            likes: item.likesCount || 0,
            isLiked,
        };
    });
}

function formatCategory(category: string): string {
    const categoryMap: Record<string, string> = {
        vêtements: 'Vêtements',
        électronique: 'Électronique',
        livres: 'Livres',
        meubles: 'Meubles',
        décoration: 'Décoration',
        jouets: 'Jouets',
        sport: 'Sport',
        outils: 'Outils',
        cuisine: 'Cuisine',
        jardin: 'Jardin',
        multimédia: 'Multimédia',
        autre: 'Autre',
    };
    return categoryMap[category] || category;
}