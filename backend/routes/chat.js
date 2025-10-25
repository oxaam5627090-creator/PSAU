const { Router } = require('express');
const { authenticate } = require('../utils/authMiddleware');
const { createChat, continueChat, getChat } = require('../controllers/chatController');

const router = Router();

router.post('/', authenticate, createChat);
router.post('/:chatId', authenticate, continueChat);
router.get('/:chatId', authenticate, getChat);

module.exports = router;
