import { Router } from 'express';
import { getUsers, createUser, getUserById } from '../controllers/userController';

const router = Router();

router.get('/', getUsers);
router.post('/', createUser);
router.get('/:id', getUserById);

export default router;