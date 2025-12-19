// src/routes/itemRoutes.ts

import express from 'express';
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  toggleLike,
  getUserItems,
} from '../controllers/itemController';
import { protect } from '../middleware/auth';

const router = express.Router();

// Routes publiques
router.get('/', getItems);
router.get('/:id', getItemById);
router.get('/user/:userId', getUserItems);

// Routes protégées
router.post('/', protect, createItem);
router.put('/:id', protect, updateItem);
router.delete('/:id', protect, deleteItem);
router.post('/:id/like', protect, toggleLike);

export default router;