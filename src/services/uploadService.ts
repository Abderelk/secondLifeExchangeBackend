// src/services/uploadService.ts

import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import crypto from 'crypto';

// Configuration GCS
const storage = new Storage({
    // En production sur GCP, les credentials sont automatiques
    // En local, utilise GOOGLE_APPLICATION_CREDENTIALS env variable
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'secondlife-images';
const bucket = storage.bucket(BUCKET_NAME);

// Types
interface UploadResult {
    original: string;
    thumbnail: string;
    medium: string;
}

interface ImageVersions {
    original: { width: number; quality: number };
    medium: { width: number; quality: number };
    thumbnail: { width: number; quality: number };
}

// Configurations des différentes tailles d'images
const IMAGE_VERSIONS: ImageVersions = {
    original: { width: 1200, quality: 85 },
    medium: { width: 600, quality: 80 },
    thumbnail: { width: 300, quality: 75 },
};

/**
 * Upload une image vers GCS avec génération de miniatures
 */
export const uploadImage = async (
    fileBuffer: Buffer,
    originalName: string,
    userId: string
): Promise<UploadResult> => {
    const fileId = crypto.randomUUID();
    const extension = 'webp'; // On convertit tout en WebP pour l'optimisation
    const basePath = `items/${userId}/${fileId}`;

    const results: UploadResult = {
        original: '',
        thumbnail: '',
        medium: '',
    };

    // Générer et uploader chaque version
    const uploadPromises = Object.entries(IMAGE_VERSIONS).map(async ([version, config]) => {
        const fileName = `${basePath}_${version}.${extension}`;

        // Redimensionner et compresser avec Sharp
        const processedBuffer = await sharp(fileBuffer)
            .resize(config.width, null, {
                withoutEnlargement: true, // Ne pas agrandir les petites images
                fit: 'inside',
            })
            .webp({ quality: config.quality })
            .toBuffer();

        // Upload vers GCS
        const file = bucket.file(fileName);
        await file.save(processedBuffer, {
            metadata: {
                contentType: 'image/webp',
                cacheControl: 'public, max-age=31536000', // Cache 1 an
                metadata: {
                    originalName,
                    uploadedBy: userId,
                    version,
                },
            },
        });

        // Rendre le fichier public
        await file.makePublic();

        // URL publique
        const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;
        results[version as keyof UploadResult] = publicUrl;
    });

    await Promise.all(uploadPromises);

    return results;
};

/**
 * Upload multiple images
 */
export const uploadMultipleImages = async (
    files: { buffer: Buffer; originalname: string }[],
    userId: string
): Promise<UploadResult[]> => {
    const uploadPromises = files.map((file) => uploadImage(file.buffer, file.originalname, userId));
    return Promise.all(uploadPromises);
};

/**
 * Supprimer une image et ses versions de GCS
 */
export const deleteImage = async (imageUrl: string): Promise<void> => {
    try {
        // Extraire le chemin du fichier depuis l'URL
        const urlParts = imageUrl.split(`${BUCKET_NAME}/`);
        if (urlParts.length < 2) return;

        const basePath = urlParts[1].replace(/_(?:original|medium|thumbnail)\.webp$/, '');

        // Supprimer toutes les versions
        const deletePromises = Object.keys(IMAGE_VERSIONS).map(async (version) => {
            const fileName = `${basePath}_${version}.webp`;
            try {
                await bucket.file(fileName).delete();
            } catch (error) {
                // Ignorer si le fichier n'existe pas
                console.log(`File ${fileName} not found, skipping...`);
            }
        });

        await Promise.all(deletePromises);
    } catch (error) {
        console.error('Error deleting image:', error);
        throw error;
    }
};

/**
 * Générer une URL signée (pour upload direct depuis le frontend - optionnel)
 */
export const generateSignedUploadUrl = async (
    fileName: string,
    contentType: string
): Promise<string> => {
    const file = bucket.file(fileName);

    const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000, // 15 minutes
        contentType,
    });

    return signedUrl;
};