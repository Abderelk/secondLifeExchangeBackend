// src/services/cronService.ts

import cron from 'node-cron';
import WeeklyTheme from '../models/weeklyTheme';
import User from '../models/User';
import { sendThemeNotificationEmail, sendThemeEndingReminderEmail } from './notificationsService';

// Fonction pour envoyer les notifications de nouveau thème
const notifyNewTheme = async (): Promise<void> => {
    try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        // Trouver le thème qui commence aujourd'hui
        const newTheme = await WeeklyTheme.findOne({
            startDate: { $gte: startOfToday, $lte: endOfToday },
            isActive: true,
        });

        if (!newTheme) {
            console.log('📅 Pas de nouveau thème qui commence aujourd\'hui');
            return;
        }

        console.log(`🎉 Nouveau thème détecté: ${newTheme.title}`);

        // Trouver les utilisateurs à notifier
        const usersToNotify = await User.find({
            'notifications.email': true,
            'notifications.weeklyTheme': true,
        }).select('email firstName');

        console.log(`📧 Envoi des notifications à ${usersToNotify.length} utilisateurs...`);

        let sent = 0;
        let failed = 0;

        for (const user of usersToNotify) {
            try {
                await sendThemeNotificationEmail(user, newTheme);
                sent++;
                // Petite pause pour éviter de surcharger le serveur SMTP
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                console.error(`❌ Erreur envoi à ${user.email}:`, err);
                failed++;
            }
        }

        console.log(`✅ Notifications envoyées: ${sent} succès, ${failed} échecs`);
    } catch (error) {
        console.error('❌ Erreur dans notifyNewTheme:', error);
    }
};

// Fonction pour envoyer les rappels de fin de thème
const notifyThemeEnding = async (): Promise<void> => {
    try {
        const now = new Date();

        // Trouver le thème actuel
        const currentTheme = await WeeklyTheme.findOne({
            startDate: { $lte: now },
            endDate: { $gte: now },
            isActive: true,
        });

        if (!currentTheme) {
            console.log('📅 Pas de thème actif actuellement');
            return;
        }

        // Calculer les jours restants
        const endDate = new Date(currentTheme.endDate);
        const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Envoyer un rappel seulement si il reste 1 ou 2 jours
        if (daysRemaining > 2) {
            console.log(`📅 Thème "${currentTheme.title}" - ${daysRemaining} jours restants (pas de rappel)`);
            return;
        }

        console.log(`⏰ Rappel de fin de thème: ${currentTheme.title} (${daysRemaining} jour(s) restant(s))`);

        // Trouver les utilisateurs à notifier
        const usersToNotify = await User.find({
            'notifications.email': true,
            'notifications.weeklyTheme': true,
        }).select('email firstName');

        console.log(`📧 Envoi des rappels à ${usersToNotify.length} utilisateurs...`);

        let sent = 0;

        for (const user of usersToNotify) {
            try {
                await sendThemeEndingReminderEmail(user, currentTheme, daysRemaining);
                sent++;
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (err) {
                console.error(`❌ Erreur envoi rappel à ${user.email}:`, err);
            }
        }

        console.log(`✅ Rappels envoyés: ${sent}`);
    } catch (error) {
        console.error('❌ Erreur dans notifyThemeEnding:', error);
    }
};

// Activer automatiquement les thèmes dont la date de début est atteinte
const activateThemes = async (): Promise<void> => {
    try {
        const now = new Date();

        // Désactiver les thèmes expirés
        await WeeklyTheme.updateMany(
            {
                endDate: { $lt: now },
                isActive: true,
            },
            { isActive: false }
        );

        // Activer les thèmes dont la période a commencé
        const result = await WeeklyTheme.updateMany(
            {
                startDate: { $lte: now },
                endDate: { $gte: now },
                isActive: false,
            },
            { isActive: true }
        );

        if (result.modifiedCount > 0) {
            console.log(`✅ ${result.modifiedCount} thème(s) activé(s) automatiquement`);
        }
    } catch (error) {
        console.error('❌ Erreur dans activateThemes:', error);
    }
};

// Initialiser les tâches cron
export const initCronJobs = (): void => {
    console.log('⏰ Initialisation des tâches cron...');

    // Vérifier et activer les thèmes toutes les heures
    cron.schedule('0 * * * *', async () => {
        console.log('⏰ [CRON] Vérification des thèmes...');
        await activateThemes();
    });

    // Envoyer les notifications de nouveau thème tous les lundis à 8h
    cron.schedule('0 8 * * 1', async () => {
        console.log('⏰ [CRON] Vérification nouveau thème (lundi 8h)...');
        await notifyNewTheme();
    });

    // Envoyer les rappels de fin de thème tous les jours à 10h
    cron.schedule('0 10 * * *', async () => {
        console.log('⏰ [CRON] Vérification rappel fin de thème...');
        await notifyThemeEnding();
    });

    console.log('✅ Tâches cron initialisées:');
    console.log('   - Activation thèmes: toutes les heures');
    console.log('   - Notification nouveau thème: lundi 8h');
    console.log('   - Rappel fin de thème: tous les jours 10h');
};

// Fonctions exportées pour les tests manuels
export const runManualNotification = notifyNewTheme;
export const runManualReminder = notifyThemeEnding;
export const runActivateThemes = activateThemes;

export default {
    initCronJobs,
    runManualNotification,
    runManualReminder,
    runActivateThemes,
};