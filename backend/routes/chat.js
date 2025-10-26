const { Router } = require('express');
const { authenticate } = require('../utils/authMiddleware');
const {
  createChat,
  continueChat,
  getChat,
  listChats,
  deleteChat,
} = require('../controllers/chatController');

const router = Router();

router.get('/', authenticate, listChats);
router.post('/', authenticate, createChat);
router.post('/:chatId', authenticate, continueChat);
router.get('/:chatId', authenticate, getChat);
router.delete('/:chatId', authenticate, deleteChat);

module.exports = router;
