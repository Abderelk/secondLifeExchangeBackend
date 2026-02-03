// src/routes/themeRoutes.ts

import express from 'express';
import {
    getCurrentTheme,
    getThemeCalendar,
    getUpcomingThemes,
    createTheme,
    updateTheme,
    deleteTheme,
    sendThemeNotifications,
    updateNotificationPreferences,
    getNotificationPreferences,
} from '../controllers/themeController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Routes publiques
router.get('/current', getCurrentTheme);
router.get('/calendar', getThemeCalendar);
router.get('/upcoming', getUpcomingThemes);

// Routes protégées (utilisateur connecté)
router.get('/notifications/preferences', protect, getNotificationPreferences);
router.put('/notifications/preferences', protect, updateNotificationPreferences);

// Routes admin
router.post('/', protect, createTheme);
router.put('/:id', protect, updateTheme);
router.delete('/:id', protect, deleteTheme);
router.post('/:themeId/notify', protect, sendThemeNotifications);

export default router;