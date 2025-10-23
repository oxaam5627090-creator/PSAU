const { pool } = require('../db');
const { buildPrompt } = require('../utils/promptBuilder');
const { streamOllama } = require('../utils/ollamaClient');
const { summarizeConversation } = require('../utils/summarizer');
const { config } = require('../config');

async function createChat(req, res) {
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
    const { statusCode, clientMessage } = mapErrorToClientMessage(error);
    if (!res.headersSent) {
      return res.status(statusCode).json({ message: clientMessage });
    }
    res.write(`data: ${JSON.stringify({ error: clientMessage })}\n\n`);
    return res.end();
  }
}

async function continueChat(req, res) {
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
    const { statusCode, clientMessage } = mapErrorToClientMessage(error);
    if (!res.headersSent) {
      return res.status(statusCode).json({ message: clientMessage });
    }
    res.write(`data: ${JSON.stringify({ error: clientMessage })}\n\n`);
    return res.end();
  }
}

module.exports = { createChat, continueChat };

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

function mapErrorToClientMessage(error) {
  const fallback = {
    statusCode: 500,
    clientMessage: 'حدث خطأ داخلي في الخادم. الرجاء المحاولة لاحقًا.',
  };

  if (!error) {
    return fallback;
  }

  if (error.name === 'OllamaError') {
    const detail = error.details || 'تعذر الاتصال بنموذج Ollama. يرجى التحقق من إعداداته.';
    return {
      statusCode: 502,
      clientMessage: `مشكلة في الاتصال بنموذج Ollama: ${detail}`,
    };
  }

  if (typeof error.message === 'string' && error.message.trim()) {
    return {
      statusCode: 500,
      clientMessage: error.message,
    };
  }

  return fallback;
}
