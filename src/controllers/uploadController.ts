// src/controllers/uploadController.ts

import { Response } from 'express';
import { uploadImage, uploadMultipleImages, deleteImage } from '../services/uploadService';
import { AuthRequest } from '../types';

/**
 * Upload une seule image
 * POST /api/upload/image
 */
export const uploadSingleImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ success: false, message: 'Aucune image fournie' });
            return;
        }

        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Non authentifié' });
            return;
        }

        const result = await uploadImage(req.file.buffer, req.file.originalname, userId);

        res.json({
            success: true,
            data: {
                urls: result,
                // URL principale à utiliser (medium est un bon compromis)
                url: result.medium,
            },
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur upload image:', err.message);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'upload', error: err.message });
    }
};

/**
 * Upload plusieurs images (max 5)
 * POST /api/upload/images
 */
export const uploadImages = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({ success: false, message: 'Aucune image fournie' });
            return;
        }

        if (files.length > 5) {
            res.status(400).json({ success: false, message: 'Maximum 5 images autorisées' });
            return;
        }

        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ success: false, message: 'Non authentifié' });
            return;
        }

        const results = await uploadMultipleImages(files, userId);

        res.json({
            success: true,
            data: {
                images: results,
                // URLs principales (medium)
                urls: results.map((r: { medium: string }) => r.medium),
            },
        });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur upload images:', err.message);
        res.status(500).json({ success: false, message: 'Erreur lors de l\'upload', error: err.message });
    }
};

/**
 * Supprimer une image
 * DELETE /api/upload/image
 */
export const deleteSingleImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            res.status(400).json({ success: false, message: 'URL de l\'image requise' });
            return;
        }

        await deleteImage(imageUrl);

        res.json({ success: true, message: 'Image supprimée' });
    } catch (error: unknown) {
        const err = error as Error;
        console.error('❌ Erreur suppression image:', err.message);
        res.status(500).json({ success: false, message: 'Erreur lors de la suppression', error: err.message });
    }
};