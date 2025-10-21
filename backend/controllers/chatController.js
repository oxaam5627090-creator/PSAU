import { pool } from '../db.js';
import { buildPrompt } from '../utils/promptBuilder.js';
import { streamOllama } from '../utils/ollamaClient.js';
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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const payload = {
      model: config.ollama.model,
      prompt: `${systemPrompt}\n\nUser: ${message}\nAssistant:`,
    };

    let assistantMessage = '';

    await streamOllama(payload, (event) => {
      if (event.response) {
        assistantMessage += event.response;
        res.write(`data: ${JSON.stringify({ token: event.response })}\n\n`);
      }
    });

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

    res.write(
      `data: ${JSON.stringify({ done: true, chatId: result.insertId, message: assistantMessage })}\n\n`
    );
    return res.end();
  } catch (error) {
    console.error('createChat error', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    return res.end();
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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    let assistantMessage = '';

    await streamOllama(
      {
        model: config.ollama.model,
        prompt: `${prompt}\nAssistant:`,
      },
      (event) => {
        if (event.response) {
          assistantMessage += event.response;
          res.write(`data: ${JSON.stringify({ token: event.response })}\n\n`);
        }
      }
    );

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

    res.write(`data: ${JSON.stringify({ done: true, message: assistantMessage })}\n\n`);
    return res.end();
  } catch (error) {
    console.error('continueChat error', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Internal server error' });
    }
    res.write(`data: ${JSON.stringify({ error: 'Internal server error' })}\n\n`);
    return res.end();
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
