// src/controllers/exchangeController.ts

import { Response } from 'express';
import Exchange from '../models/exchange';
import Item from '../models/item';
import User from '../models/User';
import { AuthRequest } from '../types';
import Conversation from '../models/conversation';
import Message from '../models/message';


// Créer une proposition d'échange
export const createExchange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Non autorisé' });
      return;
    }

    const { requestedItemId, offeredItemIds, message } = req.body;

    // Vérifier que l'item demandé existe
    const requestedItem = await Item.findById(requestedItemId);
    if (!requestedItem) {
      res.status(404).json({ success: false, message: 'Objet demandé non trouvé' });
      return;
    }

    // Vérifier que l'utilisateur ne demande pas son propre item
    if (requestedItem.owner.toString() === userId) {
      res.status(400).json({ success: false, message: 'Vous ne pouvez pas échanger avec vous-même' });
      return;
    }

    // Vérifier que l'item est disponible
    if (requestedItem.status !== 'available') {
      res.status(400).json({ success: false, message: "Cet objet n'est plus disponible" });
      return;
    }

    // Vérifier que les items offerts appartiennent à l'utilisateur
    if (offeredItemIds && offeredItemIds.length > 0) {
      const offeredItems = await Item.find({
        _id: { $in: offeredItemIds },
        owner: userId,
        status: 'available',
      });

      if (offeredItems.length !== offeredItemIds.length) {
        res.status(400).json({
          success: false,
          message: 'Certains objets proposés ne vous appartiennent pas ou ne sont plus disponibles',
        });
        return;
      }
    }

    // Vérifier qu'il n'y a pas déjà une demande en cours
    const existingExchange = await Exchange.findOne({
      requester: userId,
      requestedItem: requestedItemId,
      status: 'pending',
    });

    if (existingExchange) {
      res.status(400).json({
        success: false,
        message: 'Vous avez déjà une demande en cours pour cet objet',
      });
      return;
    }

    // Créer l'échange
    const exchange = await Exchange.create({
      requester: userId,
      owner: requestedItem.owner,
      requestedItem: requestedItemId,
      offeredItems: offeredItemIds || [],
      message,
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, requestedItem.owner.toString()] },
      itemRequested: requestedItemId,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, requestedItem.owner],
        exchange: exchange._id,
        itemOffered: offeredItemIds && offeredItemIds.length > 0 ? offeredItemIds[0] : null,
        itemRequested: requestedItemId,
        lastmessage: message || "Nouvelle proposition d'échange",
        lastmessageAt: new Date(),
        unreadCount: new Map([
          [requestedItem.owner.toString(), 1],
          [userId, 0],
        ]),
      });

      // Créer le premier message
      if (message) {
        await message.create({
          conversation: conversation._id,
          sender: userId,
          content: message,
        });
      }
    }
    // Populer les données pour la réponse
    const populatedExchange = await Exchange.findById(exchange._id)
      .populate('requester', 'firstName lastName avatar')
      .populate('owner', 'firstName lastName avatar')
      .populate('requestedItem', 'title images')
      .populate('offeredItems', 'title images');

    res.status(201).json({
      success: true,
      message: "Proposition d'échange envoyée ! 🎉",
      data: populatedExchange,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur createExchange:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// Obtenir les échanges de l'utilisateur (envoyés et reçus)
export const getMyExchanges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { type = 'all', status } = req.query;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Non autorisé' });
      return;
    }

    let filter: Record<string, unknown> = {};

    if (type === 'sent') {
      filter.requester = userId;
    } else if (type === 'received') {
      filter.owner = userId;
    } else {
      filter.$or = [{ requester: userId }, { owner: userId }];
    }

    if (status) {
      filter.status = status;
    }

    const exchanges = await Exchange.find(filter)
      .populate('requester', 'firstName lastName avatar')
      .populate('owner', 'firstName lastName avatar')
      .populate('requestedItem', 'title images category condition location')
      .populate('offeredItems', 'title images category condition')
      .sort('-createdAt')
      .lean();

    res.json({
      success: true,
      data: exchanges,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getMyExchanges:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// Obtenir un échange par ID
export const getExchangeById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const exchange = await Exchange.findById(id)
      .populate('requester', 'firstName lastName avatar email')
      .populate('owner', 'firstName lastName avatar email')
      .populate('requestedItem')
      .populate('offeredItems');

    if (!exchange) {
      res.status(404).json({ success: false, message: 'Échange non trouvé' });
      return;
    }

    // Vérifier que l'utilisateur fait partie de l'échange
    if (
      exchange.requester._id.toString() !== userId &&
      exchange.owner._id.toString() !== userId
    ) {
      res.status(403).json({ success: false, message: 'Accès non autorisé' });
      return;
    }

    res.json({
      success: true,
      data: exchange,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getExchangeById:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// Répondre à une proposition d'échange (accepter/refuser)
export const respondToExchange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { action, responsemessage, meetingDetails } = req.body;

    const exchange = await Exchange.findById(id);

    if (!exchange) {
      res.status(404).json({ success: false, message: 'Échange non trouvé' });
      return;
    }

    // Vérifier que c'est le propriétaire qui répond
    if (exchange.owner.toString() !== userId) {
      res.status(403).json({ success: false, message: 'Seul le propriétaire peut répondre' });
      return;
    }

    // Vérifier que l'échange est en attente
    if (exchange.status !== 'pending') {
      res.status(400).json({ success: false, message: 'Cette proposition a déjà été traitée' });
      return;
    }

    if (action === 'accept') {
      exchange.status = 'accepted';

      // Mettre les items en "pending"
      await Item.findByIdAndUpdate(exchange.requestedItem, { status: 'pending' });
      if (exchange.offeredItems.length > 0) {
        await Item.updateMany(
          { _id: { $in: exchange.offeredItems } },
          { status: 'pending' }
        );
      }

      // Ajouter les détails du rendez-vous si fournis
      if (meetingDetails) {
        exchange.meetingDetails = meetingDetails;
      }
    } else if (action === 'reject') {
      exchange.status = 'rejected';
    } else {
      res.status(400).json({ success: false, message: 'Action invalide' });
      return;
    }

    exchange.responseMessage = responsemessage;
    exchange.respondedAt = new Date();
    await exchange.save();

    const populatedExchange = await Exchange.findById(id)
      .populate('requester', 'firstName lastName avatar')
      .populate('owner', 'firstName lastName avatar')
      .populate('requestedItem', 'title images')
      .populate('offeredItems', 'title images');

    res.json({
      success: true,
      message: action === 'accept' ? 'Échange accepté ! 🎉' : 'Échange refusé',
      data: populatedExchange,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur respondToExchange:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// Confirmer l'échange terminé
export const completeExchange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const exchange = await Exchange.findById(id);

    if (!exchange) {
      res.status(404).json({ success: false, message: 'Échange non trouvé' });
      return;
    }

    // Vérifier que l'utilisateur fait partie de l'échange
    if (
      exchange.requester.toString() !== userId &&
      exchange.owner.toString() !== userId
    ) {
      res.status(403).json({ success: false, message: 'Accès non autorisé' });
      return;
    }

    // Vérifier que l'échange est accepté
    if (exchange.status !== 'accepted') {
      res.status(400).json({ success: false, message: "L'échange doit être accepté avant d'être complété" });
      return;
    }

    exchange.status = 'completed';
    await exchange.save();

    // Mettre les items comme échangés
    await Item.findByIdAndUpdate(exchange.requestedItem, { status: 'exchanged' });
    if (exchange.offeredItems.length > 0) {
      await Item.updateMany(
        { _id: { $in: exchange.offeredItems } },
        { status: 'exchanged' }
      );
    }

    // Mettre à jour les stats des utilisateurs
    await User.findByIdAndUpdate(exchange.requester, { $inc: { totalExchanges: 1 } });
    await User.findByIdAndUpdate(exchange.owner, { $inc: { totalExchanges: 1 } });

    res.json({
      success: true,
      message: 'Échange complété avec succès ! 🎉',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur completeExchange:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// Annuler un échange
export const cancelExchange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const exchange = await Exchange.findById(id);

    if (!exchange) {
      res.status(404).json({ success: false, message: 'Échange non trouvé' });
      return;
    }

    // Vérifier que l'utilisateur fait partie de l'échange
    if (
      exchange.requester.toString() !== userId &&
      exchange.owner.toString() !== userId
    ) {
      res.status(403).json({ success: false, message: 'Accès non autorisé' });
      return;
    }

    // On ne peut annuler que si pending ou accepted
    if (!['pending', 'accepted'].includes(exchange.status)) {
      res.status(400).json({ success: false, message: 'Cet échange ne peut plus être annulé' });
      return;
    }

    exchange.status = 'cancelled';
    await exchange.save();

    // Remettre les items comme disponibles
    await Item.findByIdAndUpdate(exchange.requestedItem, { status: 'available' });
    if (exchange.offeredItems.length > 0) {
      await Item.updateMany(
        { _id: { $in: exchange.offeredItems } },
        { status: 'available' }
      );
    }

    res.json({
      success: true,
      message: 'Échange annulé',
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur cancelExchange:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};

// Obtenir les items de l'utilisateur pour proposer un échange
export const getMyItemsForExchange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ success: false, message: 'Non autorisé' });
      return;
    }

    const items = await Item.find({
      owner: userId,
      status: 'available',
    })
      .select('title images category condition')
      .sort('-createdAt')
      .lean();

    res.json({
      success: true,
      data: items,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Erreur getMyItemsForExchange:', err.message);
    res.status(500).json({ success: false, message: 'Erreur serveur', error: err.message });
  }
};