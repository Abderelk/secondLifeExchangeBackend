// BACKEND/src/scripts/seedThemes.ts

/**
 * Script de seed pour les thèmes hebdomadaires
 * Usage: npx ts-node src/scripts/seedThemes.ts
 * Avec --clean pour supprimer les anciens thèmes: npx ts-node src/scripts/seedThemes.ts --clean
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import du modèle Theme
import Theme from '../models/theme';

// Connexion à MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI as string);
        console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ Erreur connexion MongoDB:', error);
        process.exit(1);
    }
};

// Helper pour calculer les dates d'une semaine
const getWeekDates = (year: number, weekNumber: number) => {
    // Trouver le premier lundi de l'année
    const jan1 = new Date(year, 0, 1);
    const daysToFirstMonday = (8 - jan1.getDay()) % 7;
    const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

    // Calculer le lundi de la semaine demandée
    const monday = new Date(firstMonday);
    monday.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

    // Le dimanche de cette semaine
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
        startDate: monday,
        endDate: sunday,
    };
};

// Données des thèmes pour 2026
const themesData = [
    // Janvier 2026
    {
        name: 'Vêtements d\'hiver',
        description: 'Manteaux, écharpes, pulls, bonnets - Échangez vos vêtements chauds pour affronter l\'hiver ensemble !',
        icon: '🧥',
        weekNumber: 1,
        year: 2026,
        categories: ['vêtements', 'accessoires', 'mode'],
    },
    {
        name: 'Livres et Magazines',
        description: 'Romans, essais, BD, magazines - Partagez vos lectures et découvrez de nouvelles histoires !',
        icon: '📚',
        weekNumber: 2,
        year: 2026,
        categories: ['livres', 'magazines', 'culture'],
    },
    {
        name: 'Électronique et Tech',
        description: 'Gadgets, câbles, accessoires tech - Donnez une seconde vie à vos appareils électroniques !',
        icon: '💻',
        weekNumber: 3,
        year: 2026,
        categories: ['électronique', 'tech', 'gadgets'],
    },
    {
        name: 'Mobilier et Déco',
        description: 'Meubles, lampes, objets de décoration - Renouvelez votre intérieur de façon responsable !',
        icon: '🪑',
        weekNumber: 4,
        year: 2026,
        categories: ['mobilier', 'décoration', 'maison'],
    },
    // Février 2026
    {
        name: 'Sport et Bien-être',
        description: 'Équipements sportifs, yoga, fitness - Bougez et prenez soin de vous !',
        icon: '⚽',
        weekNumber: 5,
        year: 2026,
        categories: ['sport', 'fitness', 'bien-être'],
    },
    {
        name: 'Saint-Valentin',
        description: 'Bijoux, parfums, cadeaux romantiques - Trouvez le cadeau parfait !',
        icon: '💝',
        weekNumber: 6,
        year: 2026,
        categories: ['cadeaux', 'bijoux', 'romantique'],
    },
    {
        name: 'Cuisine et Gastronomie',
        description: 'Ustensiles, appareils de cuisine, livres de recettes - Pour les passionnés de cuisine !',
        icon: '🍳',
        weekNumber: 7,
        year: 2026,
        categories: ['cuisine', 'ustensiles', 'gastronomie'],
    },
    {
        name: 'Jeux et Jouets',
        description: 'Jeux de société, puzzles, jouets - Partagez des moments de jeu en famille !',
        icon: '🎲',
        weekNumber: 8,
        year: 2026,
        categories: ['jeux', 'jouets', 'famille'],
    },
    // Mars 2026
    {
        name: 'Printemps et Jardinage',
        description: 'Outils de jardin, plantes, pots - Préparez le printemps !',
        icon: '🌱',
        weekNumber: 9,
        year: 2026,
        categories: ['jardin', 'plantes', 'extérieur'],
    },
    {
        name: 'Musique et Instruments',
        description: 'Instruments, vinyles, matériel audio - Pour les mélomanes !',
        icon: '🎸',
        weekNumber: 10,
        year: 2026,
        categories: ['musique', 'instruments', 'audio'],
    },
    {
        name: 'Art et Créativité',
        description: 'Fournitures artistiques, tableaux, créations - Exprimez votre créativité !',
        icon: '🎨',
        weekNumber: 11,
        year: 2026,
        categories: ['art', 'créativité', 'loisirs'],
    },
    {
        name: 'Vêtements de mi-saison',
        description: 'Vestes légères, pulls, chemises - La transition vers le printemps !',
        icon: '🧥',
        weekNumber: 12,
        year: 2026,
        categories: ['vêtements', 'mode', 'mi-saison'],
    },
    // Avril 2026
    {
        name: 'Pâques et Fêtes',
        description: 'Décorations de Pâques, chocolats, cadeaux festifs !',
        icon: '🐰',
        weekNumber: 13,
        year: 2026,
        categories: ['fêtes', 'décoration', 'cadeaux'],
    },
    {
        name: 'Bricolage et Outillage',
        description: 'Outils, matériaux, équipements - Pour les bricoleurs !',
        icon: '🔧',
        weekNumber: 14,
        year: 2026,
        categories: ['bricolage', 'outils', 'maison'],
    },
    {
        name: 'Photographie',
        description: 'Appareils photo, objectifs, accessoires - Capturez vos moments !',
        icon: '📷',
        weekNumber: 15,
        year: 2026,
        categories: ['photo', 'vidéo', 'tech'],
    },
    {
        name: 'Vélos et Mobilité',
        description: 'Vélos, trottinettes, accessoires - Mobilité douce et écologique !',
        icon: '🚲',
        weekNumber: 16,
        year: 2026,
        categories: ['vélo', 'mobilité', 'sport'],
    },
    // Mai 2026
    {
        name: 'Fête des Mères',
        description: 'Bijoux, parfums, cadeaux pour maman !',
        icon: '💐',
        weekNumber: 17,
        year: 2026,
        categories: ['cadeaux', 'bijoux', 'fête'],
    },
    {
        name: 'Plein Air et Camping',
        description: 'Tentes, sacs de couchage, équipement outdoor !',
        icon: '⛺',
        weekNumber: 18,
        year: 2026,
        categories: ['camping', 'outdoor', 'nature'],
    },
    {
        name: 'Bébé et Puériculture',
        description: 'Vêtements bébé, poussettes, jouets d\'éveil !',
        icon: '👶',
        weekNumber: 19,
        year: 2026,
        categories: ['bébé', 'enfants', 'puériculture'],
    },
    {
        name: 'Mode Été',
        description: 'Maillots, shorts, robes d\'été - Préparez l\'été !',
        icon: '👗',
        weekNumber: 20,
        year: 2026,
        categories: ['vêtements', 'été', 'mode'],
    },
    // Juin 2026
    {
        name: 'Fête des Pères',
        description: 'Outils, gadgets, cadeaux pour papa !',
        icon: '👔',
        weekNumber: 21,
        year: 2026,
        categories: ['cadeaux', 'outils', 'fête'],
    },
    {
        name: 'Fête de la Musique',
        description: 'Instruments, vinyles, matériel audio - Célébrez la musique !',
        icon: '🎵',
        weekNumber: 22,
        year: 2026,
        categories: ['musique', 'instruments', 'fête'],
    },
    {
        name: 'Été et Plage',
        description: 'Parasols, serviettes, jeux de plage - Direction la mer !',
        icon: '🏖️',
        weekNumber: 23,
        year: 2026,
        categories: ['plage', 'été', 'vacances'],
    },
    {
        name: 'Vintage et Rétro',
        description: 'Objets vintage, vêtements rétro, déco d\'époque !',
        icon: '📻',
        weekNumber: 24,
        year: 2026,
        categories: ['vintage', 'rétro', 'collection'],
    },
];

// Fonction principale de seed
const seedThemes = async () => {
    await connectDB();

    const cleanMode = process.argv.includes('--clean');

    if (cleanMode) {
        console.log('🧹 Suppression des anciens thèmes...');
        await Theme.deleteMany({});
        console.log('✅ Anciens thèmes supprimés');
    }

    console.log('🌱 Création des thèmes...');

    let created = 0;
    let skipped = 0;

    for (const themeData of themesData) {
        const { weekNumber, year, ...rest } = themeData;
        const { startDate, endDate } = getWeekDates(year, weekNumber);

        // Vérifier si le thème existe déjà
        const existing = await Theme.findOne({
            name: rest.name,
            startDate: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
        });

        if (existing && !cleanMode) {
            console.log(`⏭️  Thème "${rest.name}" existe déjà, ignoré`);
            skipped++;
            continue;
        }

        const theme = await Theme.create({
            ...rest,
            startDate,
            endDate,
        });

        console.log(`✅ Créé: ${theme.name} (Semaine ${weekNumber} - ${theme.dateRange})`);
        created++;
    }

    console.log('\n📊 Résumé:');
    console.log(`   - ${created} thèmes créés`);
    console.log(`   - ${skipped} thèmes ignorés (déjà existants)`);

    // Afficher le thème actuel
    const now = new Date();
    const currentTheme = await Theme.findOne({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
    });

    if (currentTheme) {
        console.log(`\n🎯 Thème actuel: ${currentTheme.icon} ${currentTheme.name}`);
        console.log(`   ${currentTheme.dateRange}`);
    }

    await mongoose.connection.close();
    console.log('\n✅ Seed terminé !');
    process.exit(0);
};

// Exécuter le seed
seedThemes().catch((error) => {
    console.error('❌ Erreur seed:', error);
    process.exit(1);
});