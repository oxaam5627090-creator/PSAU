const { callOllama } = require('./ollamaClient');
const { config } = require('../config');

async function summarizeConversation(history) {
  const summaryPrompt = `لخّص المحادثة التالية في نقاط بسيطة باللغة العربية الفصحى مع التركيز على المعلومات المهمة عن الطالب.\n\n${history
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join('\n')}\n\nالخلاصة:`;

  try {
    const response = await callOllama({
      model: config.ollama.model,
      prompt: summaryPrompt,
      stream: false,
    });

    return response.message ?? response.response ?? '';
  } catch (error) {
    console.error('summarizeConversation error', error);
    return '';
  }
}

module.exports = { summarizeConversation };
