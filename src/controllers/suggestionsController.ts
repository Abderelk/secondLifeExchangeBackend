// src/controllers/suggestionsController.ts

import { Response } from 'express';
import { AuthRequest } from '../types';
import { generateSuggestions, UserContext, SeasonContext } from '../services/aiService';
import Item from '../models/item';
import Exchange from '../models/exchange';
import WeeklyTheme from '../models/weeklyTheme';
import User from '../models/User';

// Obtenir les suggestions personnalisées
export const getPersonalizedSuggestions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ success: false, message: 'Non autorisé' });
            return;
        }

        // Récupérer l'utilisateur
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
            return;
        }

        // Récupérer les catégories likées par l'utilisateur
        const likedItems = await Item.find({ likes: userId }).select('category');
        const likedCategories = [...new Set(likedItems.map(item => item.category))];

        // Récupérer les échanges complétés
        const exchangesCompleted = await Exchange.countDocuments({
            $or: [{ requester: userId }, { owner: userId }],
            status: 'completed',
        });

        // Récupérer le nombre d'objets proposés
        const itemsProposed = await Item.countDocuments({ owner: userId });

        // Construire le contexte utilisateur
        const userContext: UserContext = {
            firstName: user.firstName,
            city: user.address?.city,
            interests: user.interests || [],
            likedCategories,
            searchHistory: [], // TODO: implémenter l'historique de recherche
            itemsProposed,
            exchangesCompleted,
        };

        // Récupérer le thème de la semaine
        const now = new Date();
        const weeklyTheme = await WeeklyTheme.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true,
        });

        // Compter les objets disponibles à proximité
        const userCity = user.address?.city;
        let availableItemsNearby = 0;
        if (userCity) {
            availableItemsNearby = await Item.countDocuments({
                status: 'available',
                'location.city': { $regex: userCity, $options: 'i' },
                owner: { $ne: userId },
            });
        } else {
            availableItemsNearby = await Item.countDocuments({
                status: 'available',
                owner: { $ne: userId },
            });
        }

        // Déterminer la saison
        const month = new Date().getMonth();
        let season = 'hiver';
        if (month >= 2 && month <= 4) season = 'printemps';
        else if (month >= 5 && month <= 7) season = 'été';
        else if (month >= 8 && month <= 10) season = 'automne';

        // Construire le contexte saisonnier
        const seasonContext: SeasonContext = {
            season,
            weeklyTheme: weeklyTheme?.title || "Vêtements d'hiver",
            weeklyThemeEmoji: weeklyTheme?.emoji || '🧥',
            availableItemsNearby,
        };

        // Générer les suggestions via l'IA
        const suggestions = await generateSuggestions(userContext, seasonContext);

        // Récupérer des objets recommandés basés sur les catégories
        interface PopulatedItem {
            _id: unknown;
            images?: string[];
            category: string;
            title: string;
            description?: string;
            owner?: { firstName?: string; lastName?: string };
            location?: { city?: string };
            likesCount?: number;
            likes?: { toString: () => string }[];
        }

        let recommendedItems: PopulatedItem[] = [];
        if (suggestions.recommendedCategories.length > 0) {
            recommendedItems = await Item.find({
                status: 'available',
                category: { $in: suggestions.recommendedCategories },
                owner: { $ne: userId },
            })
                .populate('owner', 'firstName lastName')
                .sort({ createdAt: -1 })
                .limit(6)
                .lean() as PopulatedItem[];
        }

        // Si pas assez d'items, compléter avec les plus récents
        if (recommendedItems.length < 3) {
            const additionalItems = await Item.find({
                status: 'available',
                owner: { $ne: userId },
                _id: { $nin: recommendedItems.map((item) => item._id) },
            })
                .populate('owner', 'firstName lastName')
                .sort({ likesCount: -1, createdAt: -1 })
                .limit(6 - recommendedItems.length)
                .lean() as PopulatedItem[];

            recommendedItems = [...recommendedItems, ...additionalItems];
        }

        // Formater les items pour le frontend
        const formattedItems = recommendedItems.map((item) => ({
            id: item._id?.toString(),
            image: item.images?.[0] || 'https://via.placeholder.com/300',
            category: item.category,
            title: item.title,
            description: item.description?.substring(0, 60) + '...',
            ownerName: item.owner ? `${item.owner.firstName || ''} ${item.owner.lastName?.charAt(0) || ''}.` : 'Anonyme',
            location: item.location?.city || 'France',
            likes: item.likesCount || 0,
            isLiked: item.likes?.some((id) => id.toString() === userId) || false,
        }));

        res.json({
            success: true,
            data: {
                ...suggestions,
                recommendedItems: formattedItems,
                context: {
                    season,
                    weeklyTheme: seasonContext.weeklyTheme,
                    weeklyThemeEmoji: seasonContext.weeklyThemeEmoji,
                },
            },
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur getPersonalizedSuggestions:', err.message);
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};

// Endpoint simple pour tester l'IA
export const testAI = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const testContext: UserContext = {
            firstName: 'Test',
            city: 'Paris',
            interests: [],
            likedCategories: ['vêtements', 'livres'],
            searchHistory: ['pull', 'roman'],
            itemsProposed: 2,
            exchangesCompleted: 1,
        };

        const seasonContext: SeasonContext = {
            season: 'hiver',
            weeklyTheme: "Vêtements d'hiver",
            weeklyThemeEmoji: '🧥',
            availableItemsNearby: 15,
        };

        const suggestions = await generateSuggestions(testContext, seasonContext);

        res.json({
            success: true,
            data: suggestions,
        });
    } catch (error: unknown) {
        const err = error as Error;
        res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
    }
};