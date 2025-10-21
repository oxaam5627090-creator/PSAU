import { pool } from '../db.js';
import { buildPrompt } from '../utils/promptBuilder.js';
import { callOllama } from '../utils/ollamaClient.js';
import { summarizeConversation } from '../utils/summarizer.js';
import { config } from '../config.js';

export async function createChat(req, res) {
  try {
    const { userId } = req.user;
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const systemPrompt = buildPrompt({
      userName: user.name,
      userCollege: user.college,
      userSchedule: user.schedule,
      userPersonalInfo: user.personal_info,
    });

    const payload = {
      model: config.ollama.model,
      prompt: `${systemPrompt}\n\nUser: ${message}\nAssistant:`,
      stream: false,
    };

    const response = await callOllama(payload);

    const assistantMessage = response.message ?? response.response ?? '';

    const [result] = await pool.query(
      'INSERT INTO chats (user_id, messages, summary) VALUES (?, ?, ?)',
      [
        userId,
        JSON.stringify([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message, attachments: attachments || [] },
          { role: 'assistant', content: assistantMessage },
        ]),
        null,
      ]
    );

    return res.json({
      chatId: result.insertId,
      message: assistantMessage,
    });
  } catch (error) {
    console.error('createChat error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

export async function continueChat(req, res) {
  try {
    const { chatId } = req.params;
    const { message } = req.body;
    const { userId } = req.user;

    const [[chat]] = await pool.query(
      'SELECT * FROM chats WHERE id = ? AND user_id = ?',
      [chatId, userId]
    );

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const history = JSON.parse(chat.messages);
    history.push({ role: 'user', content: message });

    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const systemPrompt = buildPrompt({
      userName: user.name,
      userCollege: user.college,
      userSchedule: user.schedule,
      userPersonalInfo: user.personal_info,
      basePrompt: history[0]?.content,
    });

    history[0] = { role: 'system', content: systemPrompt };

    const prompt = history
      .map((entry) => `${entry.role === 'user' ? 'User' : entry.role === 'assistant' ? 'Assistant' : 'System'}: ${entry.content}`)
      .join('\n');

    const response = await callOllama({
      model: config.ollama.model,
      prompt: `${prompt}\nAssistant:`,
      stream: false,
    });

    const assistantMessage = response.message ?? response.response ?? '';
    history.push({ role: 'assistant', content: assistantMessage });

    const summary = await summarizeConversation(history);

    await pool.query('UPDATE chats SET messages = ?, summary = ? WHERE id = ?', [
      JSON.stringify(history),
      summary,
      chatId,
    ]);

    await pool.query('UPDATE users SET personal_info = ? WHERE id = ?', [
      updatePersonalInfo(user.personal_info, history),
      userId,
    ]);

    return res.json({ message: assistantMessage });
  } catch (error) {
    console.error('continueChat error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function updatePersonalInfo(personalInfo, history) {
  const info = personalInfo ? JSON.parse(personalInfo) : {};
  const newFacts = history
    .filter((entry) => entry.role === 'user')
    .map((entry) => entry.content)
    .filter((content) => content.includes('دكتور') || content.includes('مستشار'));

  if (newFacts.length > 0) {
    info.facts = Array.from(new Set([...(info.facts || []), ...newFacts])).slice(-5);
  }

  return JSON.stringify(info);
}
