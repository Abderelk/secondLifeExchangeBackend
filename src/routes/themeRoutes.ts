// BACKEND/src/routes/themeRoutes.ts

import express from 'express';
import {
    getAllThemes,
    getCurrentTheme,
    getCalendar,
    getUpcomingThemes,
    getThemeById,
    createTheme,
    updateTheme,
    deleteTheme,
} from '../controllers/themeController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Routes publiques
router.get('/', getAllThemes);
router.get('/current', getCurrentTheme);
router.get('/calendar', getCalendar);
router.get('/upcoming', getUpcomingThemes);
router.get('/:id', getThemeById);

// Routes admin (protégées)
router.post('/', protect, createTheme);
router.put('/:id', protect, updateTheme);
router.delete('/:id', protect, deleteTheme);

export default router;