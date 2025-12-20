// src/routes/exchangeRoutes.ts

import express from 'express';
import {
  createExchange,
  getMyExchanges,
  getExchangeById,
  respondToExchange,
  completeExchange,
  cancelExchange,
  getMyItemsForExchange,
} from '../controllers/exchangeController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Toutes les routes sont protégées
router.use(protect);

// Obtenir mes items disponibles pour un échange
router.get('/my-items', getMyItemsForExchange);

// CRUD Exchanges
router.post('/', createExchange);
router.get('/', getMyExchanges);
router.get('/:id', getExchangeById);

// Actions sur un échange
router.post('/:id/respond', respondToExchange);
router.post('/:id/complete', completeExchange);
router.post('/:id/cancel', cancelExchange);

export default router;