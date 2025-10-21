import { Router } from 'express';
import { authenticate } from '../utils/authMiddleware.js';
import { createChat, continueChat } from '../controllers/chatController.js';

const router = Router();

router.post('/', authenticate, createChat);
router.post('/:chatId', authenticate, continueChat);

export default router;
