// src/routes/suggestionsRoutes.ts

import express from 'express';
import { getPersonalizedSuggestions, testAI } from '../controllers/suggestionsController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Route protégée - suggestions personnalisées
router.get('/', protect, getPersonalizedSuggestions);

// Route de test (protégée aussi)
router.get('/test', protect, testAI);

export default router;