// src/controllers/itemController.ts

import { Request, Response } from 'express';
import Item from '../models/item';
import User from '../models/User';
import { AuthRequest } from '../types';

// Obtenir tous les items (avec filtres et pagination)
export const getItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      city,
      status = 'available',
      sort = '-createdAt',
      page = 1,
      limit = 12,
      search,
    } = req.query;

    // Construire le filtre
    const filter: Record<string, unknown> = { status };

    if (category) {
      filter.category = category;
    }

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Exécuter la requête
    const [items, total] = await Promise.all([
      Item.find(filter)
        .populate('owner', 'firstName lastName avatar address')
        .sort(sort as string)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Item.countDocuments(filter),
    ]);

    // Formater les items pour le frontend
    const formattedItems = items.map((item) => {
      const owner = item.owner as {
        firstName?: string;
        lastName?: string;
        address?: { city?: string };
      };

      return {
        id: item._id,
        image: item.images[0] || 'https://via.placeholder.com/400',
        category: formatCategory(item.category),
        title: item.title,
        description: item.description,
        ownerName: owner
          ? `${owner.firstName || ''} ${(owner.lastName || '').charAt(0)}.`
          : 'Utilisateur',
        location: item.location?.city || owner?.address?.city || 'France',
        likes: item.likesCount,
        isLiked: false, // Sera mis à jour côté frontend si user connecté
      };
    });

    res.json({
      success: true,
      data: formattedItems,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getItems:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message,
    });
  }
};

// Obtenir un item par ID
export const getItemById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await Item.findById(id)
      .populate('owner', 'firstName lastName avatar address phone createdAt')
      .lean();

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Objet non trouvé',
      });
      return;
    }

    // Incrémenter les vues
    await Item.findByIdAndUpdate(id, { $inc: { views: 1 } });

    res.json({
      success: true,
      data: item,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getItemById:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message,
    });
  }
};

// Créer un nouvel item
export const createItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Non autorisé',
      });
      return;
    }

    const { title, description, category, images, condition, location, exchangePreferences } =
      req.body;

    // Récupérer l'utilisateur pour la localisation par défaut
    const user = await User.findById(userId);

    const item = await Item.create({
      title,
      description,
      category,
      images: images || [],
      condition,
      owner: userId,
      location: location || {
        city: user?.address?.city,
        postalCode: user?.address?.postalCode,
      },
      exchangePreferences: exchangePreferences || [],
    });

    // Mettre à jour les stats de l'utilisateur
    await User.findByIdAndUpdate(userId, {
      $inc: { totalObjectsShared: 1 },
    });

    res.status(201).json({
      success: true,
      message: 'Objet créé avec succès ! 🎉',
      data: item,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur createItem:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message,
    });
  }
};

// Mettre à jour un item
export const updateItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const item = await Item.findById(id);

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Objet non trouvé',
      });
      return;
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (item.owner.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "Vous n'êtes pas autorisé à modifier cet objet",
      });
      return;
    }

    const updatedItem = await Item.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      message: 'Objet mis à jour avec succès',
      data: updatedItem,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur updateItem:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message,
    });
  }
};

// Supprimer un item
export const deleteItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const item = await Item.findById(id);

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Objet non trouvé',
      });
      return;
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (item.owner.toString() !== userId) {
      res.status(403).json({
        success: false,
        message: "Vous n'êtes pas autorisé à supprimer cet objet",
      });
      return;
    }

    await Item.findByIdAndDelete(id);

    // Mettre à jour les stats de l'utilisateur
    await User.findByIdAndUpdate(userId, {
      $inc: { totalObjectsShared: -1 },
    });

    res.json({
      success: true,
      message: 'Objet supprimé avec succès',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur deleteItem:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message,
    });
  }
};

// Liker/Unliker un item
export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Non autorisé',
      });
      return;
    }

    const item = await Item.findById(id);

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Objet non trouvé',
      });
      return;
    }

    const userObjectId = new (require('mongoose').Types.ObjectId)(userId);
    const isLiked = item.likes.some((likeId) => likeId.equals(userObjectId));

    if (isLiked) {
      // Retirer le like
      await Item.findByIdAndUpdate(id, {
        $pull: { likes: userObjectId },
        $inc: { likesCount: -1 },
      });
    } else {
      // Ajouter le like
      await Item.findByIdAndUpdate(id, {
        $addToSet: { likes: userObjectId },
        $inc: { likesCount: 1 },
      });
    }

    const updatedItem = await Item.findById(id);

    res.json({
      success: true,
      data: {
        isLiked: !isLiked,
        likesCount: updatedItem?.likesCount || 0,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur toggleLike:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message,
    });
  }
};

// Obtenir les items d'un utilisateur
export const getUserItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    const filter: Record<string, unknown> = { owner: userId };
    if (status) {
      filter.status = status;
    }

    const items = await Item.find(filter).sort('-createdAt').lean();

    res.json({
      success: true,
      data: items,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getUserItems:', err.message);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: err.message,
    });
  }
};

// Helper pour formater les catégories
function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    vêtements: 'Vêtements',
    électronique: 'Électronique',
    livres: 'Livres',
    meubles: 'Meubles',
    décoration: 'Décoration',
    jouets: 'Jouets',
    sport: 'Sport',
    outils: 'Outils',
    cuisine: 'Cuisine',
    jardin: 'Jardin',
    multimédia: 'Multimédia',
    autre: 'Autre',
  };
  return categoryMap[category] || category;
}