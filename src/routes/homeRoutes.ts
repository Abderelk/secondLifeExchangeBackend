// src/routes/homeRoutes.ts

import express from 'express';
import {
    getHomeData,
    getWeeklyTheme,
    getHomeStats,
    getAllThemes,
    createWeeklyTheme,
} from '../controllers/homeController';
import { protect, optionalAuth, isAdmin } from '../middleware/auth';

const router = express.Router();

// Routes publiques (ou semi-protégées pour avoir les likes)
router.get('/', optionalAuth, getHomeData);
router.get('/theme', getWeeklyTheme);
router.get('/stats', getHomeStats);
router.get('/themes', getAllThemes);

// Routes admin
router.post('/themes', protect, isAdmin, createWeeklyTheme);

export default router;