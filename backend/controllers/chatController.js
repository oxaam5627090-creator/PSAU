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

    const preferredLanguage = user.preferred_language || 'ar';
    const sanitizedAttachments = sanitizeAttachments(attachments);

    const systemPrompt = buildPrompt({
      userName: user.name,
      userCollege: user.college,
      userSchedule: user.schedule,
      userPersonalInfo: user.personal_info,
      preferredLanguage,
    });

    const userLabel = preferredLanguage === 'en' ? 'User' : 'المستخدم';
    const assistantLabel = preferredLanguage === 'en' ? 'Assistant' : 'المساعد';
    const attachmentPrompt = formatAttachmentsForPrompt(sanitizedAttachments, preferredLanguage);

    const promptSegments = [systemPrompt];
    if (attachmentPrompt) {
      promptSegments.push(
        preferredLanguage === 'en'
          ? `Student attachments:\n${attachmentPrompt}`
          : `مرفقات الطالب:\n${attachmentPrompt}`
      );
    }
    promptSegments.push(`${userLabel}: ${message}`);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const payload = {
      model: config.ollama.model,
      prompt: `${promptSegments.join('\n\n')}\n${assistantLabel}:`,
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
          { role: 'user', content: message, attachments: sanitizedAttachments },
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
    const { message, attachments } = req.body;
    const { userId } = req.user;

    const [[chat]] = await pool.query(
      'SELECT * FROM chats WHERE id = ? AND user_id = ?',
      [chatId, userId]
    );

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const history = parseChatMessages(chat.messages).map((entry) => ({
      ...entry,
      attachments: sanitizeAttachments(entry.attachments),
    }));

    const sanitizedAttachments = sanitizeAttachments(attachments);
    history.push({ role: 'user', content: message, attachments: sanitizedAttachments });

    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const systemPrompt = buildPrompt({
      userName: user.name,
      userCollege: user.college,
      userSchedule: user.schedule,
      userPersonalInfo: user.personal_info,
      preferredLanguage: user.preferred_language || 'ar',
    });

    history[0] = { role: 'system', content: systemPrompt };

    const preferredLanguage = user.preferred_language || 'ar';
    const assistantLabel = preferredLanguage === 'en' ? 'Assistant' : 'المساعد';

    const prompt = formatHistoryForPrompt(history, preferredLanguage);


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
        prompt: `${prompt}\n${assistantLabel}:`,
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

async function getChat(req, res) {
  try {
    const { chatId } = req.params;
    const { userId } = req.user;

    const [[chat]] = await pool.query(
      'SELECT * FROM chats WHERE id = ? AND user_id = ?',
      [chatId, userId]
    );

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    const messages = parseChatMessages(chat.messages).map((entry) => ({
      ...entry,
      attachments: sanitizeAttachments(entry.attachments),
    }));

    return res.json({
      id: chat.id,
      messages,
      summary: chat.summary,
      createdAt: chat.created_at,
    });
  } catch (error) {
    console.error('getChat error', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

function parseChatMessages(raw) {
  if (raw == null) {
    return [];
  }

  if (Array.isArray(raw)) {
    return raw.map((entry) => ({ ...entry }));
  }

  if (Buffer.isBuffer(raw)) {
    return parseChatMessages(raw.toString('utf8'));
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return [];
    }
    return safeJsonParse(trimmed);
  }

  if (typeof raw === 'object') {
    if (typeof raw.toJSON === 'function') {
      return parseChatMessages(raw.toJSON());
    }
    return safeJsonParse(JSON.stringify(raw));
  }

  throw new Error('Unsupported chat history format');
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid chat history JSON: ${error.message}`);
  }
}

function sanitizeAttachments(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const sanitized = {};

      if (Object.prototype.hasOwnProperty.call(item, 'id')) {
        sanitized.id = item.id;
      }

      const fileName = pickString(item.fileName || item.name);
      if (fileName) {
        sanitized.fileName = fileName;
      }

      const fileType = pickString(item.fileType || item.type);
      if (fileType) {
        sanitized.fileType = fileType;
      }

      const path = pickString(item.path || item.filePath);
      if (path) {
        sanitized.path = path;
      }

      const text = pickString(item.extractedText);
      if (text) {
        sanitized.extractedText = truncate(text, 4000);
      }

      return sanitized;
    })
    .filter((item) => Object.keys(item).length > 0);
}

function formatAttachmentsForPrompt(attachments, language = 'ar') {
  if (!attachments || attachments.length === 0) {
    return '';
  }

  const isEnglish = language === 'en';
  return attachments
    .map((attachment, index) => {
      const bullet = isEnglish ? '-' : '•';
      const defaultLabel = isEnglish ? `Attachment ${index + 1}` : `مرفق ${index + 1}`;
      const label = attachment.fileName || defaultLabel;
      const type = attachment.fileType ? ` (${attachment.fileType})` : '';
      const text = attachment.extractedText ? `:\n${attachment.extractedText}` : '';
      return `${bullet} ${label}${type}${text}`;
    })
    .join('\n');
}

function formatHistoryForPrompt(history, language = 'ar') {
  const isEnglish = language === 'en';

  return history
    .map((entry) => {
      const roleLabel =
        entry.role === 'system'
          ? isEnglish ? 'System' : 'النظام'
          : entry.role === 'assistant'
          ? isEnglish ? 'Assistant' : 'المساعد'
          : isEnglish
          ? 'User'
          : 'المستخدم';

      const content = typeof entry.content === 'string' ? entry.content : '';
      const attachmentsText = formatAttachmentsForPrompt(entry.attachments, language);

      if (attachmentsText) {
        const attachmentLabel = isEnglish ? 'Attachments' : 'المرفقات';
        return `${roleLabel}: ${content}\n${attachmentLabel}:\n${attachmentsText}`;
      }

      return `${roleLabel}: ${content}`;
    })
    .join('\n');
}

function truncate(text, maxLength) {
  if (typeof text !== 'string') {
    return '';
  }
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength)}…`;
}

function pickString(value) {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  return trimmed;
}

function updatePersonalInfo(personalInfo, history) {
  const existing = typeof personalInfo === 'string' && personalInfo.trim()
    ? safeParseObject(personalInfo)
    : typeof personalInfo === 'object' && personalInfo !== null
    ? personalInfo
    : {};

  const keywords = [/دكتور/u, /مستشار/u, /professor/i, /advisor/i];

  const newFacts = history
    .filter((entry) => entry.role === 'user')
    .map((entry) => (typeof entry.content === 'string' ? entry.content : ''))
    .filter((content) => keywords.some((regex) => regex.test(content)));

  if (newFacts.length > 0) {
    existing.facts = Array.from(new Set([...(existing.facts || []), ...newFacts])).slice(-5);
  }

  return JSON.stringify(existing);
}

function safeParseObject(text) {
  try {
    const value = JSON.parse(text);
    return value && typeof value === 'object' ? value : {};
  } catch (error) {
    return {};
  }
}

module.exports = { createChat, continueChat, getChat };

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
