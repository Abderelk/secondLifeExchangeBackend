// src/routes/authRoutes.ts

import express from 'express';
import {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword,
    updateProfile
} from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Routes publiques
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/profile', protect, updateProfile);
// Routes protégées
router.get('/me', protect, getMe);

export default router;