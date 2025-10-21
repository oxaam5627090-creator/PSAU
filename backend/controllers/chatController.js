const pool = require('../db');
const authenticate = require('../utils/authMiddleware');
const { getUserContext, buildSystemPrompt, extractMemoriesFromMessage, updateUserPersonalInfo } = require('../utils/memory');
const { generateChatCompletion } = require('../utils/ollamaClient');

async function getChats(req, res) {
  try {
    const [rows] = await pool.execute('SELECT id, summary, created_at FROM chats WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'تعذّر جلب المحادثات' });
  }
}

async function getChatById(req, res) {
  const { chatId } = req.params;
  try {
    const [[chat]] = await pool.execute('SELECT id, messages FROM chats WHERE id = ? AND user_id = ?', [chatId, req.userId]);
    if (!chat) {
      return res.status(404).json({ message: 'المحادثة غير موجودة' });
    }
    const messages = typeof chat.messages === 'string' ? JSON.parse(chat.messages) : chat.messages;
    res.json({ id: chat.id, messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'خطأ أثناء جلب المحادثة' });
  }
}

async function deleteChat(req, res) {
  const { chatId } = req.params;
  try {
    await pool.execute('DELETE FROM chats WHERE id = ? AND user_id = ?', [chatId, req.userId]);
    res.json({ message: 'تم حذف المحادثة' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'تعذّر حذف المحادثة' });
  }
}

async function createChatCompletion(req, res) {
  const { chatId, message, history = [] } = req.body;
  if (!message) {
    return res.status(400).json({ message: 'الرسالة مطلوبة' });
  }

  try {
    const context = await getUserContext(req.userId);
    const systemPrompt = buildSystemPrompt(context);

    const ollamaMessages = [
      ...history,
      { role: 'user', content: message }
    ];

    const answer = await generateChatCompletion({ systemPrompt, messages: ollamaMessages });

    const summary = answer.slice(0, 200);
    const newMemory = extractMemoriesFromMessage(message);
    await updateUserPersonalInfo(req.userId, newMemory);

    const updatedHistory = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: answer }
    ];

    if (chatId) {
      await pool.execute(
        'UPDATE chats SET messages = ?, summary = ?, created_at = NOW() WHERE id = ? AND user_id = ?',
        [JSON.stringify(updatedHistory), summary, chatId, req.userId]
      );
      res.json({ chatId, answer });
    } else {
      const [result] = await pool.execute(
        'INSERT INTO chats (user_id, messages, summary, created_at) VALUES (?, ?, ?, NOW())',
        [req.userId, JSON.stringify(updatedHistory), summary]
      );
      res.json({ chatId: result.insertId, answer });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'حدث خطأ أثناء الدردشة' });
  }
}

module.exports = {
  getChats,
  getChatById,
  deleteChat,
  createChatCompletion
};
