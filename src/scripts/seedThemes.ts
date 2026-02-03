// src/scripts/seedThemes.ts
// Exécuter avec: npx ts-node src/scripts/seedThemes.ts

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

import WeeklyTheme from '../models/weeklyTheme';

const MONGODB_URI = process.env.MONGODB_URI || '';

// Fonction pour obtenir le lundi d'une semaine donnée
const getMonday = (weeksFromNow: number): Date => {
    const now = new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Ajuster si dimanche
    const monday = new Date(now.setDate(diff));
    monday.setDate(monday.getDate() + (weeksFromNow * 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
};

// Fonction pour obtenir le dimanche d'une semaine
const getSunday = (monday: Date): Date => {
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return sunday;
};

const themes = [
    {
        title: "Mode d'Hiver",
        emoji: '🧥',
        description: "Échangez vos vêtements d'hiver : manteaux, pulls, écharpes et bonnets pour rester au chaud !",
        categories: ['vêtements'],
        weeksFromNow: -2,
    },
    {
        title: 'Tech & Gadgets',
        emoji: '📱',
        description: "Donnez une seconde vie à vos appareils électroniques, accessoires et gadgets tech !",
        categories: ['électronique', 'multimédia'],
        weeksFromNow: -1,
    },
    {
        title: 'Lecture & Culture',
        emoji: '📚',
        description: "Partagez vos livres, BD, mangas et magazines préférés avec la communauté !",
        categories: ['livres', 'multimédia'],
        weeksFromNow: 0, // Semaine actuelle
    },
    {
        title: 'Maison & Déco',
        emoji: '🏠',
        description: "Échangez vos objets de décoration, meubles et accessoires pour la maison !",
        categories: ['meubles', 'décoration'],
        weeksFromNow: 1,
    },
    {
        title: 'Sport & Bien-être',
        emoji: '⚽',
        description: "Équipements sportifs, accessoires de fitness et articles de bien-être vous attendent !",
        categories: ['sport'],
        weeksFromNow: 2,
    },
    {
        title: 'Jouets & Enfants',
        emoji: '🧸',
        description: "Faites plaisir aux enfants en échangeant jouets, jeux et articles pour les petits !",
        categories: ['jouets'],
        weeksFromNow: 3,
    },
    {
        title: 'Cuisine & Gourmandise',
        emoji: '🍳',
        description: "Ustensiles de cuisine, électroménager et accessoires culinaires à échanger !",
        categories: ['cuisine', 'électronique'],
        weeksFromNow: 4,
    },
    {
        title: 'Jardin & Extérieur',
        emoji: '🌱',
        description: "Outils de jardinage, plantes, pots et mobilier d'extérieur pour les amoureux du vert !",
        categories: ['jardin', 'outils'],
        weeksFromNow: 5,
    },
    {
        title: 'Bricolage & DIY',
        emoji: '🔧',
        description: "Outils, matériaux et équipements pour vos projets de bricolage !",
        categories: ['outils'],
        weeksFromNow: 6,
    },
    {
        title: 'Tout est permis !',
        emoji: '🎉',
        description: "Semaine spéciale : toutes les catégories sont mises à l'honneur !",
        categories: ['vêtements', 'électronique', 'livres', 'meubles', 'décoration', 'jouets', 'sport', 'outils', 'cuisine', 'jardin', 'multimédia', 'autre'],
        weeksFromNow: 7,
    },
];

async function seedThemes() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connecté à MongoDB');

        // Supprimer les anciens thèmes (optionnel)
        const deleteExisting = process.argv.includes('--clean');
        if (deleteExisting) {
            await WeeklyTheme.deleteMany({});
            console.log('🗑️ Anciens thèmes supprimés');
        }

        console.log('\n📅 Création des thèmes...\n');

        for (const themeData of themes) {
            const monday = getMonday(themeData.weeksFromNow);
            const sunday = getSunday(monday);

            // Vérifier si un thème existe déjà pour cette période
            const existing = await WeeklyTheme.findOne({
                startDate: monday,
            });

            if (existing) {
                console.log(`⏭️  "${themeData.title}" existe déjà pour la semaine du ${monday.toLocaleDateString('fr-FR')}`);
                continue;
            }

            const theme = await WeeklyTheme.create({
                title: themeData.title,
                emoji: themeData.emoji,
                description: themeData.description,
                categories: themeData.categories,
                startDate: monday,
                endDate: sunday,
                isActive: themeData.weeksFromNow === 0, // Actif seulement pour la semaine actuelle
            });

            const status = themeData.weeksFromNow < 0 ? '(passé)' : themeData.weeksFromNow === 0 ? '(actuel) ✅' : '(à venir)';
            console.log(`${themeData.emoji} "${theme.title}" - ${monday.toLocaleDateString('fr-FR')} au ${sunday.toLocaleDateString('fr-FR')} ${status}`);
        }

        console.log('\n✅ Thèmes créés avec succès !');

        // Afficher un résumé
        const total = await WeeklyTheme.countDocuments();
        const active = await WeeklyTheme.countDocuments({ isActive: true });
        console.log(`\n📊 Résumé: ${total} thèmes au total, ${active} actif(s)`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Erreur:', error);
        process.exit(1);
    }
}

seedThemes();