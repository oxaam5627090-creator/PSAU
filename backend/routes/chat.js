const { Router } = require('express');
const { authenticate } = require('../utils/authMiddleware');
const { createChat, continueChat } = require('../controllers/chatController');

const router = Router();

router.post('/', authenticate, createChat);
router.post('/:chatId', authenticate, continueChat);

module.exports = router;
