// src/routes/uploadRoutes.ts

import express, { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import { protect } from '../middleware/auth';
import { uploadSingleImage, uploadImages, deleteSingleImage } from '../controllers/uploadController';

const router = express.Router();

// Configuration Multer (stockage en mémoire pour traitement avec Sharp)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB max par fichier
        files: 5, // Max 5 fichiers
    },
    fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
        // Accepter uniquement les images
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Format d\'image non supporté. Utilisez JPG, PNG, GIF ou WebP.'));
        }
    },
});

// Routes
// POST /api/upload/image - Upload une seule image
router.post('/image', protect, upload.single('image'), uploadSingleImage);

// POST /api/upload/images - Upload plusieurs images (max 5)
router.post('/images', protect, upload.array('images', 5), uploadImages);

// DELETE /api/upload/image - Supprimer une image
router.delete('/image', protect, deleteSingleImage);

// Gestion des erreurs Multer
router.use((err: Error | multer.MulterError, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, message: 'Fichier trop volumineux (max 10 MB)' });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ success: false, message: 'Trop de fichiers (max 5)' });
        }
        return res.status(400).json({ success: false, message: err.message });
    }

    if (err.message.includes('Format d\'image')) {
        return res.status(400).json({ success: false, message: err.message });
    }

    return res.status(500).json({ success: false, message: 'Erreur serveur' });
});

export default router;