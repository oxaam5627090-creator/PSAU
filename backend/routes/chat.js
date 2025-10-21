const express = require('express');
const authenticate = require('../utils/authMiddleware');
const { getChats, getChatById, deleteChat, createChatCompletion } = require('../controllers/chatController');

const router = express.Router();

router.use(authenticate);
router.get('/', getChats);
router.get('/:chatId', getChatById);
router.delete('/:chatId', deleteChat);
router.post('/', createChatCompletion);

module.exports = router;
