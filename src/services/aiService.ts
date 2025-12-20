// src/services/aiService.ts

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialiser Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface UserContext {
    firstName: string;
    city?: string;
    interests?: string[];
    likedCategories: string[];
    searchHistory: string[];
    itemsProposed: number;
    exchangesCompleted: number;
}

export interface SeasonContext {
    season: string;
    weeklyTheme: string;
    weeklyThemeEmoji: string;
    availableItemsNearby: number;
}

export interface AISuggestions {
    greeting: string;
    suggestionsToPropose: string[];
    reasonToPropose: string;
    recommendedCategories: string[];
    reasonForRecommendation: string;
    tip: string;
}

// Déterminer la saison actuelle
function getCurrentSeason(): string {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'printemps';
    if (month >= 5 && month <= 7) return 'été';
    if (month >= 8 && month <= 10) return 'automne';
    return 'hiver';
}

// Générer les suggestions personnalisées
export async function generateSuggestions(
    userContext: UserContext,
    seasonContext: SeasonContext
): Promise<AISuggestions> {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        const prompt = `Tu es un assistant pour une plateforme d'échange d'objets de seconde main appelée "SecondLife Exchange". 
Tu dois générer des suggestions personnalisées pour un utilisateur.

CONTEXTE UTILISATEUR:
- Prénom: ${userContext.firstName}
- Ville: ${userContext.city || 'Non spécifiée'}
- Catégories likées: ${userContext.likedCategories.join(', ') || 'Aucune encore'}
- Recherches récentes: ${userContext.searchHistory.join(', ') || 'Aucune'}
- Objets déjà proposés: ${userContext.itemsProposed}
- Échanges réalisés: ${userContext.exchangesCompleted}

CONTEXTE SAISONNIER:
- Saison: ${seasonContext.season}
- Thème de la semaine: ${seasonContext.weeklyTheme} ${seasonContext.weeklyThemeEmoji}
- Objets disponibles à proximité: ${seasonContext.availableItemsNearby}

INSTRUCTIONS:
Génère une réponse JSON avec cette structure exacte (sans markdown, juste le JSON):
{
  "greeting": "Message d'accueil personnalisé court avec le prénom et un emoji",
  "suggestionsToPropose": ["3 suggestions d'objets que l'utilisateur pourrait proposer en échange, adaptées à la saison et au thème"],
  "reasonToPropose": "Courte explication de pourquoi ces suggestions (1 phrase)",
  "recommendedCategories": ["3 catégories d'objets qui pourraient intéresser l'utilisateur basé sur ses goûts"],
  "reasonForRecommendation": "Courte explication basée sur les likes/recherches (1 phrase)",
  "tip": "Un conseil rapide et encourageant pour l'utilisateur"
}

Sois chaleureux, utilise des emojis avec modération, et reste concis. Réponds UNIQUEMENT avec le JSON, sans backticks ni formatage markdown.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parser la réponse JSON
        try {
            // Nettoyer la réponse (enlever les backticks si présents)
            const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            const suggestions = JSON.parse(cleanedText) as AISuggestions;
            return suggestions;
        } catch (parseError) {
            console.error('Erreur parsing JSON Gemini:', parseError);
            console.error('Réponse brute:', text);

            // Retourner des suggestions par défaut
            return getDefaultSuggestions(userContext, seasonContext);
        }
    } catch (error) {
        console.error('Erreur appel Gemini:', error);
        return getDefaultSuggestions(userContext, seasonContext);
    }
}

// Suggestions par défaut en cas d'erreur
function getDefaultSuggestions(
    userContext: UserContext,
    seasonContext: SeasonContext
): AISuggestions {
    const season = getCurrentSeason();

    const seasonalSuggestions: Record<string, string[]> = {
        hiver: ['Des manteaux que tu ne portes plus', 'Des pulls de l\'année dernière', 'Des décorations de Noël'],
        printemps: ['Des vêtements d\'hiver à ranger', 'Du matériel de jardinage', 'Des livres lus pendant l\'hiver'],
        été: ['Des vêtements légers en double', 'Des jeux de plage', 'Des accessoires de vacances'],
        automne: ['Des vêtements d\'été', 'Des fournitures scolaires', 'Des équipements sportifs'],
    };

    return {
        greeting: `Bonjour ${userContext.firstName} ! 👋`,
        suggestionsToPropose: seasonalSuggestions[season] || seasonalSuggestions.hiver,
        reasonToPropose: `C'est ${season === 'hiver' ? 'l\'hiver' : 'le ' + season} et le thème de la semaine est "${seasonContext.weeklyTheme}" !`,
        recommendedCategories: userContext.likedCategories.length > 0
            ? userContext.likedCategories.slice(0, 3)
            : ['vêtements', 'livres', 'décoration'],
        reasonForRecommendation: userContext.likedCategories.length > 0
            ? `Basé sur tes ${userContext.likedCategories.length} catégories préférées`
            : 'Découvre les catégories populaires du moment',
        tip: userContext.exchangesCompleted === 0
            ? '💡 Propose ton premier objet pour commencer à échanger !'
            : `🌟 Bravo pour tes ${userContext.exchangesCompleted} échanges réalisés !`,
    };
}

export default {
    generateSuggestions,
    getCurrentSeason,
};